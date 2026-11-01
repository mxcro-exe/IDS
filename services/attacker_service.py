"""
Attacker Profile & Threat Intelligence Service for AegisGate IDS.
Synthesizes comprehensive forensic profiles per client IP:
  - First / Last seen timestamps
  - Total requests, hit rates, and attack-type distributions
  - Endpoints targeted & User-Agent fingerprints
  - Honeypot engagement count & active ban status
  - Offline GeoIP enrichment (country, city, ASN)
  - Unified Reputation Score (0 to 100, where 0=malicious, 100=clean)
"""
import time
import json
from typing import Dict, Any, List, Optional
from database import get_db_connection
from services.ban_service import is_ip_banned, is_ip_allowlisted

# Built-in offline GeoIP and ASN mapping for private and public demo IP ranges
OFFLINE_GEOIP_DB = {
    "127.0.0.1": {"country": "Localhost", "country_code": "LO", "city": "Internal Loopback", "asn": "AS0 Localhost"},
    "10.0.4.22": {"country": "United States", "country_code": "US", "city": "Ashburn", "asn": "AS14618 Amazon AWS"},
    "10.0.4.99": {"country": "Russia", "country_code": "RU", "city": "Saint Petersburg", "asn": "AS48282 HostKey"},
    "172.16.0.44": {"country": "Germany", "country_code": "DE", "city": "Frankfurt", "asn": "AS24940 Hetzner Online"},
    "192.168.1.105": {"country": "Private LAN", "country_code": "LAN", "city": "Internal Workstation", "asn": "RFC1918 Private"},
    "192.168.1.108": {"country": "Private LAN", "country_code": "LAN", "city": "QA Test Lab", "asn": "RFC1918 Private"},
    "192.168.1.112": {"country": "Private LAN", "country_code": "LAN", "city": "Dev Environment", "asn": "RFC1918 Private"},
    "198.51.100.14": {"country": "China", "country_code": "CN", "city": "Shenzhen", "asn": "AS4134 Chinanet"},
    "203.0.113.88": {"country": "Netherlands", "country_code": "NL", "city": "Amsterdam", "asn": "AS60781 LeaseWeb"},
}


def lookup_geoip(client_ip: str) -> Dict[str, str]:
    """Offline GeoIP resolution with graceful fallback for unmapped IPs."""
    if client_ip in OFFLINE_GEOIP_DB:
        return OFFLINE_GEOIP_DB[client_ip]
    if client_ip.startswith("10.") or client_ip.startswith("192.168.") or client_ip.startswith("172."):
        return {"country": "Private Network", "country_code": "PVT", "city": "Internal Subnet", "asn": "RFC1918"}
    # Deterministic fallback based on IP bytes
    try:
        parts = [int(p) for p in client_ip.split(".")[:2]]
        h = sum(parts) % 4
        countries = [
            {"country": "United States", "country_code": "US", "city": "North Virginia", "asn": "AS16509 AWS"},
            {"country": "United Kingdom", "country_code": "GB", "city": "London", "asn": "AS13335 Cloudflare"},
            {"country": "India", "country_code": "IN", "city": "Bengaluru", "asn": "AS55836 Reliance Jio"},
            {"country": "Singapore", "country_code": "SG", "city": "Singapore", "asn": "AS4657 StarHub"},
        ]
        return countries[h]
    except Exception:
        return {"country": "Unknown", "country_code": "XX", "city": "Global Internet", "asn": "AS0 Unassigned"}


def compute_reputation_score(total_reqs: int, block_count: int, warn_count: int, honeypot_hits: int) -> int:
    """
    Computes a 0 to 100 reputation score.
    100 = Clean / Trusted
    0 = Hostile / Blacklisted Attacker
    """
    if total_reqs == 0:
        return 75
    score = 100
    # Penalty for honeypots
    score -= honeypot_hits * 35
    # Penalty for block ratio
    block_ratio = block_count / total_reqs
    score -= int(block_ratio * 50)
    # Penalty for warn ratio
    warn_ratio = warn_count / total_reqs
    score -= int(warn_ratio * 20)
    return max(0, min(100, score))


def get_attacker_profile(client_ip: str) -> Dict[str, Any]:
    """Generates an end-to-end profile for a specific client IP."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query all requests for this IP
    cursor.execute("""
    SELECT timestamp, method, path, status_code, risk_score, action, attack_type, latency_ms
    FROM requests
    WHERE client_ip = ?
    ORDER BY timestamp ASC
    """, (client_ip,))
    req_rows = [dict(r) for r in cursor.fetchall()]

    # Query alerts
    cursor.execute("""
    SELECT id, timestamp, attack_type, risk_score, reason, raw_payload
    FROM alerts
    WHERE client_ip = ?
    ORDER BY timestamp DESC
    """, (client_ip,))
    alert_rows = [dict(a) for a in cursor.fetchall()]

    # Query notes
    cursor.execute("""
    SELECT * FROM notes
    WHERE target_type = 'attacker' AND target_id = ?
    ORDER BY created_at DESC
    """, (client_ip,))
    notes = [dict(n) for n in cursor.fetchall()]

    conn.close()

    total_reqs = len(req_rows)
    blocks = sum(1 for r in req_rows if r["action"] == "BLOCK")
    warns = sum(1 for r in req_rows if r["action"] == "WARN")
    allows = sum(1 for r in req_rows if r["action"] == "ALLOW")

    # Honeypot hits
    honeypot_hits = sum(1 for a in alert_rows if a["attack_type"] == "Honeypot_Trap")

    # Timestamps
    first_seen = req_rows[0]["timestamp"] if req_rows else time.time()
    last_seen = req_rows[-1]["timestamp"] if req_rows else time.time()

    # Attack types breakdown
    attack_counts: Dict[str, int] = {}
    for a in alert_rows:
        at = a["attack_type"]
        attack_counts[at] = attack_counts.get(at, 0) + 1

    # Endpoints targeted
    endpoint_counts: Dict[str, int] = {}
    for r in req_rows:
        p = r["path"]
        endpoint_counts[p] = endpoint_counts.get(p, 0) + 1
    top_endpoints = sorted([{"path": k, "hits": v} for k, v in endpoint_counts.items()], key=lambda x: x["hits"], reverse=True)[:6]

    # Risk trend over time (last 10 samples)
    risk_trend = [round(r["risk_score"], 2) for r in req_rows[-10:]]

    # Bot likelihood estimation
    bot_prob = 0.85 if honeypot_hits > 0 or blocks > 3 else (0.45 if warns > 2 else 0.10)

    # GeoIP & Ban status
    geoip = lookup_geoip(client_ip)
    ban_info = is_ip_banned(client_ip)
    allowlisted = is_ip_allowlisted(client_ip)
    reputation = compute_reputation_score(total_reqs, blocks, warns, honeypot_hits)

    return {
        "client_ip": client_ip,
        "geoip": geoip,
        "reputation_score": reputation,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "total_requests": total_reqs,
        "allowed_count": allows,
        "warned_count": warns,
        "blocked_count": blocks,
        "honeypot_hits": honeypot_hits,
        "bot_likelihood": bot_prob,
        "is_banned": ban_info is not None,
        "ban_details": ban_info,
        "is_allowlisted": allowlisted,
        "attack_distribution": attack_counts,
        "top_endpoints": top_endpoints,
        "risk_trend": risk_trend,
        "recent_alerts": alert_rows[:10],
        "notes": notes,
    }


def add_attacker_note(client_ip: str, author: str, note: str) -> Dict[str, Any]:
    """Adds an analyst note or tag to an attacker IP profile."""
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO notes (target_type, target_id, author, note, created_at)
    VALUES ('attacker', ?, ?, ?, ?)
    """, (client_ip, author, note, now))
    note_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": note_id, "client_ip": client_ip, "author": author, "note": note, "created_at": now}
