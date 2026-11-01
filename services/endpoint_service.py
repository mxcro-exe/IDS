"""
API Discovery, Schema Validation, and Endpoint Risk Map Service for AegisGate IDS.
Automatically registers discovered endpoints from live traffic, normalizes dynamic paths
(e.g., /api/users/42 -> /api/users/{id}), computes risk heatmaps, identifies shadow APIs,
and supports OpenAPI/Swagger schema importation.
"""
import time
import re
import json
from typing import List, Dict, Any, Optional
from database import get_db_connection

# Path normalization regexes for ID, UUID, and hashes
NORM_RULES = [
    (re.compile(r"/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"), "/{uuid}"),
    (re.compile(r"/[0-9a-fA-F]{24,64}"), "/{hash}"),
    (re.compile(r"/\d+"), "/{id}"),
]


def normalize_api_path(path: str) -> str:
    """Normalizes dynamic path parameters into clean schema tokens."""
    # Strip query parameters if present
    clean_path = path.split("?")[0].rstrip("/")
    if not clean_path:
        return "/"
    norm = clean_path
    for pattern, replacement in NORM_RULES:
        norm = pattern.sub(replacement, norm)
    return norm


def record_endpoint_traffic(
    method: str,
    path: str,
    is_attack: bool,
    latency_ms: float,
    has_auth_header: bool = False,
) -> None:
    """Records an incoming request to update endpoint discovery statistics."""
    norm_path = normalize_api_path(path)
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, request_count, attack_count, avg_latency, auth_required, is_shadow, is_protected
    FROM endpoints
    WHERE method = ? AND normalized_path = ?
    """, (method.upper(), norm_path))
    row = cursor.fetchone()

    if row:
        eid = row["id"]
        req_count = row["request_count"] + 1
        att_count = row["attack_count"] + (1 if is_attack else 0)
        # Moving average latency
        old_avg = row["avg_latency"] or 0.0
        new_avg = old_avg + (latency_ms - old_avg) / req_count
        auth_req = 1 if (row["auth_required"] or has_auth_header) else 0

        cursor.execute("""
        UPDATE endpoints
        SET request_count = ?, attack_count = ?, avg_latency = ?,
            last_attack_time = CASE WHEN ? = 1 THEN ? ELSE last_attack_time END,
            auth_required = ?
        WHERE id = ?
        """, (req_count, att_count, round(new_avg, 2), 1 if is_attack else 0, now, auth_req, eid))
    else:
        # Auto-discovered endpoint
        cursor.execute("""
        INSERT INTO endpoints (
            method, path, normalized_path, request_count, attack_count,
            avg_latency, last_attack_time, auth_required, is_shadow, is_protected
        )
        VALUES (?, ?, ?, 1, ?, ?, ?, ?, 0, 1)
        """, (
            method.upper(),
            path,
            norm_path,
            1 if is_attack else 0,
            round(latency_ms, 2),
            now if is_attack else None,
            1 if has_auth_header else 0,
        ))

    conn.commit()
    conn.close()


def list_discovered_endpoints() -> List[Dict[str, Any]]:
    """Returns all discovered endpoints with computed attack ratios and risk scores."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM endpoints ORDER BY attack_count DESC, request_count DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    for r in rows:
        reqs = max(1, r["request_count"])
        att = r["attack_count"]
        r["attack_rate"] = round((att / reqs) * 100, 1)
        # Compute 0-100 risk score for heatmap
        # Higher score = higher risk
        risk = min(100, int((att / reqs) * 70) + (30 if not r["auth_required"] and att > 0 else 10))
        r["risk_score"] = risk
        r["is_protected"] = bool(r["is_protected"])
        r["is_shadow"] = bool(r["is_shadow"])
        r["auth_required"] = bool(r["auth_required"])
    return rows


def toggle_endpoint_protection(endpoint_id: int, is_protected: bool) -> bool:
    """Toggles active IDS inspection on an endpoint."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE endpoints SET is_protected = ? WHERE id = ?", (1 if is_protected else 0, endpoint_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success


def import_openapi_schema(spec: Dict[str, Any]) -> Dict[str, Any]:
    """
    Imports routes from an OpenAPI / Swagger JSON spec.
    Marks existing routes that are NOT in the spec as 'shadow endpoints'.
    """
    paths_obj = spec.get("paths", {})
    imported_routes = []
    conn = get_db_connection()
    cursor = conn.cursor()

    for p, methods in paths_obj.items():
        for m in methods.keys():
            if m.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                norm = normalize_api_path(p)
                imported_routes.append((m.upper(), norm))
                # Insert or mark as verified (not shadow)
                cursor.execute("""
                INSERT INTO endpoints (method, path, normalized_path, request_count, attack_count, avg_latency, auth_required, is_shadow, is_protected)
                VALUES (?, ?, ?, 0, 0, 0.0, 0, 0, 1)
                ON CONFLICT(method, normalized_path) DO UPDATE SET is_shadow = 0
                """, (m.upper(), p, norm))

    # Any endpoint in DB not in spec becomes flagged as a shadow API
    cursor.execute("SELECT id, method, normalized_path FROM endpoints")
    all_eps = cursor.fetchall()
    shadow_count = 0
    for ep in all_eps:
        pair = (ep["method"], ep["normalized_path"])
        if pair not in imported_routes:
            cursor.execute("UPDATE endpoints SET is_shadow = 1 WHERE id = ?", (ep["id"],))
            shadow_count += 1

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "imported_routes": len(imported_routes),
        "shadow_endpoints_flagged": shadow_count,
    }
