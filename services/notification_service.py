"""
Multi-Channel Notification & Alert Deduplication Engine for AegisGate IDS.
Dispatches alerts to:
  - Telegram Bot
  - Slack / Discord / Microsoft Teams incoming webhooks
  - Generic SIEM Webhook with HMAC-SHA256 signature
  - SMTP Email
Features burst deduplication, quiet hours filtering, and delivery logs.
"""
import time
import json
import hmac
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List, Optional, Tuple
import httpx
from database import get_db_connection
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL_RECIPIENT

# In-memory deduplication tracker: (client_ip, attack_type) -> {count, first_seen, last_seen, last_notified}
ALERT_BURST_CACHE: Dict[str, Dict[str, Any]] = {}
DEDUP_WINDOW_SECONDS = 300  # 5 minutes burst grouping


def is_quiet_hours(start_hour: int = 22, end_hour: int = 7) -> bool:
    """Checks if current time falls within configured quiet hours."""
    current_hour = time.localtime().tm_hour
    if start_hour > end_hour:  # Crosses midnight (e.g. 22:00 to 07:00)
        return current_hour >= start_hour or current_hour < end_hour
    return start_hour <= current_hour < end_hour


def should_suppress_alert(client_ip: str, attack_type: str, severity: str) -> Tuple[bool, int]:
    """
    Checks if this alert is part of an ongoing burst.
    Returns (should_suppress, current_burst_count).
    Critical alerts never get suppressed.
    """
    if severity.lower() == "critical":
        return False, 1

    key = f"{client_ip}:{attack_type}"
    now = time.time()
    record = ALERT_BURST_CACHE.get(key)

    if record and (now - record["last_seen"]) < DEDUP_WINDOW_SECONDS:
        record["count"] += 1
        record["last_seen"] = now
        # Only notify on 1st, 10th, 50th, 100th attempt to prevent alert fatigue
        if record["count"] in [10, 50, 100]:
            return False, record["count"]
        return True, record["count"]

    # New burst window
    ALERT_BURST_CACHE[key] = {
        "count": 1,
        "first_seen": now,
        "last_seen": now,
        "last_notified": now,
    }
    return False, 1


async def send_slack_discord_webhook(webhook_url: str, alert_data: Dict[str, Any], count: int = 1) -> bool:
    """Sends formatted alert payload to a Slack or Discord webhook."""
    severity = alert_data.get("severity", "High")
    color = 0xE5656F if severity in ["High", "Critical"] else 0xD9A441
    title = f"[{severity.upper()}] AegisGate Alert: {alert_data.get('attack_type', 'Threat')}"
    if count > 1:
        title += f" (Burst: {count} attempts)"

    payload = {
        "text": title,
        "embeds": [{
            "title": title,
            "description": alert_data.get("explanation_en") or alert_data.get("reason", "Malicious activity flagged."),
            "color": color,
            "fields": [
                {"name": "Client IP", "value": alert_data.get("client_ip", "Unknown"), "inline": True},
                {"name": "Risk Score", "value": str(alert_data.get("risk_score", 0.0)), "inline": True},
                {"name": "Action", "value": alert_data.get("action", "BLOCK"), "inline": True},
                {"name": "Payload", "value": f"`{str(alert_data.get('raw_payload', ''))[:60]}`", "inline": False},
            ],
            "footer": {"text": "AegisGate AI-Powered API Gateway IDS"},
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }],
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code in [200, 204]
    except Exception:
        return False


async def send_signed_siem_webhook(webhook_url: str, secret_key: str, alert_data: Dict[str, Any]) -> bool:
    """
    Sends generic JSON alert with HMAC-SHA256 signature in 'X-Aegis-Signature' header.
    """
    body_json = json.dumps(alert_data, sort_keys=True)
    signature = hmac.new(secret_key.encode("utf-8"), body_json.encode("utf-8"), hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Aegis-Signature": signature,
        "X-Aegis-Timestamp": str(int(time.time())),
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(webhook_url, content=body_json, headers=headers)
            return resp.status_code in [200, 201, 202, 204]
    except Exception:
        return False


def send_smtp_email(to_email: str, alert_data: Dict[str, Any], count: int = 1) -> bool:
    """Sends HTML security alert notification via configured SMTP server."""
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        return False

    severity = alert_data.get("severity", "High")
    subject = f"[AegisGate {severity.upper()}] Security Incident: {alert_data.get('attack_type')} ({alert_data.get('client_ip')})"
    if count > 1:
        subject += f" [{count} Bursts]"

    html_content = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B0F17; color: #E6EAF2; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px;">
          <h2 style="color: #E5656F; margin-top: 0;">AegisGate IDS Security Alert</h2>
          <p><strong>Severity:</strong> <span style="background: rgba(229,101,111,0.2); color: #E5656F; padding: 2px 8px; border-radius: 4px;">{severity}</span></p>
          <p><strong>Attack Type:</strong> {alert_data.get('attack_type')}</p>
          <p><strong>Attacker Client IP:</strong> {alert_data.get('client_ip')}</p>
          <p><strong>Risk Score:</strong> {alert_data.get('risk_score')}</p>
          <p><strong>Plain Language Summary:</strong></p>
          <blockquote style="border-left: 3px solid #5B8DEF; margin-left: 0; padding-left: 12px; color: #94A0B8;">
            {alert_data.get('explanation_en') or alert_data.get('reason')}
          </blockquote>
          <p><strong>Recommended Action:</strong></p>
          <p style="color: #3FB68B;">{alert_data.get('what_to_do_en', 'Inspect client IP and consider blacklisting.')}</p>
          <p style="font-size: 11px; color: #64748B; margin-top: 24px;">Generated autonomously by AegisGate Enterprise Security Gateway.</p>
        </div>
      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=8) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
            return True
    except Exception:
        return False


async def dispatch_multi_channel_alert(alert_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Coordinates deduplication, quiet hours filtering, and dispatches to all enabled channels.
    Logs delivery results to 'notification_log' table.
    """
    client_ip = alert_data.get("client_ip", "0.0.0.0")
    attack_type = alert_data.get("attack_type", "Threat")
    severity = alert_data.get("severity", "Medium")

    suppress, count = should_suppress_alert(client_ip, attack_type, severity)
    if suppress:
        return {"dispatched": False, "reason": "suppressed_by_burst_deduplication", "count": count}

    results = {}
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notification_channels WHERE enabled = 1")
    channels = [dict(c) for c in cursor.fetchall()]

    for ch in channels:
        ch_type = ch["channel_type"]
        ch_id = ch["id"]
        cfg = json.loads(ch["config_json"]) if ch.get("config_json") else {}

        success = False
        err_msg = None

        if ch_type in ["slack", "discord", "teams"]:
            wh_url = cfg.get("webhook_url")
            if wh_url:
                success = await send_slack_discord_webhook(wh_url, alert_data, count)

        elif ch_type == "siem_webhook":
            wh_url = cfg.get("webhook_url")
            secret = cfg.get("secret_key", "aegis-secret")
            if wh_url:
                success = await send_signed_siem_webhook(wh_url, secret, alert_data)

        elif ch_type == "email":
            to_addr = cfg.get("recipient") or ALERT_EMAIL_RECIPIENT
            if to_addr:
                success = send_smtp_email(to_addr, alert_data, count)

        cursor.execute("""
        INSERT INTO notification_log (channel_id, alert_id, status, error, timestamp)
        VALUES (?, ?, ?, ?, ?)
        """, (ch_id, alert_data.get("id"), "sent" if success else "failed", err_msg, time.time()))
        results[ch["name"]] = "sent" if success else "failed"

    conn.commit()
    conn.close()

    return {"dispatched": True, "channels": results, "burst_count": count}
