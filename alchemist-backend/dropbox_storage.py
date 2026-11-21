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
        res = _post(
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


def _post(*args, **kwargs):
    """requests.post with one retry; network failures become a DropboxError (a readable 502, not a bare 500)."""
    last = None
    for _ in range(2):
        try:
            return requests.post(*args, **kwargs)
        except requests.RequestException as e:
            last = e
    raise DropboxError(
        "Dropbox closed the connection during the upload. If this keeps happening, the Dropbox app is probably missing "
        "the files.content.write permission (Dropbox App Console > Permissions), and a new refresh token is needed after changing it."
    ) from last


def _safe(part: str) -> str:
    return re.sub(r"[^A-Za-z0-9._ -]", "_", part).strip(" .") or "file"


def upload(project: str, filename: str, data: bytes) -> dict:
    """Upload bytes to Dropbox and return {path, url}. `url` opens the file in Dropbox."""
    token = _access_token()
    folder = (os.environ.get("DROPBOX_FOLDER") or "/Alchemist").rstrip("/")
    path = f"{folder}/{_safe(project)}/{int(time.time())}_{_safe(filename)}"

    res = _post(
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
        if "not permitted" in res.text or "missing_scope" in res.text:
            raise DropboxError("The Dropbox app does not have permission to upload. Enable files.content.write and sharing.write in the Dropbox App Console, then create a new refresh token.")
        raise DropboxError(f"Dropbox upload failed ({res.status_code}).")
    stored_path = res.json().get("path_display", path)

    # No shared link is created: files stay private in Dropbox and are read through the backend (see /files/content)
    return {"path": stored_path, "url": ""}


_DOWNLOAD_URL = "https://content.dropboxapi.com/2/files/download"


def folder_root() -> str:
    return (os.environ.get("DROPBOX_FOLDER") or "/Alchemist").rstrip("/")


def download(path: str) -> bytes:
    """Fetch a previously uploaded file's bytes. Only paths inside the app folder are allowed."""
    root = folder_root().lower()
    if ".." in path or not path.lower().startswith(root + "/"):
        raise DropboxError("That file is not in the documents folder.")
    token = _access_token()
    res = _post(
        _DOWNLOAD_URL,
        headers={"Authorization": f"Bearer {token}", "Dropbox-API-Arg": json.dumps({"path": path})},
        timeout=60,
    )
    if res.status_code == 409:
        raise DropboxError("This file no longer exists in Dropbox.")
    if res.status_code != 200:
        raise DropboxError(f"Dropbox download failed ({res.status_code}).")
    return res.content
