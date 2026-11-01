"""
Unified Ban and Allowlist Management Service for AegisGate IDS.
Supports single IPv4/IPv6, CIDR subnet matching (e.g. 10.0.0.0/24),
human-readable duration parsing (30m, 2h, 7d, permanent), auto-expiry,
and integration with the tamper-evident audit log.
"""
import time
import ipaddress
from typing import List, Dict, Any, Optional
from database import get_db_connection
from services.audit_service import log_audit_event


def parse_duration_string(duration_str: str) -> Optional[float]:
    """
    Parses human duration formats like '30m', '2h', '1d', '7d', 'permanent' into seconds.
    Returns None for permanent/infinite ban.
    """
    if not duration_str or duration_str.lower() in ["permanent", "perm", "forever", "inf"]:
        return None
    d = duration_str.lower().strip()
    try:
        if d.endswith("s"):
            return float(d[:-1])
        elif d.endswith("m"):
            return float(d[:-1]) * 60
        elif d.endswith("h"):
            return float(d[:-1]) * 3600
        elif d.endswith("d"):
            return float(d[:-1]) * 86400
        elif d.endswith("w"):
            return float(d[:-1]) * 604800
        else:
            return float(d) * 60  # Default to minutes if just a number
    except ValueError:
        return 600.0  # Default to 10 minutes fallback


def is_ip_in_network(client_ip: str, network_str: str) -> bool:
    """Checks if client_ip matches an exact IP or CIDR network string."""
    try:
        client_addr = ipaddress.ip_address(client_ip)
        if "/" in network_str:
            net = ipaddress.ip_network(network_str, strict=False)
            return client_addr in net
        else:
            return client_addr == ipaddress.ip_address(network_str)
    except ValueError:
        return client_ip.strip() == network_str.strip()


def is_ip_allowlisted(client_ip: str) -> bool:
    """Returns True if client_ip matches any entry in the allowlist table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ip_or_cidr FROM allowlist")
    rows = cursor.fetchall()
    conn.close()

    for r in rows:
        if is_ip_in_network(client_ip, r["ip_or_cidr"]):
            return True
    return False


def is_ip_banned(client_ip: str) -> Optional[Dict[str, Any]]:
    """
    Checks if client_ip is currently banned and active.
    Returns ban record dict if banned, else None.
    """
    if is_ip_allowlisted(client_ip):
        return None

    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query active bans
    cursor.execute("""
    SELECT * FROM bans
    WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)
    """, (now,))
    bans = [dict(row) for row in cursor.fetchall()]

    # Also check legacy banned_ips table for compatibility
    cursor.execute("""
    SELECT ip, reason, banned_at, expires_at FROM banned_ips
    WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)
    """, (now,))
    legacy = [dict(row) for row in cursor.fetchall()]
    conn.close()

    for b in bans:
        if is_ip_in_network(client_ip, b["ip_or_cidr"]):
            return b

    for leg in legacy:
        if is_ip_in_network(client_ip, leg["ip"]):
            return {
                "id": -1,
                "ip_or_cidr": leg["ip"],
                "reason": leg["reason"],
                "banned_at": leg["banned_at"],
                "expires_at": leg["expires_at"],
                "banned_by": "legacy_honeypot",
            }

    return None


def ban_ip(
    ip_or_cidr: str,
    reason: str = "Administrative Security Action",
    duration_str: str = "30m",
    banned_by: str = "admin",
) -> Dict[str, Any]:
    """Bans an IP address or CIDR range with specified duration and reason."""
    now = time.time()
    sec = parse_duration_string(duration_str)
    expires_at = (now + sec) if sec is not None else None

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR REPLACE INTO bans (ip_or_cidr, reason, banned_at, expires_at, is_active, banned_by)
    VALUES (?, ?, ?, ?, 1, ?)
    """, (ip_or_cidr, reason, now, expires_at, banned_by))

    # Also maintain sync with legacy table
    cursor.execute("""
    INSERT OR REPLACE INTO banned_ips (ip, reason, banned_at, expires_at, is_active)
    VALUES (?, ?, ?, ?, 1)
    """, (ip_or_cidr, reason, now, expires_at or (now + 86400 * 365)))

    conn.commit()
    conn.close()

    log_audit_event(
        actor=banned_by,
        action="BAN_IP",
        target=ip_or_cidr,
        details={"reason": reason, "duration": duration_str, "expires_at": expires_at},
    )

    return {
        "status": "banned",
        "ip_or_cidr": ip_or_cidr,
        "reason": reason,
        "duration": duration_str,
        "expires_at": expires_at,
    }


def unban_ip(ip_or_cidr: str, unbanned_by: str = "admin") -> bool:
    """Lifts a ban on an IP or CIDR range."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("UPDATE bans SET is_active = 0 WHERE ip_or_cidr = ?", (ip_or_cidr,))
    updated_bans = cursor.rowcount > 0

    cursor.execute("UPDATE banned_ips SET is_active = 0 WHERE ip = ?", (ip_or_cidr,))
    updated_legacy = cursor.rowcount > 0

    conn.commit()
    conn.close()

    if updated_bans or updated_legacy:
        log_audit_event(
            actor=unbanned_by,
            action="UNBAN_IP",
            target=ip_or_cidr,
            details={"status": "unbanned"},
        )
        return True
    return False


def list_active_bans() -> List[Dict[str, Any]]:
    """Returns list of currently active bans with remaining time."""
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM bans
    WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY id DESC
    """, (now,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    for r in rows:
        if r.get("expires_at"):
            rem = max(0, int(r["expires_at"] - now))
            r["remaining_seconds"] = rem
            r["remaining_human"] = f"{rem // 60}m {rem % 60}s" if rem > 60 else f"{rem}s"
        else:
            r["remaining_seconds"] = None
            r["remaining_human"] = "Permanent"
    return rows


def add_to_allowlist(ip_or_cidr: str, reason: str = "Trusted Client", created_by: str = "admin") -> Dict[str, Any]:
    """Adds an IP or CIDR subnet to the trusted bypass allowlist."""
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR REPLACE INTO allowlist (ip_or_cidr, reason, created_at, created_by)
    VALUES (?, ?, ?, ?)
    """, (ip_or_cidr, reason, now, created_by))
    conn.commit()
    conn.close()

    # Unban immediately if previously banned
    unban_ip(ip_or_cidr, unbanned_by=f"allowlist_add_{created_by}")

    log_audit_event(
        actor=created_by,
        action="ADD_ALLOWLIST",
        target=ip_or_cidr,
        details={"reason": reason},
    )

    return {"status": "allowlisted", "ip_or_cidr": ip_or_cidr, "reason": reason}


def remove_from_allowlist(ip_or_cidr: str, removed_by: str = "admin") -> bool:
    """Removes an IP or CIDR from the allowlist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM allowlist WHERE ip_or_cidr = ?", (ip_or_cidr,))
    removed = cursor.rowcount > 0
    conn.commit()
    conn.close()

    if removed:
        log_audit_event(
            actor=removed_by,
            action="REMOVE_ALLOWLIST",
            target=ip_or_cidr,
            details={"status": "removed"},
        )
    return removed


def list_allowlist() -> List[Dict[str, Any]]:
    """Returns all entries currently on the allowlist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM allowlist ORDER BY id DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows
