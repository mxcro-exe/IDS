"""
Notification Dispatcher Module.
Dispatches critical security alerts to Telegram channels and Email via SMTP.
Gracefully deactivates when credentials are not configured in environment.
"""
import smtplib
import urllib.request
import urllib.parse
import json
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any

from config import (
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    ALERT_EMAIL_RECIPIENT,
)


def dispatch_security_notification(alert_info: Dict[str, Any]):
    """Dispatches notifications asynchronously in a background thread."""
    thread = threading.Thread(target=_send_worker, args=(alert_info,), daemon=True)
    thread.start()


def _send_worker(alert_info: Dict[str, Any]):
    # 1. Telegram Dispatch
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        try:
            tg_text = (
                f"🚨 *AI GATEWAY IDS: SECURITY ALERT*\n\n"
                f"*Action:* `{alert_info.get('action', 'BLOCK')}`\n"
                f"*Attack Type:* `{alert_info.get('attack_type', 'Unknown')}`\n"
                f"*Risk Score:* `{alert_info.get('risk_score', 1.0):.2f}`\n"
                f"*Client IP:* `{alert_info.get('client_ip', '0.0.0.0')}`\n"
                f"*MITRE ID:* `{alert_info.get('mitre_id', 'T1190')}`\n"
                f"*Reason:* {alert_info.get('reason', 'Threat detected')}\n"
            )
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            data = urllib.parse.urlencode({
                "chat_id": TELEGRAM_CHAT_ID,
                "text": tg_text,
                "parse_mode": "Markdown",
            }).encode("utf-8")
            req = urllib.request.Request(url, data=data)
            urllib.request.urlopen(req, timeout=5)
        except Exception as e:
            print(f"[!] Telegram notification failed: {e}")

    # 2. SMTP Email Dispatch
    if SMTP_HOST and SMTP_USER and ALERT_EMAIL_RECIPIENT:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_USER
            msg["To"] = ALERT_EMAIL_RECIPIENT
            msg["Subject"] = f"🚨 AI Gateway IDS Alert: [{alert_info.get('attack_type')}] Blocked"

            body = (
                f"Security Incident Alert\n\n"
                f"Attack Type: {alert_info.get('attack_type')}\n"
                f"Action: {alert_info.get('action')}\n"
                f"Client IP: {alert_info.get('client_ip')}\n"
                f"Risk Score: {alert_info.get('risk_score')}\n"
                f"MITRE ATT&CK: {alert_info.get('mitre_id')}\n"
                f"Rationale: {alert_info.get('reason')}\n"
            )
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=5) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        except Exception as e:
            print(f"[!] Email notification failed: {e}")
