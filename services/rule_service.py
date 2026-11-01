"""
Custom Rule Builder & Evaluation Engine for AegisGate IDS.
Supports multi-condition matching (path, method, headers, query, regex, IP/CIDR,
risk score, attack type, time of day) with AND/OR/NOT logic, rule priority,
safe regex validation (catastrophic backtracking protection), hit counters,
versioning, and test evaluation.
"""
import time
import re
import json
import ipaddress
from typing import List, Dict, Any, Optional, Tuple
from database import get_db_connection
from services.audit_service import log_audit_event

# Catastrophic backtracking detection patterns (nested quantifiers like (a+)+ or (x*)* )
EVIL_REGEX_PATTERNS = [
    re.compile(r"(\([^\)]*[\+\*][^\)]*\)[\+\*])"),
    re.compile(r"(\([^\)]*\|[^\)]*\)[\+\*])"),
]


def validate_safe_regex(pattern_str: str) -> Tuple[bool, str]:
    """
    Validates regex syntax and detects common catastrophic backtracking (ReDoS) hazards.
    Returns (is_safe, error_message).
    """
    if not pattern_str:
        return True, ""
    try:
        # Check for nested quantifier anti-patterns
        for bad in EVIL_REGEX_PATTERNS:
            if bad.search(pattern_str):
                return False, "Catastrophic backtracking vulnerability detected in nested quantifiers (ReDoS hazard)."
        # Test compilation
        re.compile(pattern_str)
        return True, ""
    except re.error as e:
        return False, f"Invalid regex syntax: {str(e)}"


def evaluate_single_condition(condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Evaluates one individual condition against request context.
    Context keys: method, path, query, headers, client_ip, risk_score, attack_type, body.
    Condition structure:
      - field: 'path', 'method', 'query', 'header', 'body', 'ip', 'risk_score', 'attack_type', 'time_hour'
      - operator: 'equals', 'contains', 'regex', 'startswith', 'endswith', 'greater_than', 'less_than', 'in_cidr'
      - value: str or number
      - negate: bool
    """
    field = condition.get("field", "").lower()
    op = condition.get("operator", "equals").lower()
    expected = condition.get("value", "")
    negate = bool(condition.get("negate", False))

    actual = None
    if field == "path":
        actual = context.get("path", "")
    elif field == "method":
        actual = context.get("method", "").upper()
        expected = str(expected).upper()
    elif field == "query":
        actual = context.get("query", "")
    elif field == "body":
        actual = context.get("body", "")
    elif field == "ip":
        actual = context.get("client_ip", "")
    elif field == "risk_score":
        try:
            actual = float(context.get("risk_score", 0.0))
            expected = float(expected)
        except ValueError:
            actual, expected = 0.0, 0.0
    elif field == "attack_type":
        actual = context.get("attack_type", "")
    elif field == "time_hour":
        actual = time.localtime().tm_hour
        try:
            expected = int(expected)
        except ValueError:
            expected = -1
    elif field.startswith("header_") or field == "header":
        hdr_key = condition.get("header_name", "").lower()
        headers = context.get("headers", {})
        actual = headers.get(hdr_key, "")

    if actual is None:
        actual = ""

    matched = False
    if op == "equals":
        matched = str(actual).lower() == str(expected).lower()
    elif op == "contains":
        matched = str(expected).lower() in str(actual).lower()
    elif op == "startswith":
        matched = str(actual).lower().startswith(str(expected).lower())
    elif op == "endswith":
        matched = str(actual).lower().endswith(str(expected).lower())
    elif op == "greater_than":
        try:
            matched = float(actual) > float(expected)
        except (ValueError, TypeError):
            matched = False
    elif op == "less_than":
        try:
            matched = float(actual) < float(expected)
        except (ValueError, TypeError):
            matched = False
    elif op == "in_cidr":
        try:
            client_addr = ipaddress.ip_address(str(actual))
            net = ipaddress.ip_network(str(expected), strict=False)
            matched = client_addr in net
        except ValueError:
            matched = False
    elif op == "regex":
        try:
            is_safe, _ = validate_safe_regex(str(expected))
            if is_safe:
                matched = bool(re.search(str(expected), str(actual), re.IGNORECASE))
            else:
                matched = False
        except Exception:
            matched = False

    return not matched if negate else matched


def evaluate_rule(rule: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Evaluates rule conditions based on logic ('AND' or 'OR').
    """
    conditions_data = rule.get("conditions", {})
    if isinstance(conditions_data, str):
        try:
            conditions_data = json.loads(conditions_data)
        except Exception:
            conditions_data = {}

    logic = conditions_data.get("logic", "AND").upper()
    items = conditions_data.get("items", [])
    if not items:
        return False

    results = [evaluate_single_condition(cond, context) for cond in items]
    if logic == "OR":
        return any(results)
    return all(results)


def match_rules(context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Matches incoming request against active rules sorted by priority (lowest number = highest priority).
    Increments hit count on rule match and updates last_triggered.
    Returns the highest-priority matching rule or None.
    """
    now = time.time()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM rules
    WHERE enabled = 1 AND (expiry_date IS NULL OR expiry_date > ?)
    ORDER BY priority ASC, id ASC
    """, (now,))
    rules = [dict(r) for r in cursor.fetchall()]

    for rule in rules:
        if evaluate_rule(rule, context):
            # Increment hit count and update last_triggered
            cursor.execute("""
            UPDATE rules
            SET hit_count = hit_count + 1, last_triggered = ?
            WHERE id = ?
            """, (now, rule["id"]))
            conn.commit()
            conn.close()
            return rule

    conn.close()
    return None


def create_rule(
    name: str,
    description: str,
    priority: int,
    action: str,
    conditions: Dict[str, Any],
    expiry_date: Optional[float] = None,
    created_by: str = "admin",
) -> Dict[str, Any]:
    """Creates a new rule with validation and records version 1."""
    # Validate any regex conditions
    for item in conditions.get("items", []):
        if item.get("operator") == "regex":
            is_safe, err = validate_safe_regex(item.get("value", ""))
            if not is_safe:
                raise ValueError(err)

    now = time.time()
    conditions_json = json.dumps(conditions)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO rules (name, description, priority, enabled, conditions_json, action, hit_count, last_triggered, expiry_date, created_at)
    VALUES (?, ?, ?, 1, ?, ?, 0, NULL, ?, ?)
    """, (name, description, priority, conditions_json, action.upper(), expiry_date, now))

    rule_id = cursor.lastrowid

    # Create initial version 1
    cursor.execute("""
    INSERT INTO rule_versions (rule_id, version, rule_data_json, created_at)
    VALUES (?, 1, ?, ?)
    """, (rule_id, conditions_json, now))

    conn.commit()
    conn.close()

    log_audit_event(
        actor=created_by,
        action="CREATE_RULE",
        target=f"rule:{rule_id}:{name}",
        details={"action": action, "priority": priority},
    )

    return {
        "id": rule_id,
        "name": name,
        "description": description,
        "priority": priority,
        "action": action.upper(),
        "enabled": True,
        "conditions": conditions,
        "created_at": now,
    }


def update_rule(
    rule_id: int,
    name: str,
    description: str,
    priority: int,
    action: str,
    conditions: Dict[str, Any],
    enabled: bool = True,
    expiry_date: Optional[float] = None,
    updated_by: str = "admin",
) -> Dict[str, Any]:
    """Updates an existing rule and increments version history."""
    for item in conditions.get("items", []):
        if item.get("operator") == "regex":
            is_safe, err = validate_safe_regex(item.get("value", ""))
            if not is_safe:
                raise ValueError(err)

    now = time.time()
    conditions_json = json.dumps(conditions)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE rules
    SET name = ?, description = ?, priority = ?, enabled = ?, conditions_json = ?, action = ?, expiry_date = ?
    WHERE id = ?
    """, (name, description, priority, 1 if enabled else 0, conditions_json, action.upper(), expiry_date, rule_id))

    # Version tracking
    cursor.execute("SELECT MAX(version) FROM rule_versions WHERE rule_id = ?", (rule_id,))
    max_v = cursor.fetchone()[0] or 0
    next_v = max_v + 1

    cursor.execute("""
    INSERT INTO rule_versions (rule_id, version, rule_data_json, created_at)
    VALUES (?, ?, ?, ?)
    """, (rule_id, next_v, conditions_json, now))

    conn.commit()
    conn.close()

    log_audit_event(
        actor=updated_by,
        action="UPDATE_RULE",
        target=f"rule:{rule_id}:{name}",
        details={"version": next_v, "action": action, "enabled": enabled},
    )

    return {"status": "updated", "id": rule_id, "version": next_v}


def toggle_rule(rule_id: int, enabled: bool, actor: str = "admin") -> bool:
    """Quick enable/disable toggle for a rule."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE rules SET enabled = ? WHERE id = ?", (1 if enabled else 0, rule_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()

    if success:
        log_audit_event(
            actor=actor,
            action="TOGGLE_RULE",
            target=f"rule:{rule_id}",
            details={"enabled": enabled},
        )
    return success


def delete_rule(rule_id: int, actor: str = "admin") -> bool:
    """Deletes a rule and its versions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
    deleted = cursor.rowcount > 0
    cursor.execute("DELETE FROM rule_versions WHERE rule_id = ?", (rule_id,))
    conn.commit()
    conn.close()

    if deleted:
        log_audit_event(actor=actor, action="DELETE_RULE", target=f"rule:{rule_id}")
    return deleted


def list_rules() -> List[Dict[str, Any]]:
    """Lists all configured rules with parsed conditions and stats."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules ORDER BY priority ASC, id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    for r in rows:
        try:
            r["conditions"] = json.loads(r["conditions_json"])
        except Exception:
            r["conditions"] = {}
        r["enabled"] = bool(r["enabled"])
    return rows


def evaluate_test_request(test_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Test sandbox: simulates matching a raw request against all active rules.
    Returns matched rule (if any) and per-rule evaluation diagnostic breakdown.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE enabled = 1 ORDER BY priority ASC, id ASC")
    rules = [dict(r) for r in cursor.fetchall()]
    conn.close()

    evaluation_report = []
    matched_rule = None

    for r in rules:
        try:
            r["conditions"] = json.loads(r["conditions_json"])
        except Exception:
            r["conditions"] = {}

        is_match = evaluate_rule(r, test_payload)
        evaluation_report.append({
            "rule_id": r["id"],
            "name": r["name"],
            "priority": r["priority"],
            "action": r["action"],
            "matched": is_match,
        })
        if is_match and matched_rule is None:
            matched_rule = {
                "id": r["id"],
                "name": r["name"],
                "action": r["action"],
                "priority": r["priority"],
            }

    return {
        "matched": matched_rule is not None,
        "matched_rule": matched_rule,
        "rules_evaluated": len(rules),
        "report": evaluation_report,
    }
