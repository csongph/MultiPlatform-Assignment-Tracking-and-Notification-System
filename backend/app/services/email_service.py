"""Gmail API sender for notification delivery.

The service uses a dedicated KMAPS sender account authorized once with the
least-privilege ``gmail.send`` scope.  Student Classroom OAuth tokens are
never used to send email.
"""

import base64
from email.message import EmailMessage
from html import escape

import httpx

from app.core.config import settings


GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


class EmailDeliveryError(RuntimeError):
    """Raised when the configured email provider cannot deliver a message."""


def gmail_api_is_configured() -> bool:
    return bool(
        settings.GMAIL_SENDER_CLIENT_ID
        and settings.GMAIL_SENDER_CLIENT_SECRET
        and settings.GMAIL_SENDER_REFRESH_TOKEN
        and settings.GMAIL_SENDER_FROM_EMAIL
    )


async def _get_sender_access_token() -> str:
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                GMAIL_TOKEN_URL,
                data={
                    "client_id": settings.GMAIL_SENDER_CLIENT_ID,
                    "client_secret": settings.GMAIL_SENDER_CLIENT_SECRET,
                    "refresh_token": settings.GMAIL_SENDER_REFRESH_TOKEN,
                    "grant_type": "refresh_token",
                },
            )
    except httpx.HTTPError as exc:
        raise EmailDeliveryError("Google OAuth token refresh request failed") from exc
    if response.status_code != 200:
        raise EmailDeliveryError("Google OAuth token refresh failed")
    token = response.json().get("access_token")
    if not token:
        raise EmailDeliveryError("Google OAuth response did not contain an access token")
    return token


async def send_due_soon_email(
    *, recipient: str, assignment_title: str, course_name: str, due_at: str, lead_time_minutes: int
) -> None:
    """Send one due-soon message through the Gmail REST API."""
    if not gmail_api_is_configured():
        raise EmailDeliveryError("Gmail API sender is not configured")

    subject = f"KMAPS reminder: {assignment_title}"
    plain = (
        f"Assignment: {assignment_title}\n"
        f"Course: {course_name}\n"
        f"Due: {due_at}\n\n"
        f"This is a reminder scheduled {lead_time_minutes} minutes before the due date."
    )
    html = (
        "<h2>KMAPS assignment reminder</h2>"
        f"<p><strong>Assignment:</strong> {escape(assignment_title)}</p>"
        f"<p><strong>Course:</strong> {escape(course_name)}</p>"
        f"<p><strong>Due:</strong> {escape(due_at)}</p>"
        f"<p>This reminder is scheduled {lead_time_minutes} minutes before the due date.</p>"
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.GMAIL_SENDER_FROM_NAME} <{settings.GMAIL_SENDER_FROM_EMAIL}>"
    message["To"] = recipient
    message.set_content(plain)
    message.add_alternative(html, subtype="html")

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("ascii").rstrip("=")
    access_token = await _get_sender_access_token()
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                GMAIL_SEND_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                json={"raw": raw_message},
            )
    except httpx.HTTPError as exc:
        raise EmailDeliveryError("Gmail API request failed") from exc
    if response.status_code not in (200, 201):
        raise EmailDeliveryError("Gmail API delivery failed")
