"""
Response Data Leak Prevention Module.
Inspects backend HTTP response payloads, detects unmasked sensitive data
(Credit cards, SSNs, API secrets, Bearer tokens), and masks them to prevent
data exfiltration.
"""
import re
from typing import Tuple, List

# Sensitive Data Patterns
PATTERNS = {
    "Credit_Card": re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
    "Social_Security_Number": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "API_Secret_Key": re.compile(r"\b(api_key_[0-9a-zA-Z]{20,}|ghp_[0-9a-zA-Z]{20,}|AKIA[0-9A-Z]{16}|secret_key_[0-9a-zA-Z]{20,})\b"),
    "JWT_Auth_Token": re.compile(r"Bearer\s+eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"),
}


def mask_credit_card(match: re.Match) -> str:
    raw = match.group(0)
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 16:
        return f"****-****-****-{digits[-4:]}"
    return "****-****-****-****"


def mask_ssn(match: re.Match) -> str:
    raw = match.group(0)
    return f"***-**-{raw[-4:]}"


def mask_api_key(match: re.Match) -> str:
    raw = match.group(0)
    prefix = raw[:8]
    return f"{prefix}************************"


def mask_jwt(match: re.Match) -> str:
    return "Bearer [SANITIZED_JWT_TOKEN]"


def inspect_and_mask_response(content: str) -> Tuple[str, bool, List[str]]:
    """
    Scans the response payload and masks any sensitive patterns.

    Returns:
        (sanitized_content: str, leak_prevented: bool, leaked_categories: List[str])
    """
    if not content:
        return content, False, []

    modified = content
    leaks = []

    # 1. Credit Cards
    if PATTERNS["Credit_Card"].search(modified):
        modified = PATTERNS["Credit_Card"].sub(mask_credit_card, modified)
        leaks.append("Credit Card Number")

    # 2. SSN / National IDs
    if PATTERNS["Social_Security_Number"].search(modified):
        modified = PATTERNS["Social_Security_Number"].sub(mask_ssn, modified)
        leaks.append("National ID / SSN")

    # 3. API Keys
    if PATTERNS["API_Secret_Key"].search(modified):
        modified = PATTERNS["API_Secret_Key"].sub(mask_api_key, modified)
        leaks.append("API Secret Key")

    # 4. JWT Tokens
    if PATTERNS["JWT_Auth_Token"].search(modified):
        modified = PATTERNS["JWT_Auth_Token"].sub(mask_jwt, modified)
        leaks.append("Bearer JWT Token")

    leak_prevented = len(leaks) > 0
    return modified, leak_prevented, leaks
