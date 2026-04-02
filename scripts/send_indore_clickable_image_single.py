#!/usr/bin/env python3
"""Send one email with a clickable inline image to selected recipients."""

import os
import smtplib
import sys
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from dotenv import load_dotenv


TARGET_EMAILS = ["raghavsobti37@gmail.com", "dmehta.work@gmail.com"]
SUBJECT = "Havells mYOUsic is coming to Indore!"
CLICK_URL = "https://havellsmyousic.com/participate"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
IMAGE_PATH = PROJECT_ROOT / "assets" / "rise-emailer" / "images" / "emailer indore.png"


def build_html_body() -> str:
    """Build a simple HTML email with a clickable inline image."""
    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f6fa;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:0;">
                <a href="{CLICK_URL}" style="display:block;line-height:0;text-decoration:none;">
                  <img src="cid:indore_image" alt="Participate Now" style="display:block;width:100%;height:auto;border:0;" />
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def build_message(sender_email: str) -> MIMEMultipart:
    """Create MIME message with plain text fallback, HTML, and inline image."""
    if not IMAGE_PATH.exists():
        raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")

    message = MIMEMultipart("related")
    message["From"] = sender_email
    message["To"] = ", ".join(TARGET_EMAILS)
    message["Subject"] = SUBJECT

    alternative = MIMEMultipart("alternative")
    message.attach(alternative)

    text_body = (
        "Please participate here: "
        f"{CLICK_URL}\n\n"
        "If the image does not load, copy and open the link above."
    )
    alternative.attach(MIMEText(text_body, "plain", "utf-8"))
    alternative.attach(MIMEText(build_html_body(), "html", "utf-8"))

    with IMAGE_PATH.open("rb") as image_file:
        image_part = MIMEImage(image_file.read(), name=IMAGE_PATH.name)
        image_part.add_header("Content-ID", "<indore_image>")
        image_part.add_header("Content-Disposition", "inline", filename=IMAGE_PATH.name)
        message.attach(image_part)

    return message


def send_single_email() -> None:
    """Send the one-off email to the configured recipients."""
    load_dotenv(PROJECT_ROOT / ".env")
    sender_email = os.getenv("EMAIL_ADDRESS", "").strip()
    sender_password = os.getenv("EMAIL_PASSWORD", "").strip()

    if not sender_email or not sender_password:
        raise RuntimeError("EMAIL_ADDRESS or EMAIL_PASSWORD is missing in .env")

    msg = build_message(sender_email)

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login(sender_email, sender_password)
        smtp.sendmail(sender_email, TARGET_EMAILS, msg.as_string())


if __name__ == "__main__":
    try:
        send_single_email()
        print(f"Email sent to: {', '.join(TARGET_EMAILS)}")
    except Exception as exc:
        print(f"Failed to send email: {exc}")
        sys.exit(1)
