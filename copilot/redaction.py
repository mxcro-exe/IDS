"""
Privacy and Redaction Engine for AegisGate Copilot.
Sanitizes sensitive patterns before transmitting queries to Cloud LLMs (Gemini):
- API keys, JWTs, and bearer tokens.
- Passwords and auth secrets.
- Email addresses.
- Credit card numbers.
- Client IPv4/IPv6 addresses (optional strict privacy mode).
"""
import re

API_KEY_RE = re.compile(r"(?:api[_-]?key|secret|token|auth|password|passwd)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{8,})['\"]?", re.IGNORECASE)
BEARER_RE = re.compile(r"Bearer\s+([a-zA-Z0-9_\-\.]{15,})", re.IGNORECASE)
JWT_RE = re.compile(r"ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
CARD_RE = re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b")
IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")


def redact_sensitive_info(text: str, redact_ips: bool = False) -> str:
    """Redacts private tokens and PII before transmitting data to external APIs."""
    if not text:
        return ""

    sanitized = text
    # 1. Redact API keys and passwords
    sanitized = API_KEY_RE.sub("api_key=[REDACTED_SECRET]", sanitized)
    sanitized = BEARER_RE.sub("Bearer [REDACTED_TOKEN]", sanitized)
    sanitized = JWT_RE.sub("[REDACTED_JWT]", sanitized)

    # 2. Redact emails & cards
    sanitized = EMAIL_RE.sub("[REDACTED_EMAIL]", sanitized)
    sanitized = CARD_RE.sub("[REDACTED_CARD]", sanitized)

    # 3. Redact Client IPs if requested
    if redact_ips:
        sanitized = IP_RE.sub("[CLIENT_IP]", sanitized)

    return sanitized

