"""
Tamper-Evident Audit Logging Service for AegisGate IDS.
Implements a cryptographic SHA-256 hash chain to ensure all administrative,
bot, rule, ban, and security actions cannot be altered or deleted unnoticed.
"""
import time
import json
import hashlib
from typing import List, Dict, Any, Optional
from database import get_db_connection

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


def get_latest_hash(conn) -> str:
    """Retrieves the current leaf hash from the audit chain."""
    cursor = conn.cursor()
    cursor.execute("SELECT current_hash FROM audit_log ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    if row and row["current_hash"]:
        return row["current_hash"]
    return GENESIS_HASH


def log_audit_event(
    actor: str,
    action: str,
    target: str = "",
    details: Optional[Dict[str, Any]] = None,
    timestamp: Optional[float] = None,
) -> int:
    """
    Appends a new verified event to the audit log hash chain.
    Hash = SHA256(prev_hash + '|' + timestamp + '|' + actor + '|' + action + '|' + target + '|' + details_json)
    """
    if timestamp is None:
        timestamp = time.time()
    if details is None:
        details = {}

    details_json = json.dumps(details, sort_keys=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    prev_hash = get_latest_hash(conn)
    record_raw = f"{prev_hash}|{timestamp:.4f}|{actor}|{action}|{target}|{details_json}"
    current_hash = hashlib.sha256(record_raw.encode("utf-8")).hexdigest()

    cursor.execute("""
    INSERT INTO audit_log (timestamp, actor, action, target, details_json, prev_hash, current_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (timestamp, actor, action, target, details_json, prev_hash, current_hash))

    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def get_audit_logs(
    limit: int = 100,
    actor: Optional[str] = None,
    action: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieves audit entries with optional actor and action filters."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM audit_log WHERE 1=1"
    params = []
    if actor:
        query += " AND actor = ?"
        params.append(actor)
    if action:
        query += " AND action LIKE ?"
        params.append(f"%{action}%")

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Parse details_json for clean consumption
    for r in rows:
        try:
            r["details"] = json.loads(r["details_json"]) if r.get("details_json") else {}
        except Exception:
            r["details"] = {}
    return rows


def verify_audit_integrity() -> Dict[str, Any]:
    """
    Validates the entire cryptographic hash chain from genesis to head.
    Returns whether the chain is fully intact and pinpoints any corrupted entry.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_log ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {"valid": True, "count": 0, "message": "Audit log is empty (valid)"}

    expected_prev = GENESIS_HASH
    for r in rows:
        actual_prev = r["prev_hash"]
        actual_curr = r["current_hash"]
        ts = r["timestamp"]
        actor = r["actor"]
        action = r["action"]
        target = r["target"] or ""
        details_json = r["details_json"] or "{}"

        # Check chain linkage
        if actual_prev != expected_prev:
            return {
                "valid": False,
                "broken_at_id": r["id"],
                "reason": f"Hash chain broken: expected prev_hash {expected_prev[:12]}, found {actual_prev[:12]}",
            }

        # Check integrity of payload
        expected_raw = f"{actual_prev}|{ts:.4f}|{actor}|{action}|{target}|{details_json}"
        expected_curr = hashlib.sha256(expected_raw.encode("utf-8")).hexdigest()
        if expected_curr != actual_curr:
            return {
                "valid": False,
                "broken_at_id": r["id"],
                "reason": f"Data tampering detected at id {r['id']}: recomputed hash mismatch",
            }

        expected_prev = actual_curr

    return {
        "valid": True,
        "count": len(rows),
        "head_hash": expected_prev,
        "message": f"Cryptographic audit chain intact across {len(rows)} verified entries.",
    }
