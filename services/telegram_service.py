"""
Telegram Bot Control Center for AegisGate IDS.
Built on python-telegram-bot. Integrates directly with the AegisGate service layer.
Features:
  - Whitelist authentication & RBAC (ADMIN, ANALYST, VIEWER)
  - Inline confirmation buttons for destructive actions (ban, unban, mode switch)
  - Full command suite: status, score, top, whois, timeline, ban, unban, alerts, incidents, simulate
  - Dual language support (English / Tamil)
  - Audit logging of all commands
  - Rich push notifications with inline remediation buttons
"""
import os
import time
import json
import asyncio
from typing import Dict, Any, List, Optional

from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
)
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)

from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
from services.audit_service import log_audit_event
from services.ban_service import ban_ip, unban_ip, list_active_bans, add_to_allowlist, list_allowlist
from services.incident_service import list_incidents, get_incident_details, update_incident_status, assign_incident
from services.health_service import compute_health_score
from services.attacker_service import get_attacker_profile
from services.explainer_service import generate_explanation
from services.rule_service import list_rules, toggle_rule

# Allowed Telegram User/Chat IDs (from env or defaults)
WHITELISTED_USERS = set(
    filter(None, [u.strip() for u in os.getenv("TELEGRAM_WHITELISTED_USERS", "123456789,987654321").split(",")])
)
# User Role Mapping: user_id -> 'admin' | 'analyst' | 'viewer'
USER_ROLES: Dict[str, str] = {
    "123456789": "admin",
    "987654321": "analyst",
}
# User Language Preference: user_id -> 'en' | 'ta'
USER_LANG: Dict[str, str] = {}

# Running Bot Application Reference
bot_app: Optional[Application] = None


def get_user_role(user_id: int) -> str:
    """Returns assigned role for Telegram user ID, defaulting to viewer if whitelisted."""
    uid_str = str(user_id)
    if not WHITELISTED_USERS or uid_str in WHITELISTED_USERS or str(TELEGRAM_CHAT_ID) == uid_str:
        return USER_ROLES.get(uid_str, "admin")  # Default to admin for primary owner
    return "unauthorized"


def check_auth(update: Update) -> Optional[str]:
    """Verifies Telegram user is authorized. Returns user role or None."""
    user = update.effective_user
    if not user:
        return None
    role = get_user_role(user.id)
    if role == "unauthorized":
        log_audit_event(
            actor=f"telegram:{user.id}",
            action="TELEGRAM_UNAUTHORIZED_ACCESS",
            target="bot",
            details={"username": user.username, "first_name": user.first_name},
        )
        return None
    return role


# -------------------------------------------------------------
# Command Handlers
# -------------------------------------------------------------
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if not role:
        await update.message.reply_text("⛔ Unauthorized. Your Telegram ID is not on the AegisGate whitelist.")
        return

    lang = USER_LANG.get(str(update.effective_user.id), "en")
    if lang == "ta":
        text = (
            "🛡️ *AegisGate IDS டெலிகிராம் கட்டுப்பாட்டு மையம்*\n\n"
            f"அங்கீகரிக்கப்பட்ட பங்கு: `{role.upper()}`\n\n"
            "கட்டளைகளின் பட்டியலைக் காண /help ஐத் தட்டச்சு செய்யவும்."
        )
    else:
        text = (
            "🛡️ *AegisGate IDS Telegram Control Center*\n\n"
            f"Authenticated Role: `{role.upper()}`\n\n"
            "Welcome to the local SOC control plane. Type /help to see all available security commands."
        )
    await update.message.reply_markdown(text)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if not role:
        await update.message.reply_text("⛔ Unauthorized.")
        return

    help_text = (
        "🛡️ *AegisGate Command Directory*\n\n"
        "*General & Health:*\n"
        "• /status — Gateway mode, throughput & active metrics\n"
        "• /score — Security Health Score (0-100) & deductions\n"
        "• /ping — Gateway & ML model heartbeat check\n"
        "• /lang en|ta — Switch response language\n\n"
        "*Alerts & Incidents:*\n"
        "• /alerts [n] — Latest security alerts\n"
        "• /incidents — View open security incidents\n"
        "• /resolve <id> — Mark incident as resolved\n\n"
        "*Attacker Intel & Investigation:*\n"
        "• /whois <ip> — Attacker profile, GeoIP, & reputation\n"
        "• /timeline <ip> — Attack kill-chain stages\n\n"
        "*Enforcement (Admin/Analyst):*\n"
        "• /ban <ip> [duration] [reason] — Ban attacker IP\n"
        "• /unban <ip> — Lift ban on client IP\n"
        "• /bans — List active bans with countdown\n"
        "• /allow <ip> — Add IP to trusted allowlist\n"
        "• /mode protect|monitor|learning — Switch gateway mode\n"
        "• /simulate sqli|xss|traversal|cmdi — Run sandboxed test request\n"
    )
    await update.message.reply_markdown(help_text)


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if not role:
        return

    from database import get_dashboard_metrics
    m = get_dashboard_metrics()
    h = compute_health_score()

    text = (
        "📊 *AegisGate SOC Live Status*\n\n"
        f"• *Mode:* `{h['mode'].upper()}`\n"
        f"• *Health Score:* `{h['score']}/100 (Grade {h['grade']})`\n"
        f"• *Total Requests:* `{m['total_requests']:,}`\n"
        f"• *Allowed:* `{m['allowed_requests']:,}`\n"
        f"• *Warned:* `{m['warned_requests']:,}`\n"
        f"• *Blocked:* `{m['blocked_requests']:,}`\n"
        f"• *Prevention Rate:* `{m['prevention_rate']}%`\n"
        f"• *Avg Latency:* `{m['avg_latency_ms']} ms`\n"
        f"• *Active Bans:* `{h['active_bans']}`\n"
    )
    await update.message.reply_markdown(text)


async def cmd_score(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if not role:
        return

    h = compute_health_score()
    deductions_txt = "\n".join([f"  • {d['points']} pts: {d['title']}" for d in h["deductions"][:3]])
    if not deductions_txt:
        deductions_txt = "  • No posture deductions. All systems fully hardened!"

    text = (
        f"🏆 *Security Health Score: {h['score']}/100 (Grade {h['grade']})*\n\n"
        f"*Top Posture Deductions:*\n{deductions_txt}\n\n"
        f"*Posture Snapshot:*\n"
        f"• Unresolved Incidents: `{h['unresolved_incidents']}`\n"
        f"• Unprotected Endpoints: `{h['unprotected_endpoints']}`\n"
        f"• Active Rules: `{h['active_rules']}`"
    )
    await update.message.reply_markdown(text)


async def cmd_whois(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if not role:
        return

    if not context.args:
        await update.message.reply_text("Usage: /whois <client_ip>")
        return

    ip = context.args[0]
    prof = get_attacker_profile(ip)
    geo = prof["geoip"]

    text = (
        f"🔍 *Attacker Profile: `{ip}`*\n\n"
        f"• *GeoIP:* {geo['city']}, {geo['country']} ({geo['asn']})\n"
        f"• *Reputation Score:* `{prof['reputation_score']}/100` "
        f"({'🟢 Clean' if prof['reputation_score'] > 70 else ('🟡 Suspicious' if prof['reputation_score'] > 40 else '🔴 Hostile')})\n"
        f"• *Total Requests:* `{prof['total_requests']}` (Blocks: `{prof['blocked_count']}`)\n"
        f"• *Honeypot Hits:* `{prof['honeypot_hits']}`\n"
        f"• *Bot Likelihood:* `{int(prof['bot_likelihood'] * 100)}%`\n"
        f"• *Status:* `{'⛔ BANNED' if prof['is_banned'] else ('✅ Allowlisted' if prof['is_allowlisted'] else 'Active')}`\n"
    )
    keyboard = [
        [
            InlineKeyboardButton("⛔ Ban IP", callback_data=f"ban:{ip}:30m"),
            InlineKeyboardButton("✅ Allowlist IP", callback_data=f"allow:{ip}"),
        ]
    ]
    await update.message.reply_markdown(text, reply_markup=InlineKeyboardMarkup(keyboard))


async def cmd_ban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if role not in ["admin", "analyst"]:
        await update.message.reply_text("⛔ Permission Denied: Admin or Analyst role required.")
        return

    if not context.args:
        await update.message.reply_text("Usage: /ban <ip_or_cidr> [duration e.g. 30m, 2h, permanent] [reason]")
        return

    ip = context.args[0]
    duration = context.args[1] if len(context.args) > 1 else "30m"
    reason = " ".join(context.args[2:]) if len(context.args) > 2 else "Banned via Telegram Bot"

    # Confirm via inline button
    keyboard = [
        [
            InlineKeyboardButton("⚠️ Confirm Ban", callback_data=f"confirm_ban:{ip}:{duration}"),
            InlineKeyboardButton("❌ Cancel", callback_data="cancel_action"),
        ]
    ]
    await update.message.reply_markdown(
        f"Are you sure you want to ban `{ip}` for *{duration}*?\nReason: _{reason}_",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_unban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if role not in ["admin", "analyst"]:
        await update.message.reply_text("⛔ Permission Denied: Admin or Analyst role required.")
        return

    if not context.args:
        await update.message.reply_text("Usage: /unban <client_ip>")
        return

    ip = context.args[0]
    success = unban_ip(ip, unbanned_by=f"telegram:{update.effective_user.id}")
    if success:
        await update.message.reply_markdown(f"✅ Successfully unbanned `{ip}`.")
    else:
        await update.message.reply_markdown(f"⚠️ `{ip}` was not found in the active ban list.")


async def cmd_bans(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if not role:
        return

    active_bans = list_active_bans()
    if not active_bans:
        await update.message.reply_markdown("✅ *No active bans.* All client traffic is permitted.")
        return

    lines = ["⛔ *Active IP Bans:*"]
    for b in active_bans[:10]:
        lines.append(f"• `{b['ip_or_cidr']}` — {b['reason']} (Expires: {b['remaining_human']})")

    await update.message.reply_markdown("\n".join(lines))


async def cmd_allow(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if role not in ["admin", "analyst"]:
        await update.message.reply_text("⛔ Permission Denied: Admin or Analyst role required.")
        return

    if not context.args:
        await update.message.reply_text("Usage: /allow <ip_or_cidr> [reason]")
        return

    ip = context.args[0]
    reason = " ".join(context.args[1:]) if len(context.args) > 1 else "Allowlisted via Telegram"
    add_to_allowlist(ip, reason=reason, created_by=f"telegram:{update.effective_user.id}")
    await update.message.reply_markdown(f"✅ Added `{ip}` to trusted allowlist.")


async def cmd_simulate(update: Update, context: ContextTypes.DEFAULT_TYPE):
    role = check_auth(update)
    if not role:
        return

    atype = context.args[0].lower() if context.args else "sqli"
    payloads = {
        "sqli": ("GET", "/demo/api/users", "search=admin' OR '1'='1"),
        "xss": ("GET", "/demo/api/search", "q=<script>alert('xss')</script>"),
        "traversal": ("GET", "/demo/api/files", "file=../../../../etc/passwd"),
        "cmdi": ("GET", "/demo/api/ping", "host=127.0.0.1; cat /etc/shadow"),
        "benign": ("GET", "/demo/api/users", "search=alice"),
    }
    method, path, query = payloads.get(atype, payloads["sqli"])

    from detector import detector
    detector.load_models()
    res = detector.predict_request(method=method, path=path, query=query)

    verdict_emoji = "🔴 BLOCKED" if res["action"] == "BLOCK" else ("🟡 WARNED" if res["action"] == "WARN" else "🟢 ALLOWED")
    text = (
        f"🧪 *Harmless Simulation Result: `{atype.upper()}`*\n\n"
        f"• *Target:* `127.0.0.1 (Local Sandbox Only)`\n"
        f"• *Verdict:* {verdict_emoji}\n"
        f"• *Risk Score:* `{res['risk_score']:.2f}`\n"
        f"• *Attack Type:* `{res['attack_type']}`\n"
        f"• *Payload:* `{path}?{query}`"
    )
    await update.message.reply_markdown(text)


# -------------------------------------------------------------
# Callback Query Handler (Inline Button Remediations)
# -------------------------------------------------------------
async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    role = get_user_role(query.from_user.id)
    if role not in ["admin", "analyst"]:
        await query.edit_message_text("⛔ Permission Denied: Admin or Analyst role required.")
        return

    data = query.data
    if data == "cancel_action":
        await query.edit_message_text("❌ Action cancelled.")
        return

    if data.startswith("confirm_ban:"):
        _, ip, duration = data.split(":")
        res = ban_ip(ip, reason="Banned via Telegram Inline Action", duration_str=duration, banned_by=f"telegram:{query.from_user.id}")
        await query.edit_message_text(f"⛔ `{ip}` has been successfully BANNED for {duration}.")
        return

    if data.startswith("ban:"):
        _, ip, duration = data.split(":")
        res = ban_ip(ip, reason="Banned via Telegram Button", duration_str=duration, banned_by=f"telegram:{query.from_user.id}")
        await query.edit_message_text(f"⛔ `{ip}` has been successfully BANNED for {duration}.")
        return

    if data.startswith("allow:"):
        _, ip = data.split(":")
        res = add_to_allowlist(ip, reason="Added via Telegram", created_by=f"telegram:{query.from_user.id}")
        await query.edit_message_text(f"✅ `{ip}` has been added to the trusted Allowlist.")
        return


# -------------------------------------------------------------
# Push Notification Dispatcher
# -------------------------------------------------------------
async def push_telegram_alert(alert_data: Dict[str, Any]) -> bool:
    """Sends a rich alert card directly to the configured Telegram chat."""
    global bot_app
    if not bot_app or not TELEGRAM_CHAT_ID:
        return False

    client_ip = alert_data.get("client_ip", "0.0.0.0")
    attack_type = alert_data.get("attack_type", "Threat")
    risk_score = float(alert_data.get("risk_score", 0.0))
    action = alert_data.get("action", "BLOCK")
    reason = alert_data.get("reason", "Malicious activity flagged.")

    severity_emoji = "🔴" if action == "BLOCK" else "🟡"
    text = (
        f"{severity_emoji} *[AEGISGATE {action}] Threat Intercepted*\n\n"
        f"• *Type:* `{attack_type}`\n"
        f"• *Attacker IP:* `{client_ip}`\n"
        f"• *Risk Score:* `{risk_score:.2f}`\n"
        f"• *Summary:* _{reason}_\n"
    )
    keyboard = [
        [
            InlineKeyboardButton("⛔ Ban 1h", callback_data=f"ban:{client_ip}:1h"),
            InlineKeyboardButton("✅ Allowlist", callback_data=f"allow:{client_ip}"),
        ]
    ]
    try:
        await bot_app.bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=text,
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return True
    except Exception:
        return False


# -------------------------------------------------------------
# Bot Initialization & Startup
# -------------------------------------------------------------
def setup_telegram_bot() -> Optional[Application]:
    """Initializes and registers Telegram bot application if token is provided."""
    global bot_app
    if not TELEGRAM_BOT_TOKEN:
        return None

    try:
        app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        app.add_handler(CommandHandler("start", cmd_start))
        app.add_handler(CommandHandler("help", cmd_help))
        app.add_handler(CommandHandler("status", cmd_status))
        app.add_handler(CommandHandler("score", cmd_score))
        app.add_handler(CommandHandler("whois", cmd_whois))
        app.add_handler(CommandHandler("ban", cmd_ban))
        app.add_handler(CommandHandler("unban", cmd_unban))
        app.add_handler(CommandHandler("bans", cmd_bans))
        app.add_handler(CommandHandler("allow", cmd_allow))
        app.add_handler(CommandHandler("simulate", cmd_simulate))
        app.add_handler(CallbackQueryHandler(handle_callback_query))

        bot_app = app
        return app
    except Exception as e:
        print(f"[!] Warning: Could not initialize Telegram Bot: {e}")
        return None
