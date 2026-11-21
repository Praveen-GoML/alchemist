"""One-time helper: get a Dropbox refresh token for the backend.

1. Create an app at https://www.dropbox.com/developers/apps
   - Scoped access, "Full Dropbox" or "App folder" (App folder is safer)
   - Permissions tab: tick files.content.write, files.content.read, sharing.write, then Submit
2. Copy the App key and App secret from the Settings tab
3. Run:  python dropbox_setup.py
4. Put the three values it prints into alchemist-backend/.env (never commit them).
"""
import getpass
import sys

import requests

app_key = input("Dropbox App key: ").strip()
app_secret = getpass.getpass("Dropbox App secret (hidden): ").strip()
if not app_key or not app_secret:
    sys.exit("App key and secret are required.")

print("\nOpen this URL, click Allow, and copy the code Dropbox shows:\n")
SCOPES = "files.content.write files.content.read sharing.write sharing.read"
print(f"https://www.dropbox.com/oauth2/authorize?client_id={app_key}&response_type=code&token_access_type=offline&scope={SCOPES.replace(' ', '%20')}\n")
code = input("Paste the code: ").strip()

res = requests.post(
    "https://api.dropboxapi.com/oauth2/token",
    data={"code": code, "grant_type": "authorization_code"},
    auth=(app_key, app_secret),
    timeout=20,
)
if res.status_code != 200:
    sys.exit(f"Dropbox rejected the code ({res.status_code}): {res.text}")

refresh = res.json().get("refresh_token")
if not refresh:
    sys.exit("No refresh token returned. Make sure the URL used token_access_type=offline.")

print("\nScopes granted to this token:", res.json().get("scope"))
print("\nAdd these to alchemist-backend/.env:\n")
print(f"DROPBOX_APP_KEY={app_key}")
print(f"DROPBOX_APP_SECRET={app_secret}")
print(f"DROPBOX_REFRESH_TOKEN={refresh}")
print("DROPBOX_FOLDER=/Alchemist   # optional")
