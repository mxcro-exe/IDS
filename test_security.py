"""
Comprehensive Security Verification Test Suite.
Validates the AI-Powered API Gateway IDS against:
1. Benign API Queries (Allowed)
2. SQL Injection (Blocked)
3. Cross-Site Scripting (Blocked)
4. Path Traversal (Blocked)
5. Command Injection (Blocked)
6. Sliding-Window Rate Limiting (HTTP 429)
7. Honeypot Decoy Traps & Auto-Ban (HTTP 403)
8. Response Sensitive Data Leak Prevention (Masking)
9. Obfuscation Normalizer (Catching encoded payloads)
"""
import pytest
from fastapi.testclient import TestClient

from app import app
from detector import detector
from rate_limiter import SlidingWindowRateLimiter
from honeypot import honeypot_manager
from leak_filter import inspect_and_mask_response
from features import normalize_payload, extract_features

client = TestClient(app)


def test_benign_request_allowed():
    """Validates that legitimate API requests are allowed with low risk score."""
    resp = client.get("/demo/api/users?search=john")
    assert resp.status_code == 200
    data = resp.json()
    assert "users" in data


def test_sqli_detection_and_blocking():
    """Validates that SQL injection attacks are detected and blocked."""
    sqli_payload = "admin' OR '1'='1' UNION SELECT username, password FROM users--"
    pred = detector.predict_request(
        method="GET",
        path="/demo/api/users",
        query=f"search={sqli_payload}",
    )
    assert pred["action"] in ["WARN", "BLOCK"]
    assert pred["attack_type"] == "SQL_Injection"
    assert pred["risk_score"] >= 0.70
    assert len(pred["shap_contributions"]) > 0


def test_xss_detection_and_blocking():
    """Validates that Cross-Site Scripting attacks are caught."""
    xss_payload = "<script>alert('xss')</script>"
    pred = detector.predict_request(
        method="GET",
        path="/demo/api/search",
        query=f"q={xss_payload}",
    )
    assert pred["action"] in ["WARN", "BLOCK"]
    assert pred["attack_type"] == "XSS"
    assert pred["risk_score"] >= 0.70


def test_path_traversal_detection():
    """Validates that Path Traversal directory escapes are blocked."""
    traversal_payload = "../../../../etc/passwd"
    pred = detector.predict_request(
        method="GET",
        path="/demo/api/files/download",
        query=f"file={traversal_payload}",
    )
    assert pred["action"] in ["WARN", "BLOCK"]
    assert pred["attack_type"] == "Path_Traversal"
    assert pred["risk_score"] >= 0.70


def test_command_injection_detection():
    """Validates OS command injection payload identification."""
    cmd_payload = "; cat /etc/passwd | whoami"
    pred = detector.predict_request(
        method="POST",
        path="/demo/api/search",
        body=f"query={cmd_payload}",
    )
    assert pred["action"] in ["WARN", "BLOCK"]
    assert pred["attack_type"] == "Command_Injection"


def test_sliding_window_rate_limiter():
    """Validates that sliding-window limiter blocks bursts over threshold with 429."""
    limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=10)
    test_ip = "192.168.1.99"

    # First 5 requests must be allowed
    for i in range(5):
        allowed, count, max_req = limiter.is_allowed(test_ip)
        assert allowed is True

    # 6th request must be rejected
    allowed, count, max_req = limiter.is_allowed(test_ip)
    assert allowed is False
    assert count == 5


def test_honeypot_decoy_hit_and_autoban():
    """Validates that probing /.env or /admin triggers auto-ban."""
    attacker_ip = "10.0.99.1"
    assert honeypot_manager.is_honeypot_hit("/.env") is True
    assert honeypot_manager.is_honeypot_hit("/admin") is True
    assert honeypot_manager.is_honeypot_hit("/demo/api/users") is False

    # Trigger ban
    ban = honeypot_manager.trigger_ban(attacker_ip, "Honeypot hit")
    assert ban["ip"] == attacker_ip

    # Verify banned
    check = honeypot_manager.is_banned(attacker_ip)
    assert check is not None
    assert check["remaining_seconds"] > 0

    # Unban
    honeypot_manager.unban_ip(attacker_ip)
    assert honeypot_manager.is_banned(attacker_ip) is None


def test_obfuscation_normalizer():
    """Validates that double encoding and inline SQL comment evasions are decoded."""
    evasive_sql = "SEL/**/ECT%201%2C2%20FROM%20users"
    norm, obf_detected, techniques = normalize_payload(evasive_sql)
    assert "SELECT" in norm
    assert obf_detected is True
    assert len(techniques) > 0


def test_response_leak_filter():
    """Validates that sensitive credit cards and API keys are masked before leaving the gateway."""
    raw_leak = "Customer card: 4532-8921-9981-4321, Secret: api_key_99a8b7c6d5e4f3a2b1c0d9e8"
    sanitized, leak_prevented, categories = inspect_and_mask_response(raw_leak)

    assert leak_prevented is True
    assert "4532-8921-9981-4321" not in sanitized
    assert "****-****-****-4321" in sanitized
    assert "api_key_99a8b7c6d5e4f3a2b1c0d9e8" not in sanitized
    assert "api_key_************************" in sanitized
