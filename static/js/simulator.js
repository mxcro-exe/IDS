/**
 * AI-Powered API Gateway IDS - Attack Simulator & AI vs WAF Face-Off Runner
 */

document.addEventListener("DOMContentLoaded", () => {
    setupSimulatorButtons();
    setupWafFaceoff();
});

function setupSimulatorButtons() {
    document.querySelectorAll("[data-scenario]").forEach(btn => {
        btn.addEventListener("click", async () => {
            const scenario = btn.getAttribute("data-scenario");
            await runScenario(scenario);
        });
    });
}

async function runScenario(scenario) {
    const consoleEl = document.getElementById("simulator-console");
    if (consoleEl) {
        consoleEl.innerHTML = `<span style="color:#60a5fa">> Dispatching scenario [${scenario}] against local Gateway IDS...</span>`;
    }

    try {
        const res = await fetch("/api/simulator/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: scenario, client_ip: "192.168.1.150" }),
        });
        const data = await res.json();
        renderSimulatorOutput(data);
    } catch (e) {
        if (consoleEl) consoleEl.innerHTML = `<span style="color:#ef4444">> Error sending test traffic: ${e.message}</span>`;
    }
}

function renderSimulatorOutput(data) {
    const consoleEl = document.getElementById("simulator-console");
    if (!consoleEl) return;

    if (data.burst_sent) {
        consoleEl.innerHTML = `
<span style="color:#f59e0b">> [BURST ATTACK COMPLETED]</span>
> Total Requests Fired: ${data.burst_sent}
> Final Gateway Response: HTTP ${data.final_response.status_code} (${data.final_response.action})
> Classification: ${data.final_response.attack_type}
> Message: ${data.final_response.message || 'Rate limit triggered'}
        `;
        return;
    }

    const res = data.result || {};
    const actionColor = res.action === "BLOCK" ? "#ef4444" : (res.action === "WARN" ? "#f59e0b" : "#10b981");

    consoleEl.innerHTML = `
<span style="color:#38bdf8">> [SCENARIO RESULT: ${data.scenario.toUpperCase()}]</span>
> Gateway Action: <span style="color:${actionColor}; font-weight:700;">${res.action}</span> (HTTP ${res.status_code})
> Risk Score: ${(res.risk_score || 0).toFixed(2)} | Confidence: ${((res.confidence || 0) * 100).toFixed(1)}%
> Classification: ${res.attack_type} [MITRE: ${res.mitre ? res.mitre.technique_id : 'N/A'}]
> Latency Overhead: ${res.latency_ms} ms
> Explainability Rationale: ${res.reason_en || res.message || 'Clean'}
    `;
}

// -------------------------------------------------------------
// AI vs Traditional Regex WAF Face-Off Benchmark
// -------------------------------------------------------------
function setupWafFaceoff() {
    const btn = document.getElementById("btn-run-faceoff");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const payload = document.getElementById("faceoff-payload").value.trim();
        if (!payload) return;

        btn.innerText = "Evaluating...";
        btn.disabled = true;

        try {
            const res = await fetch("/api/simulator/waf-faceoff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: payload }),
            });
            const data = await res.json();
            renderFaceoffResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            btn.innerText = "Run Face-Off Benchmark";
            btn.disabled = false;
        }
    });
}

function renderFaceoffResults(data) {
    const resultsContainer = document.getElementById("faceoff-results-container");
    if (!resultsContainer) return;
    resultsContainer.style.display = "flex";

    const trad = data.traditional_waf;
    const ai = data.ai_gateway;

    // Traditional WAF Card
    const tradEl = document.getElementById("faceoff-trad-result");
    const tradStatusColor = trad.caught ? "#10b981" : "#ef4444";
    tradEl.innerHTML = `
        <div style="font-size:16px; font-weight:700; color:${tradStatusColor}">${trad.action}</div>
        <p style="font-size:12px; color:#94a3b8; margin-top:6px;">${trad.explanation}</p>
        <div style="margin-top:10px; font-size:11px; color:#64748b;">Detection Engine: Static Regex Token Matching</div>
    `;

    // AI Gateway Card
    const aiEl = document.getElementById("faceoff-ai-result");
    const aiStatusColor = ai.caught ? "#10b981" : "#ef4444";
    aiEl.innerHTML = `
        <div style="font-size:16px; font-weight:700; color:${aiStatusColor}">${ai.action} (${ai.attack_type})</div>
        <p style="font-size:12px; color:#94a3b8; margin-top:6px;">Risk Score: ${(ai.risk_score).toFixed(2)} | Confidence: ${(ai.confidence * 100).toFixed(1)}%</p>
        <p style="font-size:11px; color:#cbd5e1; margin-top:4px;">${ai.shap_reason}</p>
        <div style="margin-top:10px; font-size:11px; color:#38bdf8;">
            Obfuscation Detected: ${ai.obfuscation_detected ? 'YES (' + ai.obfuscation_techniques.join(', ') + ')' : 'NO'}
        </div>
    `;

    // Banner Verdict
    const banner = document.getElementById("faceoff-verdict-banner");
    banner.innerText = `🏆 Verdict: ${data.verdict}`;
}
