"""One-time OAuth helper for the dedicated KMAPS Gmail sender account.

Usage from the backend directory:
  python -m scripts.gmail_sender_oauth authorize
  python -m scripts.gmail_sender_oauth exchange "<code-from-callback-url>"

Before using it, add GMAIL_SENDER_REDIRECT_URI (default http://localhost:8085)
to the authorized redirect URIs of this OAuth client in Google Cloud Console.
"""

import argparse
from urllib.parse import urlencode

import httpx

from app.core.config import settings

AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"


def _ensure_client_configured() -> None:
    if not settings.GMAIL_SENDER_CLIENT_ID or not settings.GMAIL_SENDER_CLIENT_SECRET:
        raise SystemExit(
            "Set GMAIL_SENDER_CLIENT_ID and GMAIL_SENDER_CLIENT_SECRET in backend/.env first."
        )


def print_authorization_url() -> None:
    _ensure_client_configured()
    params = {
        "client_id": settings.GMAIL_SENDER_CLIENT_ID,
        "redirect_uri": settings.GMAIL_SENDER_REDIRECT_URI,
        "response_type": "code",
        "scope": GMAIL_SEND_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    }
    print(f"{AUTHORIZATION_URL}?{urlencode(params)}")


def exchange_code(code: str) -> None:
    _ensure_client_configured()
    response = httpx.post(
        TOKEN_URL,
        data={
            "client_id": settings.GMAIL_SENDER_CLIENT_ID,
            "client_secret": settings.GMAIL_SENDER_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GMAIL_SENDER_REDIRECT_URI,
        },
        timeout=20,
    )
    if response.status_code != 200:
        raise SystemExit(f"Token exchange failed: {response.status_code} {response.text}")
    refresh_token = response.json().get("refresh_token")
    if not refresh_token:
        raise SystemExit("Google did not return a refresh token. Re-run authorize, then approve consent again.")
    print("Store this only as GMAIL_SENDER_REFRESH_TOKEN in a local .env or deployment secret:")
    print(refresh_token)


def main() -> None:
    parser = argparse.ArgumentParser(description="Authorize the KMAPS Gmail sender account")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("authorize", help="Print the Google OAuth authorization URL")
    exchange = subparsers.add_parser("exchange", help="Exchange the callback code for a refresh token")
    exchange.add_argument("code")
    args = parser.parse_args()

    if args.command == "authorize":
        print_authorization_url()
    else:
        exchange_code(args.code)


if __name__ == "__main__":
    main()
