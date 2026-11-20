"""Dropbox storage for project documents.

Credentials live only in the backend environment (never in the browser):
  DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN
  DROPBOX_FOLDER (optional, default "/Alchemist")

Uses a long-lived refresh token to mint short-lived access tokens, so nothing expires.
Run `python dropbox_setup.py` once to get the refresh token.
"""
import json
import os
import re
import threading
import time

import requests

_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token"
_UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload"
_SHARE_URL = "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings"
_LIST_SHARE_URL = "https://api.dropboxapi.com/2/sharing/list_shared_links"

_lock = threading.Lock()
_cache = {"token": None, "expires_at": 0.0}


class DropboxError(Exception):
    pass


def is_configured() -> bool:
    return all(os.environ.get(k) for k in ("DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN"))


def _access_token() -> str:
    with _lock:
        if _cache["token"] and time.time() < _cache["expires_at"] - 60:
            return _cache["token"]
        res = requests.post(
            _TOKEN_URL,
            data={"grant_type": "refresh_token", "refresh_token": os.environ["DROPBOX_REFRESH_TOKEN"]},
            auth=(os.environ["DROPBOX_APP_KEY"], os.environ["DROPBOX_APP_SECRET"]),
            timeout=20,
        )
        if res.status_code != 200:
            raise DropboxError(f"Dropbox auth failed ({res.status_code}). Check the DROPBOX_* settings.")
        body = res.json()
        _cache["token"] = body["access_token"]
        _cache["expires_at"] = time.time() + int(body.get("expires_in", 14400))
        return _cache["token"]


def _safe(part: str) -> str:
    return re.sub(r"[^A-Za-z0-9._ -]", "_", part).strip(" .") or "file"


def upload(project: str, filename: str, data: bytes) -> dict:
    """Upload bytes to Dropbox and return {path, url}. `url` opens the file in Dropbox."""
    token = _access_token()
    folder = (os.environ.get("DROPBOX_FOLDER") or "/Alchemist").rstrip("/")
    path = f"{folder}/{_safe(project)}/{int(time.time())}_{_safe(filename)}"

    res = requests.post(
        _UPLOAD_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Dropbox-API-Arg": json.dumps({"path": path, "mode": "add", "autorename": True, "mute": True}),
            "Content-Type": "application/octet-stream",
        },
        data=data,
        timeout=120,
    )
    if res.status_code != 200:
        raise DropboxError(f"Dropbox upload failed ({res.status_code}).")
    stored_path = res.json().get("path_display", path)

    # Shared link so the whole team can open it in one click
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    link = requests.post(_SHARE_URL, headers=headers, json={"path": stored_path}, timeout=20)
    if link.status_code == 200:
        url = link.json()["url"]
    elif link.status_code == 409:  # link already exists
        existing = requests.post(_LIST_SHARE_URL, headers=headers, json={"path": stored_path, "direct_only": True}, timeout=20)
        links = existing.json().get("links", []) if existing.status_code == 200 else []
        if not links:
            raise DropboxError("Uploaded, but could not create a share link.")
        url = links[0]["url"]
    else:
        raise DropboxError(f"Uploaded, but sharing failed ({link.status_code}).")

    return {"path": stored_path, "url": url}
