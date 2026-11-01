/**
 * AI-Powered API Gateway IDS - Request Playground Script
 * Tests arbitrary payloads against the IDS pipeline without forwarding.
 */

document.addEventListener("DOMContentLoaded", () => {
    setupPlayground();
});

function setupPlayground() {
    const btn = document.getElementById("btn-playground-inspect");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const method = document.getElementById("pg-method").value;
        const path = document.getElementById("pg-path").value.trim() || "/api/users";
        const query = document.getElementById("pg-query").value.trim();
        const body = document.getElementById("pg-body").value.trim();

        btn.innerText = "Analyzing...";
        btn.disabled = true;

        try {
            const res = await fetch("/api/playground/inspect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    method: method,
                    path: path,
                    query: query,
                    body: body,
                    headers: { "user-agent": "Playground-Analyst-Tool/1.0" },
                }),
            });
            const data = await res.json();
            renderPlaygroundResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            btn.innerText = "Inspect Request";
            btn.disabled = false;
        }
    });
}

function renderPlaygroundResults(res) {
    const container = document.getElementById("pg-results");
    if (!container) return;
    container.style.display = "flex";

    const badgeClass = res.action.toLowerCase();
    document.getElementById("pg-action-badge").className = `badge ${badgeClass}`;
    document.getElementById("pg-action-badge").innerText = res.action;

    document.getElementById("pg-risk-score").innerText = (res.risk_score).toFixed(2);
    document.getElementById("pg-attack-type").innerText = res.attack_type;
    document.getElementById("pg-confidence").innerText = `${((res.confidence || 0) * 100).toFixed(1)}%`;
    document.getElementById("pg-latency").innerText = `${res.latency_ms} ms`;

    // Bilingual reasoning
    const reasonText = currentLang === "ta" && res.reason_ta ? res.reason_ta : res.reason_en;
    document.getElementById("pg-reason").innerText = reasonText;

    // Obfuscation
    const obfEl = document.getElementById("pg-obfuscation");
    if (res.obfuscation_detected) {
        obfEl.innerHTML = `<span style="color:#ef4444; font-weight:700;">DETECTED:</span> ${res.obfuscation_techniques.join(", ")}`;
    } else {
        obfEl.innerHTML = "<span style="color:#10b981">Clean (No obfuscation detected)</span>";
    }

    // Normalized payload
    document.getElementById("pg-normalized").innerText = res.normalized_payload || "(Same as raw)";

    // SHAP Feature Bars
    const shapDiv = document.getElementById("pg-shap-bars");
    shapDiv.innerHTML = "";
    if (res.shap_contributions && res.shap_contributions.length > 0) {
        res.shap_contributions.forEach(item => {
            const isPos = item.contribution > 0;
            const pct = Math.min(Math.abs(item.contribution) * 100, 100);
            const div = document.createElement("div");
            div.className = "shap-bar-item";
            div.innerHTML = `
                <div class="shap-bar-name" title="${item.feature}">${item.feature}</div>
                <div class="shap-bar-track">
                    <div class="shap-bar-fill ${isPos ? 'positive' : 'negative'}" style="width: ${pct}%"></div>
                </div>
                <div class="shap-bar-val" style="color: ${isPos ? '#ef4444' : '#10b981'}">${item.contribution > 0 ? '+' : ''}${item.contribution.toFixed(2)}</div>
            `;
            shapDiv.appendChild(div);
        });
    }

    // 23 Features Table
    const tbody = document.getElementById("pg-features-tbody");
    tbody.innerHTML = "";
    if (res.features) {
        for (const [k, v] of Object.entries(res.features)) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td><code>${k}</code></td><td><strong>${v}</strong></td>`;
            tbody.appendChild(tr);
        }
    }
}
