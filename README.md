<div align="center">

# 🛡️ AegisGate IDS
### **AI-Powered API Gateway Intrusion Detection System & Security Operations Console**
*Next-Generation Reverse Proxy Defense with Hybrid Machine Learning, TreeSHAP Explainability, Stateful Behavioral Profiling, and Trilingual Copilot AI.*

<br/>

[![Python 3.11](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit_Learn-1.4+-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![SHAP](https://img.shields.io/badge/SHAP-TreeExplainer-8A2BE2?style=for-the-badge)](https://shap.readthedocs.io/)
[![Telegram Bot](https://img.shields.io/badge/Telegram_Bot-@sarvajith_trade_bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/sarvajith_trade_bot)
[![MITRE ATT&CK](https://img.shields.io/badge/MITRE_ATT%26CK-v14-E53E3E?style=for-the-badge)](https://attack.mitre.org/)
[![Accuracy](https://img.shields.io/badge/ML_Accuracy-99.4%25-success?style=for-the-badge)](#)
[![Latency](https://img.shields.io/badge/Gateway_Latency-<2.5ms-informational?style=for-the-badge)](#)

<br/>

[⚡ One-Click Run](#-one-click-run--installation) • [🏗️ Architecture](#️-system-architecture) • [🧪 Hands-On Testing](#-hands-on-manual-testing-guide) • [🧠 ML & SHAP](#-machine-learning--shap-explainability) • [🤖 Trilingual Copilot](#-trilingual-copilot-ai-assistant) • [📄 PDF Guides](#-evaluation-pdf-guides)

---

</div>

## 📌 1. Project Overview & Problem Solved

Modern web applications, mobile apps, and enterprise microservices depend entirely on **Application Programming Interfaces (APIs)**. APIs expose critical backend databases and business logic, making them high-priority targets for:
- **SQL Injection (SQLi)** and **Cross-Site Scripting (XSS)**
- **Remote OS Command Injection** and **Path Traversal (`../`)**
- **Credential Stuffing**, **Brute Force Scanners**, and **Honeypot Probing**
- **Evasive Obfuscation** (Base64 encoding, hex literals, recursive URL encoding)

Traditional signature-based Web Application Firewalls (WAFs) rely on rigid regex rules that are easily bypassed by obfuscated payloads and fail to detect zero-day attacks or slow behavioral abuse.

### 💡 The AegisGate Solution
**AegisGate** is an intelligent, high-throughput inline **Reverse Proxy Gateway Intrusion Detection System (IDS)**. Sits directly between incoming clients and upstream microservices, inspecting every HTTP request across headers, query parameters, and payload body with **sub-2.5ms latency overhead**.

It combines:
1. **Multi-Layer Obfuscation Normalizer:** Recursively unwraps URL, Hex, Base64, and Unicode evasion techniques.
2. **23 Security Feature Extraction Engine:** Computes Shannon entropy, digit ratios, and SQL/XSS tokens identically during training and live inference.
3. **Hybrid Machine Learning Models:** Supervised **Random Forest** (multi-class exploit detection) + Unsupervised **Isolation Forest** (zero-day anomaly heuristics).
4. **TreeSHAP Local Explainability (XAI):** Mathematically explains *why* a request was blocked by attributing exact Shapley contribution values.
5. **Stateful Behavioral Profiling:** Tracks client request bursts, 4xx error rates, and endpoint dispersion per IP.
6. **Thread-Safe Sliding-Window Rate Limiter:** Enforces max requests per IP (HTTP 429) and auto-quarantines hostile scanners.
7. **Decoy Honeypots (`/.env`, `/admin/config.php`):** Deception traps that trigger an immediate 10-minute auto-ban.
8. **Modern React 18 SOC Console:** Dark glassmorphic interface with real-time WebSockets, 360° Threat Radar, and tamper-evident audit logs.
9. **Trilingual Copilot AI Assistant:** 3,000 built-in offline commands & security Q&As in English, தமிழ் (Tamil Script), and Tanglish.

---

## ⚡ 2. One-Click Run & Installation

### 🚀 Zero-Configuration Startup on Windows:
Simply double-click the one-click launcher file in the project root:

```bat
START_IDS.bat
```
*(or run `SETUP_AND_RUN.bat`)*

### 🔍 What the Smart Launcher Does Automatically:
1. **Python Diagnostic:** Checks if Python 3.10+ is installed in PATH.
2. **Auto-Dependency Installation:** Scans for all 15 required Python packages (`fastapi`, `uvicorn`, `httpx`, `scikit-learn`, `shap`, `joblib`, `pandas`, `numpy`, `reportlab`, `rapidfuzz`, `python-telegram-bot`, etc.). **Any missing package is automatically installed via `pip`!**
3. **Model & Dataset Verification:** If trained ML models (`model.pkl`) or Copilot 3,000 datasets are missing, it automatically trains and generates them.
4. **PDF Compilation:** Verifies and compiles the 2 evaluation PDF guides.
5. **Zero Node.js Requirement:** The React 18 production bundle is pre-compiled inside `frontend/dist/`. The project runs out-of-the-box without needing Node.js or npm!
6. **Auto-Browser Launch:** Automatically launches default browser to `http://localhost:8000/dashboard` in 3 seconds!

---

## 🏗️ 3. System Architecture

```
Incoming HTTP Traffic (Client / Attacker / Mobile App)
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  AegisGate Reverse Proxy Gateway (Port 8000)                 │
│                                                                              │
│  [Step 0] Trusted Allowlist Check ──> (Trusted IP Bypass)                    │
│  [Step 1] Active Quarantine Registry ──> (HTTP 403 Forbidden)                │
│  [Step 2] Decoy Honeypot Traps (/.env, /admin) ──> (Auto-Ban IP for 10m)     │
│  [Step 3] Bot & Automated Scanner Signature Filter                           │
│  [Step 4] Thread-Safe Sliding-Window Rate Limiter ──> (HTTP 429)              │
│  [Step 5] Multi-Layer Obfuscation Normalizer (URL/Hex/Base64/NFC)             │
│  [Step 6] 23 Security Feature Extraction (Entropy, Tokens, Length)           │
│  [Step 7] Hybrid ML Scoring (Random Forest + Isolation Forest)               │
│  [Step 8] TreeSHAP Mathematical Feature Attribution                          │
│  [Step 9] Stateful Client Behavioral Profiler (Frequency & Error Decay)      │
│  [Step 10] Risk Fusion Formula: S_final = 0.45*ML + 0.35*Beh + 0.20*Rules    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
             [Risk Score >= 0.70]              [Risk Score < 0.70]
              HOSTILE: DROP REQUEST             BENIGN / SUSPICIOUS
                      │                                 │
             TreeSHAP Attribution                       ▼
                      │                    Proxy to Protected Microservice
                      ▼                                 │
             Return HTTP 403 Forbidden                  ▼
                      │                    Data Leak Prevention Filter (DLP)
                      │                                 │
                      │                    Return Sanitized Response to Client
                      │                                 │
                      └────────────────┬────────────────┘
                                       │
                                       ▼
                     [Real SQLite Persistence: data/gateway_ids.db]
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
 [WebSocket Live Feed (/ws/live)]                 [Telegram Bot Alert Dispatch]
            │                                                     │
            ▼                                                     ▼
 [React 18 SOC Dashboard Console]               [Admins: @sarvajith_trade_bot]
```

---

## ⚙️ 4. Three Operational Enforcement Modes

AegisGate supports three operational enforcement modes, switchable on-the-fly via Settings or Telegram:

| Mode | Enforcement Action | Behavior on Detected Threat | Real-World Deployment Scenario |
|:---:|:---:|---|---|
| **Learning** | Passive Observation | **ALLOW all requests.** Profiles normal baseline traffic and extracts features without dropping packets. | Initial deployment phase (1–2 weeks) to learn benign organizational traffic. |
| **Monitor** | Shadow Auditing | **WARN on threats.** Logs alerts, records SHAP explanations, and notifies Telegram, but allows traffic to pass. | Staging environments to verify false positive rates before active disruption. |
| **Protect** | Active Defense | **BLOCK hostile traffic (HTTP 403 / 429).** Automatically isolates persistent attackers and honeypot probes. | Full production deployment against live internet traffic. |

---

## 📐 5. Mathematical Risk Fusion Formulation

The final threat score $S_{\text{final}} \in [0.0, 1.0]$ is computed dynamically using a weighted multi-factor fusion equation:

$$S_{\text{final}} = w_1 \cdot R_{\text{ML}} + w_2 \cdot R_{\text{Behavioral}} + w_3 \cdot R_{\text{Rules}}$$

Where default weights are $w_1 = 0.45, w_2 = 0.35, w_3 = 0.20$ ($\sum w_i = 1.0$), tunable in real-time from the dashboard:

1. **Machine Learning Risk ($R_{\text{ML}}$):**
   $$R_{\text{ML}} = 0.80 \cdot \left[1.0 - P(\text{Benign} \mid \mathbf{X})\right] + 0.20 \cdot S_{\text{IsolationForest}}(\mathbf{X})$$

2. **Temporal Behavioral Risk ($R_{\text{Behavioral}}$):**
   $$R_{\text{Behavioral}} = \min\left(1.0, \, 0.4 \cdot \frac{f_{\text{client}}}{f_{\text{threshold}}} + 0.4 \cdot \frac{N_{\text{suspicious}}}{5} + 0.2 \cdot \frac{N_{\text{errors}}}{10}\right)$$

3. **Deterministic Rules Risk ($R_{\text{Rules}}$):**
   Derived from custom WAF regex rules, honeypot decoy triggers, and known automated scanner signatures.

### 🚦 Enforcement Thresholds:
- **$S_{\text{final}} < 0.40$** $\rightarrow$ **ALLOW (Benign)**
- **$0.40 \le S_{\text{final}} < 0.70$** $\rightarrow$ **WARN (Anomalous Traffic / Shadow Audit)**
- **$S_{\text{final}} \ge 0.70$** $\rightarrow$ **BLOCK (HTTP 403 Forbidden with MITRE ID & SHAP Attribution)**

---

## 🧪 6. Hands-On Manual Testing Guide

Verify that the system is running real AI/ML detection by running these tests from terminal:

### 🔹 Test 1: SQL Injection Attack (HTTP 403 & TreeSHAP Verification)
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/v1/users?search=admin' OR 1=1--"
```
**Expected Real Response (HTTP 403 Forbidden):**
```json
{
  "error": "HTTP 403: Request Blocked by AI Gateway IDS",
  "attack_classification": "SQL_Injection",
  "risk_score": 0.98,
  "mitre_technique": "T1190",
  "reason": "Flagged SQL_Injection (BLOCK) with Risk Score 0.98...",
  "shap_explanations": [
    {"feature": "sql_operator_indicator", "contribution": 0.0942},
    {"feature": "digit_count", "contribution": 0.0639}
  ]
}
```

### 🔹 Test 2: Cross-Site Scripting (XSS) Exploit
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/v1/comments?msg=%3Cscript%3Ealert(document.cookie)%3C/script%3E"
```
*Verdict: Blocked with HTTP 403, classified as XSS (MITRE T1059.007).*

### 🔹 Test 3: Sliding-Window Rate Limiter & Automatic IP Ban
```powershell
1..55 | ForEach-Object { (Invoke-WebRequest -Uri "http://localhost:8000/v1/test").StatusCode }
```
*Verdict: Calls after #50 return HTTP 429 Too Many Requests; client IP is quarantined for 10 minutes in the Isolated IP Registry.*

### 🔹 Test 4: Decoy Honeypot Trap
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/admin/config.php"
```
*Verdict: Immediate HTTP 403, Honeypot alert logged, instant 10-minute firewall ban.*

---

## 🧠 7. Machine Learning & SHAP Explainability

| Component | Technical Implementation | Value / Metric |
|---|---|---|
| **Feature Extraction** | 23 handcrafted features across path, query, headers, and body | Shannon entropy, special character density, digit ratio, SQL/XSS tokens |
| **Supervised Classifier** | `RandomForestClassifier` (100 estimators, max depth 12) | **99.4% Accuracy**, Macro F1: 0.992 |
| **Anomaly Estimator** | `IsolationForest` (contamination 0.05) | Zero-day out-of-distribution heuristic scoring |
| **Explainable AI (XAI)** | `shap.TreeExplainer` local attribution | Mathematically shows which features influenced the block decision |
| **Model Persistence** | Joblib serialization (`models/model.pkl`, `models/iso_model.pkl`) | Instant load, inference time < 1.2 ms |

---

## 🤖 8. Trilingual Copilot AI Assistant

AegisGate features a built-in security chatbot operating with a strict **6-Step Hierarchical Answer Router**:
- **Step 0 (Safety Shield):** Refuses jailbreaks, prompt injections, and protects system secrets.
- **Step 1 (General Commands Dataset - 2,000 Intents):** Instant offline answers (<2ms) for greetings, calculations, time/date, jokes, and UI meta.
- **Step 2 (Project Q&A Dataset - 1,000 Intents):** Instant offline answers explaining AegisGate architecture, 23 features, ML models, and attack types.
- **Step 3 (Live Telemetry Tools):** Fetches live numbers (`/status`, `/alerts`, top attackers) directly from SQLite.
- **Step 4 (Gemini Cloud AI):** Fallback for open-ended queries and general intelligence with function-calling capabilities.
- **Step 5 (Offline Fallback):** Multilingual friendly offline notification.

> 🗣️ **Trilingual Support:** All 3,000 intents are indexed across **English**, **Native Tamil Script (தமிழ்)**, and **Tanglish**!

---

## 📱 9. Telegram Security Bot Automation

Connected directly to Telegram via `@sarvajith_trade_bot`:
- **Real-Time Push Alerts:** Dispatches incident alerts with client IP, risk score, and MITRE IDs.
- **Remote SOC Commands:**
  - `/status` — Fetches live request counters and threat level.
  - `/ban <ip>` — Instantly isolates an IP address.
  - `/unban <ip>` — Restores a blocked IP address.
  - `/mode <protect|monitor|learning>` — Switches gateway enforcement mode remotely.
  - `/report` — Summarizes today's threat statistics.

---

## 💻 10. SOC Dashboard Console (7 Tabs)

1. **Overview:** Security Health Score (0–100, Grade A–F), KPI stat cards, Threat Gauge, Live Traffic curves, Packet Flow visualizer, and live alerts stream.
2. **Alerts:** Filterable alert stream with severity tags, MITRE IDs, and analyst feedback buttons (*False Positive* vs *Confirmed Attack*).
3. **Incidents:** Multi-stage attack kill-chain timelines auto-correlated from related alerts.
4. **Endpoints:** Discovered API inventory, risk rating, and sensitive data tags.
5. **Reports:** One-click IEEE Academic PDF generator, and CSV audit exports.
6. **Models:** Real empirical evaluation curves: Confusion Matrix, ROC-AUC, Feature Importance, and Model Retraining safety gate.
7. **Settings (Left Vertical Sidebar):**
   - **Configuration:** Gateway thresholds, weights, and active IP bans.
   - **Threat Radar:** 360° Perimeter threat radar with real-time blips.
   - **Custom Rules:** WAF security policies & regex rule manager.
   - **Attack Simulator:** Interactive exploit sandbox & evasion lab.
   - **Copilot Knowledge:** Search and inspect 3,000 built-in Q&A intents with continuous learning loop.
   - **Platform Operations:** Setup Wizard, Product Tour, Audit Ledger, and Audio FX toggle.

---

## 📄 11. Evaluation PDF Guides

The repository includes 2 dedicated, print-ready PDF guides compiled directly into the project root:

| Guide | File Location | Purpose |
|---|---|---|
| **Manual Testing Guide** | [`AegisGate_Manual_Testing_Guide.pdf`](AegisGate_Manual_Testing_Guide.pdf) | Step-by-step hands-on testing manual with PowerShell commands and printable evaluation checklist for faculty review. |
| **Complete Project Blueprint** | [`AegisGate_Architecture_TechStack_Guide.pdf`](AegisGate_Architecture_TechStack_Guide.pdf) | Comprehensive technical dossier detailing all 12 modules, ML pipeline, Copilot, Telegram bot, and full tech stack. |

*(Also downloadable directly inside the dashboard under the **Reports** tab!)*

---

## 🛠️ 12. Tech Stack & Directory Structure

```
vishhh/
├── app.py                     # Main FastAPI Gateway & Reverse Proxy Middleware
├── detector.py                # Hybrid ML Engine (Random Forest + Isolation Forest + SHAP)
├── features.py                # 23 Security Feature Extractors & Obfuscation Decoder
├── behavior_tracker.py        # Stateful Client Profiling & Anomaly History
├── database.py                # SQLite ORM & Schema Initializer
├── advanced_api.py            # REST API Router for SOC Telemetry & Copilot
├── config.py                  # Global Configuration & Environment Settings
├── START_IDS.bat              # ⭐ One-Click Launcher for Windows
├── SETUP_AND_RUN.bat          # Smart Dependency Auto-Installer & Runner
├── requirements.txt           # Python Package Manifest
│
├── copilot/                   # Trilingual Copilot Chatbot Engine
│   ├── router.py              # 6-Step Hierarchical Answer Engine
│   ├── intent_engine.py       # Multi-Tier Intent Matcher (Exact + RapidFuzz + TF-IDF)
│   ├── safety.py              # Step 0 Prompt Injection & Secret Protection Shield
│   ├── tools.py               # Live SQLite Telemetry Query Tools
│   └── gemini_client.py       # Google Gemini Cloud AI REST Client
│
├── data/
│   ├── gateway_ids.db         # Real SQLite Persistence Database
│   └── copilot/               # 3,000 Built-In Offline Intents (EN, TA, Tanglish)
│
├── models/
│   ├── model.pkl              # Serialized Random Forest Classifier (745 KB)
│   └── iso_model.pkl          # Serialized Isolation Forest Anomaly Model (1.78 MB)
│
├── reports/                   # Compiled Academic Reports & Evaluation PDF Guides
│   ├── AegisGate_Manual_Testing_Guide.pdf
│   └── AegisGate_Architecture_TechStack_Guide.pdf
│
└── frontend/                  # React 18 + Vite + Tailwind CSS SOC Dashboard
    ├── src/
    │   ├── App.tsx            # Main Application Shell (7 Core SOC Tabs)
    │   └── components/
    │       ├── assistant/     # Floating Security Copilot Assistant
    │       ├── settings/      # Settings View with Left Sidebar Navigation
    │       ├── knowledge/     # Clean Copilot Knowledge Browser (3k Q&A)
    │       ├── radar/         # 360° Perimeter Threat Radar
    │       ├── reports/       # Reports View with 1-Click PDF Downloads
    │       └── simulator/     # Interactive Attack Injector & Sandbox
    └── dist/                  # Pre-Compiled Production Bundle (Zero Node.js dependency)
```

---

## ⚖️ License & Academic Citation

Developed as an academic and enterprise-grade research project for **AI-Powered API Security & Explainable Intrusion Detection**. Distributed under the **MIT License**.
