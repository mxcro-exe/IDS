"""
Test Suite for AegisGate Advanced Feature Pack.
Validates:
1. Security Health Score & Deductions API
2. Plain-Language Explainer (English + Tamil) API
3. Incident Management & Kill-Chain Correlation
4. Attacker Profile Forensic Intelligence
5. Custom Rule Engine & Safe ReDoS Detection
6. Unified IP / CIDR Ban & Allowlist
7. Tamper-Evident SHA-256 Audit Log Hash Chain
8. Discovered Endpoints & Schema Import
9. JWT Authentication & RBAC
10. Incident PDF Report Generation
"""
import pytest
from fastapi.testclient import TestClient

from app import app
from database import init_db
from services.audit_service import verify_audit_integrity, log_audit_event
from services.rule_service import validate_safe_regex, evaluate_test_request
from services.ban_service import is_ip_in_network
from reports import generate_incident_pdf_report

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    init_db()


def test_health_score_api():
    resp = client.get("/api/health-score")
    assert resp.status_code == 200
    data = resp.json()
    assert "score" in data
    assert "grade" in data
    assert 0 <= data["score"] <= 100
    assert data["grade"] in ["A", "B", "C", "D", "F"]
    assert "trend_7d" in data
    assert isinstance(data["deductions"], list)


def test_explainer_api():
    # Fetch first alert
    alerts_resp = client.get("/api/alerts")
    alerts = alerts_resp.json().get("alerts", [])
    if alerts:
        alert_id = alerts[0]["id"]
        resp = client.get(f"/api/explainer/{alert_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "explanation" in data
        assert "explanation_en" in data["explanation"]
        assert "explanation_ta" in data["explanation"]
        assert "what_to_do_en" in data["explanation"]
        assert data["explanation"]["severity"] in ["Low", "Medium", "High", "Critical"]


def test_incidents_api():
    resp = client.get("/api/incidents")
    assert resp.status_code == 200
    data = resp.json()
    assert "incidents" in data
    assert len(data["incidents"]) > 0

    inc_id = data["incidents"][0]["id"]
    detail_resp = client.get(f"/api/incidents/{inc_id}")
    assert detail_resp.status_code == 200
    inc_data = detail_resp.json()
    assert "events" in inc_data
    assert "story_summary" in inc_data


def test_attacker_profile_api():
    resp = client.get("/api/attackers/10.0.4.22")
    assert resp.status_code == 200
    data = resp.json()
    assert data["client_ip"] == "10.0.4.22"
    assert "geoip" in data
    assert "reputation_score" in data
    assert 0 <= data["reputation_score"] <= 100
    assert "risk_trend" in data


def test_rule_engine_and_redos_prevention():
    # 1. Catastrophic backtracking check
    is_safe, err = validate_safe_regex(r"(a+)+$")
    assert is_safe is False
    assert "backtracking" in err.lower() or "redos" in err.lower()

    # 2. Safe regex
    is_safe, err = validate_safe_regex(r"^/api/v1/users/\d+$")
    assert is_safe is True

    # 3. Test sandbox rule matching
    test_res = client.post("/api/rules/test", json={
        "method": "GET",
        "path": "/admin/sensitive",
        "query": "",
        "client_ip": "10.0.0.1",
    })
    assert test_res.status_code == 200
    data = test_res.json()
    assert "matched" in data
    assert "report" in data


def test_cidr_and_ban_service():
    assert is_ip_in_network("192.168.1.55", "192.168.1.0/24") is True
    assert is_ip_in_network("10.0.1.1", "192.168.1.0/24") is False
    assert is_ip_in_network("10.0.4.22", "10.0.4.22") is True


def test_tamper_evident_audit_chain():
    # Append test event
    log_audit_event(actor="test_runner", action="UNIT_TEST", target="test_target")
    verify_res = verify_audit_integrity()
    assert verify_res["valid"] is True
    assert verify_res["count"] > 0


def test_discovered_endpoints_api():
    resp = client.get("/api/endpoints")
    assert resp.status_code == 200
    data = resp.json()
    assert "endpoints" in data
    assert len(data["endpoints"]) > 0


def test_jwt_auth_login():
    resp = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "adminpassword123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "authenticated"
    assert "access_token" in data
    assert data["role"] == "admin"


def test_incident_pdf_generation():
    pdf_path = generate_incident_pdf_report(1)
    assert pdf_path.endswith(".pdf")
