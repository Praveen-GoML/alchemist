"""Encrypted storage for client-shared credentials.

Secrets submitted through the client portal are encrypted at rest (Fernet / AES-128-CBC + HMAC)
and are never returned by normal API responses; only a masked hint is shown.

Key source, in order:
  1. CREDENTIAL_ENCRYPTION_KEY env var (required in production / Vercel)
  2. a local .credential_key file, auto-created for local development only
Generate a key with:
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

PREFIX = "enc:v1:"
MULTI_TAG = "\u0001multi:"
_KEY_FILE = Path(__file__).resolve().parent / ".credential_key"
_fernet = None


class VaultNotConfigured(RuntimeError):
    pass


def _get_fernet():
    global _fernet
    if _fernet is not None:
        return _fernet
    try:
        from cryptography.fernet import Fernet
    except ImportError as exc:  # pragma: no cover
        raise VaultNotConfigured("The 'cryptography' package is not installed on the server.") from exc

    key = (os.environ.get("CREDENTIAL_ENCRYPTION_KEY") or "").strip()
    if not key:
        try:
            if _KEY_FILE.exists():
                key = _KEY_FILE.read_text().strip()
            else:
                key = Fernet.generate_key().decode()
                _KEY_FILE.write_text(key)
                logger.warning("Created local credential key file %s (dev only; set CREDENTIAL_ENCRYPTION_KEY in production).", _KEY_FILE)
        except OSError as exc:
            raise VaultNotConfigured(
                "Credential vault is not configured: set CREDENTIAL_ENCRYPTION_KEY on the server."
            ) from exc
    try:
        _fernet = Fernet(key.encode())
    except Exception as exc:
        raise VaultNotConfigured("CREDENTIAL_ENCRYPTION_KEY is not a valid Fernet key.") from exc
    return _fernet


def is_encrypted(value: str | None) -> bool:
    return bool(value) and str(value).startswith(PREFIX)


def encrypt(value: str | None) -> str | None:
    """Encrypt a secret for storage. Already-encrypted values pass through unchanged."""
    if value is None:
        return None
    value = str(value).strip()
    if not value or is_encrypted(value):
        return value or None
    return PREFIX + _get_fernet().encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    """Return the plaintext secret (legacy plaintext rows are returned as stored)."""
    if not value:
        return None
    if not is_encrypted(value):
        return value
    from cryptography.fernet import InvalidToken
    try:
        return _get_fernet().decrypt(value[len(PREFIX):].encode()).decode()
    except InvalidToken:
        logger.error("Could not decrypt a stored credential (wrong key?).")
        return None


def pack_credentials(existing: str | None, new_items: list[dict], existing_name: str | None = None) -> tuple[str, str]:
    """Merge newly shared credentials (by name) into the stored set.

    Returns (encrypted_blob, display_names). A single credential is stored as a plain
    encrypted secret (backwards compatible); several are stored as one encrypted JSON blob.
    """
    import json
    merged: dict[str, str] = {}
    current = decrypt(existing)
    if current:
        if current.startswith(MULTI_TAG):
            try:
                for it in json.loads(current[len(MULTI_TAG):]):
                    merged[it["name"]] = it["value"]
            except Exception:
                pass
        else:
            merged[(existing_name or "Credential").strip() or "Credential"] = current
    for it in new_items:
        name = (it.get("name") or "").strip() or "Credential"
        value = (it.get("value") or "").strip()
        if value:
            merged[name] = value
    names = ", ".join(merged.keys())
    if len(merged) == 1:
        return encrypt(next(iter(merged.values()))), names
    blob = MULTI_TAG + json.dumps([{"name": k, "value": v} for k, v in merged.items()])
    return encrypt(blob), names


def unpack_credentials(value: str | None, fallback_name: str | None = None) -> list[dict]:
    import json
    plain = decrypt(value)
    if not plain:
        return []
    if plain.startswith(MULTI_TAG):
        try:
            return json.loads(plain[len(MULTI_TAG):])
        except Exception:
            return []
    return [{"name": fallback_name or "Credential", "value": plain}]


def mask(value: str | None) -> str | None:
    """Masked hint for display: bullets plus last 4 characters only."""
    plain = decrypt(value)
    if not plain:
        return "••••••••" if value else None
    if plain.startswith(MULTI_TAG):
        return f"{len(unpack_credentials(value))} credentials on file"
    return "••••••••" + plain[-4:] if len(plain) > 12 else "••••••••"
