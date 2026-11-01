"""
Plain-Language Alert Explainer Service (English & Tamil).
Translates technical SHAP feature importance vectors, decoded payloads,
and threat indicators into intuitive, 2-sentence human explanations with
actionable remediation guidance ("What should I do?").
"""
from typing import Dict, Any, List

EXPLAINER_TEMPLATES = {
    "SQL_Injection": {
        "en": (
            "This incoming request attempted to manipulate database queries through input parameters ({feature_summary}). "
            "AegisGate intercepted and blocked it before any backend database extraction could occur."
        ),
        "ta": (
            "இந்த கோரிக்கை தேடல் வினவல் அல்லது உள்ளீட்டு புலங்கள் வழியாக தரவுத்தளத்தை திருட முயன்றது ({feature_summary}). "
            "உங்கள் முதன்மை சேவையகத்தை அடைவதற்கு முன்பே AegisGate இதை தடுத்து நிறுத்தியது."
        ),
        "what_to_do_en": "Use parameterized prepared statements in your backend SQL queries and apply input validation.",
        "what_to_do_ta": "உங்கள் தரவுத்தள வினவல்களில் Parameterized Queries (Prepared Statements) பயன்படுத்துங்கள்.",
    },
    "XSS": {
        "en": (
            "This request contained malicious client-side executable script tags or event handlers ({feature_summary}). "
            "It was blocked to protect client browsers from session theft or script execution."
        ),
        "ta": (
            "இந்த கோரிக்கையில் பிற பயனர்களின் உலாவிகளில் செயல்படக்கூடிய தீங்கிழைக்கும் ஜாவாஸ்கிரிப்ட் குறியீடுகள் இருந்தன ({feature_summary}). "
            "பயனர் அமர்வு திருட்டைத் தடுக்க இது உடனடியாக தடுக்கப்பட்டது."
        ),
        "what_to_do_en": "Encode all user-supplied data before rendering it in the browser and enable a strict Content-Security-Policy (CSP).",
        "what_to_do_ta": "உலாவியில் காண்பிக்கும் முன் பயனர் உள்ளீடுகளை HTML குறியாக்கம் (Encoding) செய்யுங்கள்.",
    },
    "Path_Traversal": {
        "en": (
            "This request attempted directory climbing ('../') to access sensitive system files outside the web root. "
            "The gateway blocked the request to prevent unauthorized local file inclusion."
        ),
        "ta": (
            "இக்கோரிக்கை வலை அடைவுகளுக்கு வெளியே உள்ள முக்கியமான கணினி கோப்புகளை ('../') அணுக முயன்றது. "
            "ரகசிய தகவல்களை பாதுகாக்க இது வாயிலிலேயே தடுக்கப்பட்டது."
        ),
        "what_to_do_en": "Sanitize file path parameters, reject relative dots, and use strict base directory whitelisting.",
        "what_to_do_ta": "கோப்பு பாதைகளில் '..' போன்ற குறிச்சொற்களை தடை செய்து நிலையான கோப்பகத்தை மட்டும் அனுமதியுங்கள்.",
    },
    "Command_Injection": {
        "en": (
            "The payload attempted to chain operating system shell commands through query arguments. "
            "AegisGate terminated the request to safeguard underlying server infrastructure."
        ),
        "ta": (
            "இக்கோரிக்கை இயக்க முறைமையின் (OS) ஷெல் கட்டளைகளை இயக்கி சேவையகத்தை கட்டுப்படுத்த முயன்றது. "
            "சேவையக பாதுகாப்பிற்காக இது முற்றிலுமாக முடக்கப்பட்டது."
        ),
        "what_to_do_en": "Never pass unvalidated user input directly to system command shells (e.g., exec or system).",
        "what_to_do_ta": "பயனர் உள்ளீடுகளை நேரடியாக கணினி கட்டளைகளில் (Shell Commands) இயக்காதீர்கள்.",
    },
    "Honeypot_Trap": {
        "en": (
            "An unauthorized scanner probed a decoy decoy asset ({payload}). "
            "The client has been quarantined and automatically added to the IP ban list."
        ),
        "ta": (
            "அங்கீகரிக்கப்படாத ஸ்கேனர் ஒரு போலியான தேன் தொட்டி பாதையை அணுக முயன்றது ({payload}). "
            "இந்த கிளையன்ட் உடனடியாக தானியங்கி தடை பட்டியலில் சேர்க்கப்பட்டது."
        ),
        "what_to_do_en": "Leave the honeypot active; attacker IP is automatically banned across all endpoints.",
        "what_to_do_ta": "தேன் தொட்டி எச்சரிக்கை இயல்பானது; தாக்குதல் நடத்தியவரின் IP தானாகவே தடை செய்யப்பட்டுள்ளது.",
    },
    "Brute_Force": {
        "en": (
            "An abnormally rapid burst of authentication requests was detected from this IP address. "
            "Sliding-window rate limits were enforced to block credential cracking attempts."
        ),
        "ta": (
            "ஒரே IP முகவரியிலிருந்து மிகக் குறுகிய நேரத்தில் தொடர்ச்சியான உள்நுழைவு முயற்சிகள் மேற்கொள்ளப்பட்டன. "
            "கடவுச்சொல் திருட்டை தடுக்க விகித வரம்பு (Rate Limit) செயல்படுத்தப்பட்டது."
        ),
        "what_to_do_en": "Enforce multi-factor authentication (MFA) and progressive backoff delays on login routes.",
        "what_to_do_ta": "உள்நுழைவு பக்கங்களில் இருபடி அங்கீகரிப்பு (MFA) மற்றும் காலதாமதக் கட்டுப்பாடுகளை செயல்படுத்துங்கள்.",
    },
    "BOLA_IDOR": {
        "en": (
            "The client systematically probed sequential resource identifiers across API routes. "
            "AegisGate flagged this unauthorized object-level reconnaissance pattern."
        ),
        "ta": (
            "கிளையன்ட் வரிசையாக உள்ள அடையாள எண்களை மாற்றி பிறரின் தரவுகளை அணுக முயன்றது. "
            "பொருள் அளவிலான அங்கீகார மீறல் முறை கண்டறியப்பட்டு எச்சரிக்கை விடுக்கப்பட்டது."
        ),
        "what_to_do_en": "Enforce strict object-level authorization checks to verify user ownership for each requested ID.",
        "what_to_do_ta": "ஒவ்வொரு தரவு அடையாள அட்டைக்கும் பயனருக்கு உரிய அனுமதி உள்ளதா என்பதை சேவையகத்தில் சரிபாருங்கள்.",
    },
    "SSRF": {
        "en": (
            "This request contained cloud metadata or loopback IP targets in payload URL parameters. "
            "The request was dropped to prevent server-side request forgery."
        ),
        "ta": (
            "இக்கோரிக்கை உள்ளூர் சேவையக அல்லது கிளவுட் மெட்டாடேட்டா முகவரிகளை அணுக முயன்றது. "
            "உட்புற நெட்வொர்க் பாதுகாப்பிற்காக இது நிராகரிக்கப்பட்டது."
        ),
        "what_to_do_en": "Restrict outbound server requests to a strict allowlist of destinations and block private IP ranges.",
        "what_to_do_ta": "வெளிச்செல்லும் சேவையக கோரிக்கைகளில் தனியார் IP வரம்புகளை (Private IPs) தடை செய்யுங்கள்.",
    },
}

DEFAULT_TEMPLATE = {
    "en": (
        "Anomalous API request behavior detected with high risk score ({feature_summary}). "
        "Mitigated by AegisGate adaptive hybrid intelligence."
    ),
    "ta": (
        "அசாதாரண மற்றும் அதிக ஆபத்துடைய API கோரிக்கை நடத்தை கண்டறியப்பட்டது ({feature_summary}). "
        "AegisGate பாதுகாப்புக் கொள்கையின்படி இது கையாளப்பட்டது."
    ),
    "what_to_do_en": "Review the technical payload and consider adding a custom perimeter rule or banning the client.",
    "what_to_do_ta": "தொழில்நுட்ப விவரங்களை ஆய்வு செய்து, தேவைப்பட்டால் கிளையன்ட் IP முகவரியை தடை செய்யுங்கள்.",
}


def compute_severity(risk_score: float, attack_type: str) -> str:
    """Computes categorical severity level: Low, Medium, High, Critical."""
    if risk_score >= 0.85 or attack_type in ["Honeypot_Trap", "Command_Injection", "SQL_Injection"]:
        return "Critical"
    elif risk_score >= 0.65:
        return "High"
    elif risk_score >= 0.40:
        return "Medium"
    return "Low"


def summarize_shap_features(shap_contributions: List[Dict[str, Any]]) -> str:
    """Generates concise plain-language summary of top SHAP drivers."""
    if not shap_contributions:
        return "heuristic anomaly pattern"
    top = sorted(shap_contributions, key=lambda x: abs(x.get("contribution", 0)), reverse=True)[:2]
    clean_names = []
    for f in top:
        fname = f.get("feature", "").replace("_", " ")
        clean_names.append(fname)
    return "primarily driven by " + " and ".join(clean_names) if clean_names else "anomalous behavior"


def generate_explanation(
    attack_type: str,
    risk_score: float,
    shap_contributions: List[Dict[str, Any]],
    raw_payload: str,
    decoded_payload: str,
) -> Dict[str, Any]:
    """
    Produces full dual-language plain explanations, severity ratings,
    and remediation instructions.
    """
    tpl = EXPLAINER_TEMPLATES.get(attack_type, DEFAULT_TEMPLATE)
    feat_summary = summarize_shap_features(shap_contributions)
    payload_snip = (raw_payload[:40] + "...") if len(raw_payload) > 40 else raw_payload

    explanation_en = tpl["en"].format(feature_summary=feat_summary, payload=payload_snip)
    explanation_ta = tpl["ta"].format(feature_summary=feat_summary, payload=payload_snip)
    severity = compute_severity(risk_score, attack_type)

    return {
        "attack_type": attack_type,
        "severity": severity,
        "risk_score": risk_score,
        "confidence_pct": round(min(100.0, max(50.0, risk_score * 100)), 1),
        "explanation_en": explanation_en,
        "explanation_ta": explanation_ta,
        "what_to_do_en": tpl["what_to_do_en"],
        "what_to_do_ta": tpl["what_to_do_ta"],
        "has_obfuscation": raw_payload != decoded_payload,
        "raw_payload": raw_payload,
        "decoded_payload": decoded_payload,
    }
