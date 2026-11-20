"""Generate the VAPID key pair used to send Web Push notifications.

Run once:   python generate_vapid_keys.py
Then put the three printed lines in alchemist-backend/.env (and in the Vercel project's environment variables).
Keep VAPID_PRIVATE_KEY secret. Changing the keys later makes every existing device subscription invalid.
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


key = ec.generate_private_key(ec.SECP256R1())
private_raw = key.private_numbers().private_value.to_bytes(32, "big")
public_raw = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)

print(f"VAPID_PUBLIC_KEY={b64(public_raw)}")
print(f"VAPID_PRIVATE_KEY={b64(private_raw)}")
print("VAPID_SUBJECT=mailto:admin@your-company.com   # change to a real contact address")
