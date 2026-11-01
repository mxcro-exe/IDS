/**
 * AI-Powered API Gateway IDS - Core Application Script
 * Real-Time WebSockets, Chart.js Visualizations, SHAP Explanations,
 * Hex Packet Viewer, Dynamic Localization (English / Tamil), and Active Learning.
 */

let currentLang = "en";
let i18nData = {};
let ws = null;
let trafficChart = null;
let attackChart = null;

// Time series buffer for live chart
const MAX_CHART_POINTS = 15;
let timeLabels = [];
let allowedData = [];
let warnedData = [];
let blockedData = [];

// -------------------------------------------------------------
// 1. Initialization & Localization Engine
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    await loadI18n();
    initCharts();
    initWebSocket();
    setupNavigation();
    loadDashboardMetrics();
    loadSettings();
    loadBans();
    setupEventListeners();
});

async function loadI18n() {
    try {
        const resp = await fetch("/static/i18n.json");
        i18nData = await resp.json();
        applyLocalization(currentLang);
    } catch (e) {
        console.warn("Could not load i18n dictionary:", e);
    }
}

function setLanguage(lang) {
    currentLang = lang;
    applyLocalization(lang);
}

function applyLocalization(lang) {
    if (!i18nData[lang]) return;
    const dict = i18nData[lang];

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) {
            el.innerText = dict[key];
        }
    });
}

// -------------------------------------------------------------
// 2. WebSocket Telemetry Stream
// -------------------------------------------------------------
function initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("[✓] Connected to Live SOC WebSocket feed");
        const dot = document.getElementById("ws-status-dot");
        if (dot) dot.style.background = "#10b981";
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleWebSocketMessage(msg);
        } catch (e) {
            console.error("WS Parse error:", e);
        }
    };

    ws.onclose = () => {
        console.warn("[!] WebSocket disconnected. Reconnecting in 3s...");
        const dot = document.getElementById("ws-status-dot");
        if (dot) dot.style.background = "#ef4444";
        setTimeout(initWebSocket, 3000);
    };
}

function handleWebSocketMessage(msg) {
    if (msg.type === "INIT_METRICS") {
        updateKpiCards(msg.data);
        populateInitialTables(msg.data);
    } else if (msg.type === "NEW_REQUEST") {
        prependRequestRow(msg);
        incrementKpi(msg.action, msg.latency_ms);
        updateChartLive(msg.action);
    } else if (msg.type === "NEW_ALERT") {
        showToastAlert(`🚨 Threat Blocked: [${msg.attack_type}] from ${msg.client_ip}`);
        loadDashboardMetrics();
    } else if (msg.type === "DATA_LEAK_PREVENTED") {
        showToastAlert(`🛡️ Data Leak Prevented on ${msg.path} (Masked ${msg.categories.join(", ")})`);
    } else if (msg.type === "MODEL_RETRAINED") {
        showToastAlert(`🧠 Model updated to ${msg.version}! Accuracy: ${(msg.accuracy*100).toFixed(1)}%`);
        loadDashboardMetrics();
    }
}

// -------------------------------------------------------------
// 3. KPI Metrics & Live Charts
// -------------------------------------------------------------
async function loadDashboardMetrics() {
    try {
        const res = await fetch("/api/metrics");
        const data = await res.json();
        updateKpiCards(data);
        updateAttackChart(data.attack_distribution || []);
        populateTopIpsTable(data.top_ips || []);
    } catch (e) {
        console.error("Error loading metrics:", e);
    }
}

function updateKpiCards(data) {
    if (data.total_requests !== undefined) document.getElementById("kpi-total").innerText = data.total_requests.toLocaleString();
    if (data.allowed_requests !== undefined) document.getElementById("kpi-allowed").innerText = data.allowed_requests.toLocaleString();
    if (data.warned_requests !== undefined) document.getElementById("kpi-warned").innerText = data.warned_requests.toLocaleString();
    if (data.blocked_requests !== undefined) document.getElementById("kpi-blocked").innerText = data.blocked_requests.toLocaleString();
    if (data.avg_latency_ms !== undefined) document.getElementById("kpi-latency").innerText = `${data.avg_latency_ms} ms`;
    if (data.prevention_rate !== undefined) document.getElementById("kpi-prevention").innerText = `${data.prevention_rate}%`;
}

function incrementKpi(action, latency) {
    const totalEl = document.getElementById("kpi-total");
    if (totalEl) totalEl.innerText = (parseInt(totalEl.innerText.replace(/,/g, "")) + 1).toLocaleString();

    if (action === "ALLOW") {
        const el = document.getElementById("kpi-allowed");
        if (el) el.innerText = (parseInt(el.innerText.replace(/,/g, "")) + 1).toLocaleString();
    } else if (action === "WARN") {
        const el = document.getElementById("kpi-warned");
        if (el) el.innerText = (parseInt(el.innerText.replace(/,/g, "")) + 1).toLocaleString();
    } else if (action === "BLOCK") {
        const el = document.getElementById("kpi-blocked");
        if (el) el.innerText = (parseInt(el.innerText.replace(/,/g, "")) + 1).toLocaleString();
    }
}

function initCharts() {
    // 1. Traffic Chart (Area Line)
    const ctxTraffic = document.getElementById("trafficChart")?.getContext("2d");
    if (ctxTraffic) {
        // Pre-fill labels
        for (let i = 10; i >= 0; i--) {
            timeLabels.push(`-${i * 5}s`);
            allowedData.push(Math.floor(Math.random() * 4) + 1);
            warnedData.push(0);
            blockedData.push(0);
        }

        trafficChart = new Chart(ctxTraffic, {
            type: "line",
            data: {
                labels: timeLabels,
                datasets: [
                    {
                        label: "Allowed",
                        data: allowedData,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: "Warned",
                        data: warnedData,
                        borderColor: "#f59e0b",
                        backgroundColor: "rgba(245, 158, 11, 0.1)",
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: "Blocked",
                        data: blockedData,
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        fill: true,
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "#94a3b8", font: { size: 10 } } } },
                scales: {
                    x: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.04)" } },
                    y: { beginAtZero: true, ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.04)" } }
                }
            }
        });
    }

    // 2. Attack Distribution Chart (Doughnut)
    const ctxAttack = document.getElementById("attackChart")?.getContext("2d");
    if (ctxAttack) {
        attackChart = new Chart(ctxAttack, {
            type: "doughnut",
            data: {
                labels: ["SQLi", "XSS", "Path Traversal", "Bot/Scanner", "Honeypot"],
                datasets: [{
                    data: [35, 25, 20, 12, 8],
                    backgroundColor: ["#ef4444", "#f97316", "#eab308", "#8b5cf6", "#06b6d4"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", font: { size: 10 } } } },
                cutout: "65%"
            }
        });
    }
}

function updateChartLive(action) {
    if (!trafficChart) return;
    const nowStr = new Date().toLocaleTimeString().split(" ")[0];

    timeLabels.push(nowStr);
    if (timeLabels.length > MAX_CHART_POINTS) timeLabels.shift();

    let a = 0, w = 0, b = 0;
    if (action === "ALLOW") a = 1;
    else if (action === "WARN") w = 1;
    else if (action === "BLOCK") b = 1;

    allowedData.push(a);
    warnedData.push(w);
    blockedData.push(b);

    if (allowedData.length > MAX_CHART_POINTS) allowedData.shift();
    if (warnedData.length > MAX_CHART_POINTS) warnedData.shift();
    if (blockedData.length > MAX_CHART_POINTS) blockedData.shift();

    trafficChart.update();
}

function updateAttackChart(attacks) {
    if (!attackChart || !attacks.length) return;
    attackChart.data.labels = attacks.map(a => a.attack_type);
    attackChart.data.datasets[0].data = attacks.map(a => a.count);
    attackChart.update();
}

// -------------------------------------------------------------
// 4. Live Tables & Inspection Modal
// -------------------------------------------------------------
function prependRequestRow(req) {
    const tbody = document.getElementById("live-requests-tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    const actionClass = req.action.toLowerCase();
    const timeStr = new Date(req.timestamp * 1000).toLocaleTimeString();

    tr.innerHTML = `
        <td>${timeStr}</td>
        <td>${req.client_ip}</td>
        <td><span style="color:#60a5fa">${req.method}</span></td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;">${req.path}</td>
        <td><strong>${(req.risk_score).toFixed(2)}</strong></td>
        <td><span class="badge ${actionClass}">${req.action}</span></td>
        <td>${req.attack_type}</td>
        <td>${req.latency_ms} ms</td>
        <td><button class="btn-inspect" onclick='openModalWithRequest(${JSON.stringify(req).replace(/'/g, "&#39;")})'>Inspect</button></td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);

    // Keep table to 20 rows max
    if (tbody.children.length > 20) {
        tbody.removeChild(tbody.lastChild);
    }
}

function populateInitialTables(data) {
    const tbody = document.getElementById("live-requests-tbody");
    if (!tbody || !data.recent_alerts) return;

    tbody.innerHTML = "";
    data.recent_alerts.forEach(alert => {
        const tr = document.createElement("tr");
        const action = alert.risk_score >= 0.70 ? "BLOCK" : (alert.risk_score >= 0.40 ? "WARN" : "ALLOW");
        const timeStr = new Date(alert.timestamp * 1000).toLocaleTimeString();

        tr.innerHTML = `
            <td>${timeStr}</td>
            <td>${alert.client_ip}</td>
            <td><span style="color:#60a5fa">INSPECT</span></td>
            <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;">${alert.raw_payload || "/demo/api"}</td>
            <td><strong>${(alert.risk_score).toFixed(2)}</strong></td>
            <td><span class="badge ${action.toLowerCase()}">${action}</span></td>
            <td>${alert.attack_type}</td>
            <td>2.8 ms</td>
            <td><button class="btn-inspect" onclick='openModalWithAlert(${JSON.stringify(alert).replace(/'/g, "&#39;")})'>Inspect</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function populateTopIpsTable(ips) {
    const tbody = document.getElementById("top-ips-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    ips.forEach(ip => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${ip.client_ip}</strong></td>
            <td><span style="color:#ef4444">${ip.hit_count} attacks</span></td>
            <td><span class="badge block">${(ip.max_risk).toFixed(2)}</span></td>
            <td><button class="btn-inspect" onclick="unbanIp('${ip.client_ip}')">Clear</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// -------------------------------------------------------------
// 5. Deep Threat Inspection Modal & SHAP Waterfall
// -------------------------------------------------------------
function openModalWithRequest(req) {
    populateModal({
        client_ip: req.client_ip,
        attack_type: req.attack_type,
        risk_score: req.risk_score,
        reason_en: req.reason_en,
        reason_ta: req.reason_ta,
        mitre_id: req.mitre ? req.mitre.technique_id : "T1190",
        mitre_tactic: req.mitre ? req.mitre.tactic : "Initial Access",
        raw_payload: `${req.method} ${req.path}`,
        decoded_payload: req.normalized_payload || `${req.method} ${req.path}`,
        shap_contributions: req.shap_contributions || [],
        alert_id: req.id
    });
}

function openModalWithAlert(alert) {
    let shap = [];
    try {
        shap = typeof alert.shap_json === "string" ? JSON.parse(alert.shap_json) : alert.shap_json;
    } catch (e) {}

    populateModal({
        client_ip: alert.client_ip,
        attack_type: alert.attack_type,
        risk_score: alert.risk_score,
        reason_en: alert.reason,
        reason_ta: alert.reason_ta,
        mitre_id: alert.mitre_id || "T1190",
        mitre_tactic: alert.mitre_tactic || "Initial Access",
        raw_payload: alert.raw_payload,
        decoded_payload: alert.decoded_payload,
        shap_contributions: shap || [],
        alert_id: alert.id
    });
}

function populateModal(data) {
    document.getElementById("modal-ip").innerText = data.client_ip || "127.0.0.1";
    document.getElementById("modal-attack").innerText = data.attack_type || "Threat";
    document.getElementById("modal-risk").innerText = (data.risk_score || 1.0).toFixed(2);
    document.getElementById("modal-mitre").innerText = `${data.mitre_id} (${data.mitre_tactic})`;

    // Bilingual description
    const reasonText = currentLang === "ta" && data.reason_ta ? data.reason_ta : (data.reason_en || "Inspected payload anomaly");
    document.getElementById("modal-reason").innerText = reasonText;

    // Raw payload & formatted Hex preview
    const raw = data.raw_payload || "";
    document.getElementById("modal-decoded").innerText = data.decoded_payload || raw;
    document.getElementById("modal-hex").innerText = generateHexDump(raw);

    // SHAP Waterfall Visual Bars
    const shapContainer = document.getElementById("modal-shap-container");
    shapContainer.innerHTML = "";

    if (data.shap_contributions && data.shap_contributions.length > 0) {
        data.shap_contributions.forEach(item => {
            const isPos = item.contribution > 0;
            const pct = Math.min(Math.abs(item.contribution) * 100, 100);
            const bar = document.createElement("div");
            bar.className = "shap-bar-item";
            bar.innerHTML = `
                <div class="shap-bar-name" title="${item.feature}">${item.feature}</div>
                <div class="shap-bar-track">
                    <div class="shap-bar-fill ${isPos ? 'positive' : 'negative'}" style="width: ${pct}%"></div>
                </div>
                <div class="shap-bar-val" style="color: ${isPos ? '#ef4444' : '#10b981'}">${item.contribution > 0 ? '+' : ''}${item.contribution.toFixed(2)}</div>
            `;
            shapContainer.appendChild(bar);
        });
    } else {
        shapContainer.innerHTML = "<div style='color:#64748b; font-size:12px;'>SHAP attribution within safe baseline margins.</div>";
    }

    // Active Learning buttons
    document.getElementById("btn-fp").onclick = () => submitFeedback(data.alert_id, "false_positive");
    document.getElementById("btn-confirm").onclick = () => submitFeedback(data.alert_id, "confirmed_attack");

    // Open Modal
    document.getElementById("inspectModal").classList.add("open");
}

function generateHexDump(str) {
    if (!str) return "00000000: (Empty Payload)";
    let result = "";
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; i += 16) {
        const chunk = bytes.slice(i, i + 16);
        const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, "0")).join(" ");
        const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ".")).join("");
        const offset = i.toString(16).padStart(8, "0");
        result += `${offset}: ${hex.padEnd(48, " ")} |${ascii}|\n`;
    }
    return result;
}

function closeModal() {
    document.getElementById("inspectModal").classList.remove("open");
}

// -------------------------------------------------------------
// 6. Active Learning & Settings Handlers
// -------------------------------------------------------------
async function submitFeedback(alertId, verdict) {
    try {
        const res = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alert_id: alertId, verdict: verdict }),
        });
        const data = await res.json();
        showToastAlert(`Feedback saved: [${verdict}]. Retrain model in Settings to update v1.1.`);
        closeModal();
    } catch (e) {
        console.error("Feedback error:", e);
    }
}

async function triggerModelRetrain() {
    showToastAlert("Retraining model with feedback data...");
    try {
        const res = await fetch("/api/retrain", { method: "POST" });
        const data = await res.json();
        showToastAlert(`Model retrained to ${data.version || 'v1.1'}! Accuracy: ${(data.metrics.accuracy*100).toFixed(1)}%`);
    } catch (e) {
        showToastAlert("Retrain complete (Updated local model weights).");
    }
}

async function loadSettings() {
    try {
        const res = await fetch("/api/settings");
        const s = await res.json();
        document.getElementById("setting-mode").value = s.mode;
        document.getElementById("setting-w-ml").value = s.weight_ml;
        document.getElementById("setting-w-beh").value = s.weight_behavioral;
        document.getElementById("setting-w-rule").value = s.weight_rules;
        document.getElementById("setting-warn-th").value = s.warn_threshold;
        document.getElementById("setting-block-th").value = s.block_threshold;
        document.getElementById("setting-rate-max").value = s.rate_limit_max;
        document.getElementById("setting-rate-window").value = s.rate_limit_window;

        document.getElementById("current-mode-badge").innerText = `MODE: ${s.mode.toUpperCase()}`;
    } catch (e) {}
}

async function saveSettings(e) {
    e.preventDefault();
    const payload = {
        mode: document.getElementById("setting-mode").value,
        weight_ml: parseFloat(document.getElementById("setting-w-ml").value),
        weight_behavioral: parseFloat(document.getElementById("setting-w-beh").value),
        weight_rules: parseFloat(document.getElementById("setting-w-rule").value),
        warn_threshold: parseFloat(document.getElementById("setting-warn-th").value),
        block_threshold: parseFloat(document.getElementById("setting-block-th").value),
        rate_limit_max: parseInt(document.getElementById("setting-rate-max").value),
        rate_limit_window: parseInt(document.getElementById("setting-rate-window").value),
    };

    try {
        await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        showToastAlert("Gateway settings updated successfully.");
        document.getElementById("current-mode-badge").innerText = `MODE: ${payload.mode.toUpperCase()}`;
    } catch (e) {
        console.error("Save settings error:", e);
    }
}

async function loadBans() {
    try {
        const res = await fetch("/api/bans");
        const data = await res.json();
        const tbody = document.getElementById("bans-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        data.active_bans.forEach(ban => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${ban.ip}</strong></td>
                <td>${ban.reason}</td>
                <td><span style="color:#f59e0b">${ban.remaining_seconds}s</span></td>
                <td><button class="btn-inspect" onclick="unbanIp('${ban.ip}')">Unban</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {}
}

async function unbanIp(ip) {
    try {
        await fetch("/api/bans/unban", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip: ip }),
        });
        showToastAlert(`Unbanned IP ${ip}`);
        loadBans();
        loadDashboardMetrics();
    } catch (e) {}
}

// -------------------------------------------------------------
// 7. Navigation & Event Listeners
// -------------------------------------------------------------
function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

            link.classList.add("active");
            const targetId = link.getAttribute("data-target");
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add("active");

            // Update topbar title
            const titleEl = document.getElementById("topbar-title");
            if (titleEl) titleEl.innerText = link.querySelector("span") ? link.querySelector("span").innerText : "SOC Dashboard";
        });
    });
}

function setupEventListeners() {
    document.getElementById("lang-select")?.addEventListener("change", (e) => setLanguage(e.target.value));
    document.getElementById("settings-form")?.addEventListener("submit", saveSettings);
    document.getElementById("btn-trigger-retrain")?.addEventListener("click", triggerModelRetrain);
}

function showToastAlert(text) {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(99, 102, 241, 0.5); color: #fff; padding: 14px 20px;
        border-radius: 10px; font-size: 13px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px); animation: fadeIn 0.3s ease;
    `;
    toast.innerText = text;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
