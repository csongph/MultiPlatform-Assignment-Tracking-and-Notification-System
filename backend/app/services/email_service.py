"""Email delivery through the configured authenticated SMTP account."""

import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage
from html import escape

from app.core.config import settings


logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    """Raised when the configured email provider cannot deliver a message."""


def password_recovery_email_is_configured() -> bool:
    return smtp_is_configured()


def smtp_is_configured() -> bool:
    return bool(
        settings.SMTP_HOST
        and settings.SMTP_PORT
        and settings.SMTP_USERNAME
        and settings.SMTP_PASSWORD
        and settings.SMTP_FROM_EMAIL
    )


def _send_smtp_message(message: EmailMessage) -> None:
    """Blocking SMTP I/O, run in a worker thread so it cannot block the event loop."""
    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as client:
        client.ehlo()
        if settings.SMTP_USE_TLS:
            client.starttls(context=context)
            client.ehlo()
        client.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        client.send_message(message)


async def _send_email(*, recipient: str, subject: str, plain: str, html: str) -> None:
    if not smtp_is_configured():
        raise EmailDeliveryError("SMTP email delivery is not configured")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = recipient
    message.set_content(plain)
    message.add_alternative(html, subtype="html")
    try:
        await asyncio.to_thread(_send_smtp_message, message)
    except (OSError, smtplib.SMTPException) as exc:
        # Never log SMTP credentials or server response bodies.
        logger.error("SMTP email delivery failed (%s)", exc.__class__.__name__)
        raise EmailDeliveryError("SMTP email delivery failed; check SMTP settings and App Password") from exc


async def send_due_soon_email(
    *, recipient: str, assignment_title: str, course_name: str, due_at: str, lead_time_minutes: int
) -> None:
    """Send one due-soon message through the configured SMTP account."""

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

    await _send_email(recipient=recipient, subject=subject, plain=plain, html=html)


async def _send_password_recovery_email(*, recipient: str, subject: str, html: str, plain: str) -> None:
    await _send_email(recipient=recipient, subject=subject, plain=plain, html=html)


async def send_password_recovery_code(*, recipient: str, code: str, expires_in_minutes: int) -> None:
    """Deliver a copyable, plain-text and HTML password recovery code."""
    safe_code = escape(code)
    plain = (
        f"รหัส OTP สำหรับรีเซ็ตรหัสผ่าน KMAPS ของคุณคือ {code}\n\n"
        f"กรอกรหัสนี้ใน KMAPS ภายใน {expires_in_minutes} นาที และใช้ได้ครั้งเดียว\n"
        "หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องดำเนินการใด รหัสผ่านของคุณจะไม่ถูกเปลี่ยน"
    )
    html = (
        '<!doctype html><html lang="th"><body style="margin:0;padding:24px;background:#f1f5f9;'
        'font-family:Tahoma,Arial,sans-serif;color:#0f172a">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">'
        '<table role="presentation" width="520" cellspacing="0" cellpadding="0" '
        'style="width:100%;max-width:520px;background:#fff;border-radius:16px;overflow:hidden">'
        '<tr><td style="height:6px;background:#4f46e5"></td></tr>'
        '<tr><td align="center" style="padding:28px 28px 8px;color:#4f46e5;'
        'font-size:20px;font-weight:bold">KMAPS</td></tr>'
        '<tr><td align="center" style="padding:8px 28px 24px">'
        '<div style="font-size:23px;font-weight:bold">ยืนยันตัวตนของคุณ</div>'
        '<p style="font-size:15px;line-height:1.7;color:#475569">เราได้รับคำขอรีเซ็ตรหัสผ่านบัญชี KMAPS</p>'
        '<div style="background:#eef2ff;border:2px dashed #a5b4fc;border-radius:14px;padding:20px 12px">'
        '<div style="font-size:13px;color:#4f46e5;padding-bottom:8px">รหัส OTP 6 หลักของคุณ</div>'
        f'<div style="font-family:Consolas,monospace;font-size:38px;font-weight:bold;'
        f'letter-spacing:10px;color:#3730a3">{safe_code}</div>'
        '</div>'
        f'<p style="margin:18px 0;background:#fef3c7;border-radius:999px;'
        f'padding:8px;color:#92400e">หมดอายุใน {expires_in_minutes} นาที · ใช้ได้ครั้งเดียว</p>'
        '<p style="text-align:left;background:#f8fafc;border-left:4px solid #f43f5e;'
        'border-radius:8px;padding:14px;color:#475569;font-size:13px;line-height:1.7">'
        '<b style="color:#be123c">เพื่อความปลอดภัย</b><br>อย่าบอกรหัสนี้แก่ใคร ทีมงานจะไม่ขอรหัส OTP จากคุณ<br>'
        'หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องทำอะไร รหัสผ่านของคุณจะไม่ถูกเปลี่ยน</p>'
        '</td></tr><tr><td align="center" style="padding:16px;color:#94a3b8;'
        'font-size:12px">อีเมลอัตโนมัติจาก KMAPS กรุณาอย่าตอบกลับ</td></tr>'
        '</table></td></tr></table></body></html>'
    )
    await _send_password_recovery_email(
        recipient=recipient,
        subject="รหัส OTP สำหรับรีเซ็ตรหัสผ่าน KMAPS",
        html=html,
        plain=plain,
    )


async def send_password_changed_notice(*, recipient: str) -> None:
    """Notify the account owner after a password was successfully changed."""
    plain = (
        "รหัสผ่านบัญชี KMAPS ของคุณถูกเปลี่ยนแล้ว\n\n"
        "หากคุณเป็นผู้เปลี่ยน สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที\n"
        "หากไม่ใช่คุณ โปรดติดต่อผู้ดูแลระบบของสถาบัน"
    )
    html = (
        '<!doctype html><html lang="th"><body style="margin:0;padding:24px;background:#f1f5f9;'
        'font-family:Tahoma,Arial,sans-serif;color:#0f172a">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">'
        '<table role="presentation" width="520" cellspacing="0" cellpadding="0" '
        'style="width:100%;max-width:520px;background:#fff;border-radius:16px;overflow:hidden">'
        '<tr><td style="height:6px;background:#4f46e5"></td></tr>'
        '<tr><td align="center" style="padding:28px 28px 8px;color:#4f46e5;'
        'font-size:20px;font-weight:bold">KMAPS</td></tr>'
        '<tr><td align="center" style="padding:8px 28px 16px"><span '
        'style="background:#eef2ff;border-radius:999px;padding:7px 14px;'
        'color:#3730a3;font-weight:bold">เปลี่ยนรหัสผ่านสำเร็จ</span>'
        '<h1 style="font-size:23px;margin:22px 0 12px">รหัสผ่านของคุณถูกเปลี่ยนแล้ว</h1></td></tr>'
        '<tr><td style="padding:0 32px 28px;font-size:15px;line-height:1.8;color:#334155">'
        '<p>หากคุณเป็นผู้เปลี่ยนเอง ไม่ต้องดำเนินการใดเพิ่มเติม และสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</p>'
        '<p style="background:#fff1f2;border-left:4px solid #f43f5e;'
        'border-radius:8px;padding:14px;color:#475569">'
        '<b style="color:#be123c">ไม่ใช่คุณใช่ไหม?</b><br>'
        'บัญชีของคุณอาจถูกผู้อื่นเข้าถึง โปรดติดต่อผู้ดูแลระบบของสถาบันทันที</p>'
        '</td></tr><tr><td align="center" style="padding:16px;color:#94a3b8;'
        'font-size:12px">อีเมลอัตโนมัติจาก KMAPS กรุณาอย่าตอบกลับ</td></tr>'
        '</table></td></tr></table></body></html>'
    )
    await _send_password_recovery_email(
        recipient=recipient,
        subject="รหัสผ่าน KMAPS ของคุณถูกเปลี่ยนแล้ว",
        html=html,
        plain=plain,
    )
