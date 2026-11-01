"""
Incident Management & Kill-Chain Correlation Service for AegisGate IDS.
Automatically correlates alerts into campaigns/incidents, infers kill-chain stages,
generates plain-language incident story summaries, and tracks investigation lifecycle.
"""
import time
import json
from typing import List, Dict, Any, Optional
from database import get_db_connection
from services.audit_service import log_audit_event

STAGE_MAPPING = {
    "Honeypot_Trap": "recon",
    "Scanner_Probe": "recon",
    "Port_Scan": "recon",
    "Information_Disclosure": "probing",
    "BOLA_IDOR": "probing",
    "SQL_Injection": "exploit",
    "XSS": "exploit",
    "Command_Injection": "exploit",
    "Path_Traversal": "exploit",
    "SSRF": "exploit",
    "XXE": "exploit",
    "NoSQL_Injection": "exploit",
    "LDAP_Injection": "exploit",
    "Obfuscation": "evasion",
    "JWT_Tampering": "evasion",
    "Brute_Force": "brute_force",
    "Credential_Stuffing": "brute_force",
    "Rate_Limit_Exceeded": "blocked",
}


def infer_kill_chain_stage(attack_type: str, action: str) -> str:
    """Infers the kill chain stage from the alert attack type and gateway action."""
    if action == "BLOCK":
        return "blocked"
    return STAGE_MAPPING.get(attack_type, "exploit")


def generate_story_summary(client_ip: str, events: List[Dict[str, Any]]) -> str:
    """
    Synthesizes an executive plain-language story of the attack sequence.
    Example: 'Over 4 minutes, client 10.0.4.22 scanned 3 decoy endpoints, launched 5 SQL injections, and was blocked.'
    """
    if not events:
        return f"Incident registered for {client_ip}."

    ts_list = [e.get("timestamp", 0) for e in events]
    duration_sec = max(ts_list) - min(ts_list)
    duration_str = f"{int(duration_sec // 60)}m {int(duration_sec % 60)}s" if duration_sec >= 60 else f"{max(1, int(duration_sec))}s"

    attack_counts: Dict[str, int] = {}
    for e in events:
        at = e.get("attack_type", "Threat")
        attack_counts[at] = attack_counts.get(at, 0) + 1

    attacks_summary = ", ".join([f"{count} {atype}" for atype, count in attack_counts.items()])
    return f"Over {duration_str}, client {client_ip} triggered {len(events)} security events ({attacks_summary}) before being mitigated."


def correlate_alert_to_incident(alert_data: Dict[str, Any]) -> int:
    """
    Checks if an open incident exists for this client_ip within the last 15 minutes.
    If yes, appends the alert to the existing incident; otherwise, creates a new incident.
    """
    client_ip = alert_data.get("client_ip", "0.0.0.0")
    attack_type = alert_data.get("attack_type", "Unknown")
    risk_score = float(alert_data.get("risk_score", 0.5))
    alert_id = alert_data.get("id")
    now = alert_data.get("timestamp") or time.time()

    severity = "low"
    if risk_score >= 0.85:
        severity = "critical"
    elif risk_score >= 0.70:
        severity = "high"
    elif risk_score >= 0.40:
        severity = "medium"

    conn = get_db_connection()
    cursor = conn.cursor()

    # Look for active incident within last 900 seconds (15 mins)
    window_start = now - 900
    cursor.execute("""
    SELECT id, title, severity FROM incidents
    WHERE client_ip = ? AND status IN ('open', 'investigating') AND updated_at >= ?
    ORDER BY id DESC LIMIT 1
    """, (client_ip, window_start))
    row = cursor.fetchone()

    stage = infer_kill_chain_stage(attack_type, "BLOCK" if risk_score >= 0.7 else "WARN")

    if row:
        incident_id = row["id"]
        # Escalate severity if incoming alert is higher
        new_severity = row["severity"]
        if severity == "critical" or (severity == "high" and new_severity in ["low", "medium"]):
            new_severity = severity

        cursor.execute("""
        UPDATE incidents
        SET updated_at = ?, severity = ?
        WHERE id = ?
        """, (now, new_severity, incident_id))
    else:
        title = f"{attack_type.replace('_', ' ')} Campaign from {client_ip}"
        cursor.execute("""
        INSERT INTO incidents (title, client_ip, attack_type, severity, status, assignee, created_at, updated_at, summary)
        VALUES (?, ?, ?, ?, 'open', 'Unassigned', ?, ?, ?)
        """, (title, client_ip, attack_type, severity, now, now, f"Automated correlation for client {client_ip}"))
        incident_id = cursor.lastrowid

    # Add event to incident_events
    details_str = json.dumps({
        "attack_type": attack_type,
        "risk_score": risk_score,
        "mitre_id": alert_data.get("mitre_id", ""),
        "reason": alert_data.get("reason", ""),
        "raw_payload": alert_data.get("raw_payload", ""),
    })
    cursor.execute("""
    INSERT INTO incident_events (incident_id, alert_id, timestamp, stage, details)
    VALUES (?, ?, ?, ?, ?)
    """, (incident_id, alert_id, now, stage, details_str))

    conn.commit()
    conn.close()
    return incident_id


def get_incident_details(incident_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves full incident details including kill-chain timeline and notes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    inc = dict(row)

    # Get events
    cursor.execute("""
    SELECT * FROM incident_events
    WHERE incident_id = ?
    ORDER BY timestamp ASC
    """, (incident_id,))
    event_rows = [dict(e) for e in cursor.fetchall()]

    for ev in event_rows:
        try:
            ev["details_obj"] = json.loads(ev["details"])
        except Exception:
            ev["details_obj"] = {}

    # Get notes
    cursor.execute("""
    SELECT * FROM notes
    WHERE target_type = 'incident' AND target_id = ?
    ORDER BY created_at DESC
    """, (str(incident_id),))
    notes = [dict(n) for n in cursor.fetchall()]

    conn.close()

    inc["events"] = event_rows
    inc["notes"] = notes
    inc["story_summary"] = generate_story_summary(
        inc["client_ip"],
        [e.get("details_obj", {}) | {"timestamp": e["timestamp"]} for e in event_rows],
    )
    return inc


def list_incidents(status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Lists incidents with event count and latest timestamp."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT i.*, COUNT(e.id) as event_count
    FROM incidents i
    LEFT JOIN incident_events e ON i.id = e.incident_id
    """
    params = []
    if status and status != "all":
        query += " WHERE i.status = ?"
        params.append(status)

    query += " GROUP BY i.id ORDER BY i.updated_at DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def update_incident_status(incident_id: int, status: str, actor: str = "admin") -> bool:
    """Updates status: open, investigating, resolved, false_positive."""
    if status not in ["open", "investigating", "resolved", "false_positive"]:
        raise ValueError(f"Invalid incident status: {status}")

    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?", (status, now, incident_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()

    if success:
        log_audit_event(
            actor=actor,
            action="UPDATE_INCIDENT_STATUS",
            target=f"incident:{incident_id}",
            details={"status": status},
        )
    return success


def assign_incident(incident_id: int, assignee: str, actor: str = "admin") -> bool:
    """Assigns an incident to an analyst or admin."""
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE incidents SET assignee = ?, updated_at = ? WHERE id = ?", (assignee, now, incident_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()

    if success:
        log_audit_event(
            actor=actor,
            action="ASSIGN_INCIDENT",
            target=f"incident:{incident_id}",
            details={"assignee": assignee},
        )
    return success


def add_incident_note(incident_id: int, author: str, note: str) -> Dict[str, Any]:
    """Appends an analyst note to an incident."""
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO notes (target_type, target_id, author, note, created_at)
    VALUES ('incident', ?, ?, ?, ?)
    """, (str(incident_id), author, note, now))
    note_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_audit_event(
        actor=author,
        action="ADD_INCIDENT_NOTE",
        target=f"incident:{incident_id}",
        details={"note_id": note_id},
    )
    return {"id": note_id, "author": author, "note": note, "created_at": now}
