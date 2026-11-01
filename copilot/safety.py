"""
Step 0 Safety and Prompt Injection Shield for AegisGate Copilot.
Verifies user queries before any intent processing:
- Blocks malicious prompt injection attempts (e.g., 'ignore previous instructions').
- Refuses requests for working cyber exploits, malware creation, or unauthorized attacks.
- Protects secrets, API keys, passwords, and private environment variables.
"""
import re
from typing import Tuple, Optional

# High-risk prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"reveal\s+(the\s+)?([a-z_]*system\s+prompt|[a-z_]*api[_-]?key|secret|password|env|credentials)",
    r"print\s+(the\s+)?([a-z_]*gemini[_-]?api[_-]?key|[a-z_]*token|[a-z_]*credentials)",
    r"you\s+are\s+now\s+(in\s+)?(dan|jailbreak|unrestricted)\s+mode",
    r"disregard\s+all\s+security\s+rules?",
    r"override\s+gateway\s+controls?",
    r"give\s+me\s+real\s+credit\s*card\s+numbers?",
]

# Weaponized exploit generation patterns
EXPLOIT_PATTERNS = [
    r"(create|write|give\s+me)\s+(a\s+)?(0day|zero-day|exploit\s+code|ransomware|trojan|keylogger|ddos\s+bot)",
    r"how\s+to\s+hack\s+into\s+(a\s+)?(bank|government|target|victim|website|server)\s+without\s+permission",
    r"generate\s+(malicious|destructive)\s+(payload|script)\s+to\s+destroy",
]

INJECTION_RE = re.compile("|".join(INJECTION_PATTERNS), re.IGNORECASE)
EXPLOIT_RE = re.compile("|".join(EXPLOIT_PATTERNS), re.IGNORECASE)


def check_safety(query: str, lang: str = "en") -> Tuple[bool, Optional[str]]:
    """
    Checks if a query violates safety or tries prompt injection.
    Returns: (is_safe: bool, refusal_message: Optional[str])
    """
    if not query:
        return True, None

    # 1. Prompt Injection Check
    if INJECTION_RE.search(query):
        if lang == "ta":
            msg = "பாதுகாப்புக் கொள்கையின்படி, கணினி கட்டளைகள் அல்லது உள் ரகசியங்களை வெளியிடும் கோரிக்கைகள் நிராகரிக்கப்படுகின்றன. API பாதுகாப்பு பகுப்பாய்வில் நான் உதவலாமா?"
        elif lang == "tanglish":
            msg = "Security policy padi, system instructions or secrets reveal panna mudiyadhu. Nan defense analysis la help pannava?"
        else:
            msg = "In accordance with AegisGate security protocols, requests to override system instructions or disclose confidential tokens are strictly restricted. How may I assist you with defensive security analysis?"
        return False, msg

    # 2. Weaponized Exploit Check
    if EXPLOIT_RE.search(query):
        if lang == "ta":
            msg = "AegisGate IDS ஒரு தற்காப்பு பாதுகாப்பு கருவி. தாக்குதல் ஸ்கிரிப்ட்கள் அல்லது தீங்கிழைக்கும் மென்பொருளை உருவாக்குவது தடைசெய்யப்பட்டுள்ளது. ஆனால் இந்த அச்சுறுத்தல்களை எவ்வாறு கண்டறிந்து தடுப்பது என்பதை விளக்க முடியும்."
        elif lang == "tanglish":
            msg = "AegisGate defensive IDS tool. Malicious exploits thara mudiyadhu, but ivatrai eppadi detect panni block pannalam nu explain panren."
        else:
            msg = "AegisGate is an enterprise defensive security solution. I cannot generate malicious exploit payloads or attack scripts. However, I can explain the underlying vulnerability mechanics and how to detect or mitigate them."
        return False, msg

    return True, None

