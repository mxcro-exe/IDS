"""
Anomaly Baseline Learning & Seasonality Service for AegisGate IDS.
Calculates normal parametric baselines per endpoint (rates, payload sizes, hourly profiles),
detects statistical z-score outliers, tracks baseline confidence, and supports
planned maintenance/traffic burst event windows.
"""
import time
import math
import json
from typing import Dict, Any, Optional
from database import get_db_connection

# In-memory Planned Event Window (relax thresholds during flash sales / maintenance)
PLANNED_EVENT_UNTIL: Optional[float] = None
PLANNED_EVENT_REASON: str = ""


def set_planned_event(duration_minutes: int, reason: str = "Scheduled Maintenance / Traffic Burst") -> Dict[str, Any]:
    """Relaxes detection thresholds temporarily during an approved operational event."""
    global PLANNED_EVENT_UNTIL, PLANNED_EVENT_REASON
    PLANNED_EVENT_UNTIL = time.time() + (duration_minutes * 60)
    PLANNED_EVENT_REASON = reason
    return {
        "status": "active",
        "expires_at": PLANNED_EVENT_UNTIL,
        "duration_minutes": duration_minutes,
        "reason": reason,
    }


def is_planned_event_active() -> bool:
    """Checks whether a planned event window is currently active."""
    global PLANNED_EVENT_UNTIL
    if PLANNED_EVENT_UNTIL and time.time() < PLANNED_EVENT_UNTIL:
        return True
    return False


def get_planned_event_info() -> Dict[str, Any]:
    """Returns status of current planned event window."""
    active = is_planned_event_active()
    now = time.time()
    rem = max(0, int(PLANNED_EVENT_UNTIL - now)) if (active and PLANNED_EVENT_UNTIL) else 0
    return {
        "is_active": active,
        "remaining_seconds": rem,
        "reason": PLANNED_EVENT_REASON if active else "",
    }


def update_endpoint_baseline(
    endpoint_id: int,
    payload_size: int,
    hour_of_day: int,
) -> None:
    """Incrementally updates running statistical baselines for an endpoint."""
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM baselines WHERE endpoint_id = ?", (endpoint_id,))
    row = cursor.fetchone()

    if row:
        hourly = json.loads(row["hourly_profile_json"] or "{}")
        hourly[str(hour_of_day)] = hourly.get(str(hour_of_day), 0) + 1

        old_avg_size = row["avg_payload_size"] or 0.0
        # Exponential moving average with alpha=0.1
        new_avg_size = (0.9 * old_avg_size) + (0.1 * payload_size)

        cursor.execute("""
        UPDATE baselines
        SET avg_payload_size = ?, hourly_profile_json = ?, confidence = MIN(1.0, confidence + 0.01), updated_at = ?
        WHERE endpoint_id = ?
        """, (round(new_avg_size, 2), json.dumps(hourly), now, endpoint_id))
    else:
        hourly = {str(hour_of_day): 1}
        cursor.execute("""
        INSERT INTO baselines (endpoint_id, avg_rate, avg_payload_size, param_patterns_json, hourly_profile_json, confidence, updated_at)
        VALUES (?, 1.0, ?, '{}', ?, 0.1, ?)
        """, (endpoint_id, float(payload_size), json.dumps(hourly), now))

    conn.commit()
    conn.close()


def check_baseline_anomaly(
    endpoint_id: int,
    payload_size: int,
    hour_of_day: int,
) -> Dict[str, Any]:
    """
    Evaluates whether an incoming request deviates significantly from learned baselines.
    Returns anomaly flag, z-score, and confidence.
    """
    if is_planned_event_active():
        # During planned event, suppress baseline anomaly warnings
        return {"is_anomaly": False, "reason": "Suppressed (Planned Event Active)", "confidence": 0.0}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM baselines WHERE endpoint_id = ?", (endpoint_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or row["confidence"] < 0.2:
        return {"is_anomaly": False, "reason": "Baseline learning in progress", "confidence": row["confidence"] if row else 0.0}

    avg_size = row["avg_payload_size"] or 100.0
    # Approximate standard deviation proportional to mean
    std_dev = max(50.0, avg_size * 0.5)
    z_score = (payload_size - avg_size) / std_dev

    is_anomaly = z_score > 3.0  # More than 3 standard deviations larger than typical
    return {
        "is_anomaly": is_anomaly,
        "z_score": round(z_score, 2),
        "avg_payload_size": avg_size,
        "actual_payload_size": payload_size,
        "confidence": row["confidence"],
        "reason": f"Payload size {payload_size} bytes is {z_score:.1f} standard deviations above norm" if is_anomaly else "Normal",
    }


def reset_baseline(endpoint_id: Optional[int] = None) -> bool:
    """Resets learned baseline data for one or all endpoints."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if endpoint_id:
        cursor.execute("DELETE FROM baselines WHERE endpoint_id = ?", (endpoint_id,))
    else:
        cursor.execute("DELETE FROM baselines")
    conn.commit()
    conn.close()
    return True
