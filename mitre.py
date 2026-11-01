"""
MITRE ATT&CK Enterprise Matrix v14 Mapping.
Associates detected attack classes and anomalies with official
MITRE ATT&CK Tactics, Techniques, and Mitigation guidance.
"""
from typing import Dict, Any

MITRE_MAP: Dict[str, Dict[str, Any]] = {
    "SQL_Injection": {
        "technique_id": "T1190",
        "technique_name": "Exploit Public-Facing Application",
        "subtechnique": "SQL Injection",
        "tactic": "Initial Access / Privilege Escalation",
        "severity": "CRITICAL",
        "description_en": "Adversary injects malicious SQL statements via API input to bypass authentication or extract sensitive database contents.",
        "description_ta": "அங்கீகாரத்தைத் தவிர்த்து தரவுத்தளத்திலிருந்து முக்கியமான தகவல்களைத் திருட பயனர் உள்ளீட்டில் தீங்கிழைக்கும் SQL கட்டளைகள் செலுத்தப்படுகின்றன.",
        "mitigation": "Use parameterized queries / prepared statements and strict input schema validation.",
    },
    "XSS": {
        "technique_id": "T1059.007",
        "technique_name": "Command and Scripting Interpreter: JavaScript",
        "subtechnique": "Cross-Site Scripting (XSS)",
        "tactic": "Execution / Defense Evasion",
        "severity": "HIGH",
        "description_en": "Adversary injects malicious browser scripts to hijack sessions, steal cookies, or deface web views.",
        "description_ta": "பயனர் அமர்வுகளை அபகரிக்க அல்லது குக்கீகளைத் திருட இணைய உலாவியில் தீங்கிழைக்கும் ஸ்கிரிப்ட்கள் செலுத்தப்படுகின்றன.",
        "mitigation": "Enforce context-aware HTML entity encoding and strict Content Security Policy (CSP).",
    },
    "Path_Traversal": {
        "technique_id": "T1083",
        "technique_name": "File and Directory Discovery",
        "subtechnique": "Local File Inclusion / Path Traversal",
        "tactic": "Discovery / Collection",
        "severity": "HIGH",
        "description_en": "Adversary uses '../' sequences to escape application root and read sensitive system files (e.g., /etc/passwd or credentials).",
        "description_ta": "கணினி அடைவுகளைத் தாண்டி முக்கியமான கணினி கோப்புகளைப் படிக்க '../' தொடர்கள் பயன்படுத்தப்படுகின்றன.",
        "mitigation": "Validate filenames against a strict allowlist and use canonical path resolution checks.",
    },
    "Command_Injection": {
        "technique_id": "T1059",
        "technique_name": "Command and Scripting Interpreter",
        "subtechnique": "OS Command Injection",
        "tactic": "Execution",
        "severity": "CRITICAL",
        "description_en": "Adversary appends shell metacharacters (; | ` $) to execute arbitrary OS-level commands on the host server.",
        "description_ta": "சேவையகத்தில் அங்கீகரிக்கப்படாத OS கட்டளைகளை இயக்க ஷெல் குறியீடுகள் இணைக்கப்படுகின்றன.",
        "mitigation": "Avoid direct OS shell execution; use safe APIs without shell interpolation.",
    },
    "Brute_Force": {
        "technique_id": "T1110.004",
        "technique_name": "Brute Force: Credential Stuffing / Password Guessing",
        "subtechnique": "Credential Stuffing",
        "tactic": "Credential Access",
        "severity": "MEDIUM",
        "description_en": "Adversary attempts multiple passwords or cycles leaked username/password combinations to compromise accounts.",
        "description_ta": "பயனர் கணக்குகளைக் கைப்பற்ற பல கடவுச்சொற்களைத் தொடர்ந்து முயற்சிக்கும் தாக்குதல்.",
        "mitigation": "Enforce sliding-window rate limiting, exponential backoff, and Multi-Factor Authentication (MFA).",
    },
    "Bot_Scanner": {
        "technique_id": "T1595.002",
        "technique_name": "Active Scanning: Vulnerability Scanning",
        "subtechnique": "Automated Scanner Probe",
        "tactic": "Reconnaissance",
        "severity": "MEDIUM",
        "description_en": "Automated scanning tool (sqlmap, nikto, dirbuster) probing API endpoints for exploitable flaws.",
        "description_ta": "தானியங்கி ஸ்கேனிங் கருவிகள் மூலம் API பாதுகாப்பு குறைபாடுகளைத் தேடும் முயற்சி.",
        "mitigation": "Block known malicious User-Agents and enforce behavioral challenge tokens.",
    },
    "Honeypot_Trap": {
        "technique_id": "T1592",
        "technique_name": "Gather Victim Host Information",
        "subtechnique": "Decoy Reconnaissance",
        "tactic": "Reconnaissance / Initial Access",
        "severity": "HIGH",
        "description_en": "Client accessed a classified decoy endpoint (/admin, /.env, /backup.zip). Immediate auto-ban triggered.",
        "description_ta": "பாதுகாக்கப்பட்ட தேன் தொட்டி (Honeypot) பாதையை அணுகியதால் வாடிக்கையாளர் தானாகவே முடக்கப்படுகிறார்.",
        "mitigation": "Immediately terminate connection and enforce IP blocklist.",
    },
    "Zero_Day_Anomaly": {
        "technique_id": "T1005",
        "technique_name": "Data from Local System / Unknown Anomaly",
        "subtechnique": "Statistical Outlier Pattern",
        "tactic": "Initial Access / Defense Evasion",
        "severity": "HIGH",
        "description_en": "Request features deviate significantly from normal traffic baseline according to Isolation Forest.",
        "description_ta": "வழக்கமான பயனர் நடத்தையிலிருந்து முற்றிலும் மாறுபட்ட சந்தேகத்திற்கிடமான புதிய ஒழுங்கின்மை.",
        "mitigation": "Route to quarantine inspection and trigger administrative alert.",
    },
    "Rate_Limit_Violation": {
        "technique_id": "T1499.003",
        "technique_name": "Endpoint Denial of Service: Request Flooding",
        "subtechnique": "API Request Burst",
        "tactic": "Impact",
        "severity": "LOW",
        "description_en": "Client exceeded configured sliding-window threshold. HTTP 429 response issued.",
        "description_ta": "அனுமதிக்கப்பட்ட கோரிக்கை வரம்பைத் தாண்டியதால் தற்காலிகமாக தடுக்கப்பட்டது (HTTP 429).",
        "mitigation": "Sliding-window throttling and IP cooldown timer.",
    },
}


def get_mitre_details(attack_type: str) -> Dict[str, Any]:
    """Returns MITRE ATT&CK taxonomy metadata for a given attack type."""
    return MITRE_MAP.get(
        attack_type,
        {
            "technique_id": "T1190",
            "technique_name": "Generic Exploitation Attempt",
            "subtechnique": "Suspicious Activity",
            "tactic": "Defense Evasion",
            "severity": "MEDIUM",
            "description_en": "Anomalous or suspicious HTTP request flagged by Gateway IDS.",
            "description_ta": "API நுழைவாயிலால் கண்டறியப்பட்ட சந்தேகத்திற்கிடமான கோரிக்கை.",
            "mitigation": "Inspect request features and client reputation.",
        },
    )
