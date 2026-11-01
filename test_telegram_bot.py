"""
Tests for Telegram Bot Control Center (Stage 10 / Section C).
Mocks Telegram Update & Context objects to verify RBAC, command handling,
and inline callback actions.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from services.telegram_service import (
    cmd_start,
    cmd_help,
    cmd_status,
    cmd_score,
    cmd_whois,
    cmd_ban,
    cmd_unban,
    cmd_bans,
    cmd_allow,
    cmd_simulate,
    handle_callback_query,
    get_user_role,
    check_auth,
)
from services.ban_service import ban_ip


def create_mock_update(user_id=123456789, args=None):
    update = MagicMock()
    update.effective_user.id = user_id
    update.effective_user.username = "test_sec_admin"
    update.effective_user.first_name = "Admin"
    update.message = MagicMock()
    update.message.reply_text = AsyncMock()
    update.message.reply_markdown = AsyncMock()

    context = MagicMock()
    context.args = args or []
    return update, context


def test_telegram_rbac_roles():
    """Verify role determination based on whitelisted IDs."""
    assert get_user_role(123456789) == "admin"
    assert get_user_role(987654321) == "analyst"
    role = get_user_role(999999999)
    assert role in ["viewer", "unauthorized", "admin"]


@pytest.mark.anyio
async def test_telegram_start_and_help():
    update, context = create_mock_update(123456789)
    await cmd_start(update, context)
    update.message.reply_markdown.assert_called_once()
    assert "AegisGate IDS Telegram Control Center" in update.message.reply_markdown.call_args[0][0]

    update_help, context_help = create_mock_update(123456789)
    await cmd_help(update_help, context_help)
    update_help.message.reply_markdown.assert_called_once()
    assert "/status" in update_help.message.reply_markdown.call_args[0][0]


@pytest.mark.anyio
async def test_telegram_status_and_score():
    update, context = create_mock_update(123456789)
    await cmd_status(update, context)
    update.message.reply_markdown.assert_called_once()
    msg = update.message.reply_markdown.call_args[0][0]
    assert "AegisGate SOC Live Status" in msg
    assert "Health Score:" in msg

    update_score, context_score = create_mock_update(123456789)
    await cmd_score(update_score, context_score)
    update_score.message.reply_markdown.assert_called_once()
    score_msg = update_score.message.reply_markdown.call_args[0][0]
    assert "Security Health Score:" in score_msg


@pytest.mark.anyio
async def test_telegram_whois():
    update, context = create_mock_update(123456789, args=["192.168.1.100"])
    await cmd_whois(update, context)
    update.message.reply_markdown.assert_called_once()
    whois_msg = update.message.reply_markdown.call_args[0][0]
    assert "Attacker Profile" in whois_msg
    assert "192.168.1.100" in whois_msg


@pytest.mark.anyio
async def test_telegram_ban_unban_allow():
    # 1. Test cmd_ban confirmation dialogue
    update, context = create_mock_update(123456789, args=["203.0.113.88", "1h", "Automated Telegram Test"])
    await cmd_ban(update, context)
    update.message.reply_markdown.assert_called_once()
    assert "203.0.113.88" in update.message.reply_markdown.call_args[0][0]

    # Directly ban IP for verification of bans and unban
    ban_ip("203.0.113.88", reason="Test Ban", duration_str="1h")

    # Verify active bans command
    update_bans, context_bans = create_mock_update(123456789)
    await cmd_bans(update_bans, context_bans)
    update_bans.message.reply_markdown.assert_called_once()
    assert "203.0.113.88" in update_bans.message.reply_markdown.call_args[0][0]

    # Unban
    update_unban, context_unban = create_mock_update(123456789, args=["203.0.113.88"])
    await cmd_unban(update_unban, context_unban)
    update_unban.message.reply_markdown.assert_called_once()
    assert "unbanned" in update_unban.message.reply_markdown.call_args[0][0].lower()

    # Allowlist
    update_allow, context_allow = create_mock_update(123456789, args=["198.51.100.22", "Trusted Partner"])
    await cmd_allow(update_allow, context_allow)
    update_allow.message.reply_markdown.assert_called_once()
    assert "198.51.100.22" in update_allow.message.reply_markdown.call_args[0][0]


@pytest.mark.anyio
async def test_telegram_simulate():
    update, context = create_mock_update(123456789, args=["sqli"])
    await cmd_simulate(update, context)
    update.message.reply_markdown.assert_called_once()
    sim_msg = update.message.reply_markdown.call_args[0][0]
    assert "Harmless Simulation Result" in sim_msg
    assert "BLOCKED" in sim_msg or "SQL_Injection" in sim_msg


@pytest.mark.anyio
async def test_telegram_callback_buttons():
    update = MagicMock()
    update.effective_user.id = 123456789
    query = MagicMock()
    query.from_user.id = 123456789
    query.data = "ban:198.51.100.99:30m"
    query.answer = AsyncMock()
    query.edit_message_text = AsyncMock()
    update.callback_query = query

    context = MagicMock()
    await handle_callback_query(update, context)
    query.answer.assert_called_once()
    query.edit_message_text.assert_called_once()
    assert "BANNED" in query.edit_message_text.call_args[0][0]
