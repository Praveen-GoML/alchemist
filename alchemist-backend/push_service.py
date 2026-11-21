"""Web Push delivery: shows a notification on the person's phone or computer even when the app is closed.

Environment (generate once with `python generate_vapid_keys.py`):
  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: address)
"""
import json
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Iterable, List

from pywebpush import WebPushException, webpush


def public_key() -> str:
    return (os.environ.get("VAPID_PUBLIC_KEY") or "").strip()


def is_configured() -> bool:
    return bool(public_key() and (os.environ.get("VAPID_PRIVATE_KEY") or "").strip())


def _send_one(sub, payload: str):
    """Returns (subscription_id, gone). `gone` is True when the push service says the subscription is dead."""
    try:
        webpush(
            subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
            data=payload,
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"].strip(),
            vapid_claims={"sub": os.environ.get("VAPID_SUBJECT") or "mailto:admin@example.com"},
            ttl=60 * 60 * 24,
            timeout=6,
        )
        return sub.id, False
    except WebPushException as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        return sub.id, status in (404, 410)
    except Exception:
        return sub.id, False


def send_to_subscriptions(subs: Iterable, title: str, body: str, link: str = "", notification_id: int = 0, image: str = "") -> List[int]:
    """Push to every subscription. Returns ids of subscriptions that no longer exist (caller deletes them)."""
    subs = list(subs)
    if not subs or not is_configured():
        return []
    payload = json.dumps({"title": title, "body": body, "link": link, "id": notification_id, "tag": f"alchemist-{notification_id}", "image": image})
    with ThreadPoolExecutor(max_workers=min(8, len(subs))) as pool:
        results = list(pool.map(lambda s: _send_one(s, payload), subs))
    return [sid for sid, gone in results if gone]


def card_url(base_url: str, kind: str, title: str, body: str) -> str:
    """Address of the banner image for a notification (served by GET /push/card.png)."""
    from urllib.parse import urlencode
    if not base_url:
        return ""
    return f"{base_url.rstrip('/')}/push/card.png?" + urlencode({"kind": kind, "title": title[:120], "body": body[:200]})
