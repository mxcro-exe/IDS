"""
Feature Extraction and Obfuscation Normalizer Module for AI Gateway IDS.
This file is shared identically across training and live inference to prevent
training-serving skew.
"""
import math
import re
import urllib.parse
import html
import base64
from typing import Dict, Any, Tuple, List

# Feature Names in exact order expected by the ML model
FEATURE_NAMES = [
    "http_method",
    "url_length",
    "path_length",
    "query_length",
    "body_length",
    "special_char_count",
    "special_char_density",
    "payload_entropy",
    "digit_count",
    "alphabetic_count",
    "encoded_char_count",
    "double_encoding_indicator",
    "sql_keyword_indicator",
    "sql_operator_indicator",
    "xss_tag_indicator",
    "xss_event_handler_indicator",
    "path_traversal_indicator",
    "null_control_char_indicator",
    "header_anomaly_indicator",
    "request_frequency",
    "unique_endpoint_count",
    "recent_suspicious_count",
    "behavioral_deviation_score",
]

# Regex Patterns for Obfuscation & Attacks
SQL_KEYWORDS = re.compile(
    r"\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TABLE|DATABASE|"
    r"EXEC|EXECUTE|DECLARE|CAST|CONVERT|BENCHMARK|SLEEP|WAITFOR|DELAY|"
    r"INFORMATION_SCHEMA|SCHEMA|GROUP_CONCAT|HEX|CHAR|LOAD_FILE|OUTFILE)\b",
    re.IGNORECASE,
)

SQL_OPERATORS = re.compile(
    r"(--|/\*|\*/|#|@@|\|\||&&|'1'='1'|\"1\"=\"1\"|'or'|'and'|1=1|1=0|\bOR\s+\d+=\d+|\bAND\s+\d+=\d+)",
    re.IGNORECASE,
)

XSS_TAGS = re.compile(
    r"<(script|iframe|img|svg|body|style|link|meta|embed|object|input|video|audio|form|a)\b",
    re.IGNORECASE,
)

XSS_HANDLERS = re.compile(
    r"(on\w+\s*=|javascript\s*:|vbscript\s*:|eval\s*\(|alert\s*\(|confirm\s*\(|"
    r"prompt\s*\(|document\.cookie|document\.domain|window\.location)",
    re.IGNORECASE,
)

PATH_TRAVERSAL = re.compile(
    r"(\.\./|\.\.\\|%2e%2e%2f|%2e%2e/|\.\.%2f|%2e%2e%5c|/etc/passwd|/windows/win\.ini|"
    r"boot\.ini|win\.ini|windows\\system32)",
    re.IGNORECASE,
)

COMMAND_INJECTION = re.compile(
    r"(;\s*(cat|ls|pwd|whoami|id|uname|netcat|nc|curl|wget|bash|sh|powershell|cmd)\b|"
    r"\|\s*(cat|ls|pwd|whoami|id|uname|netcat|nc|curl|wget|bash|sh)\b|"
    r"`(cat|ls|pwd|whoami|id|uname|curl|wget)`|\$\(cat|\$\(whoami)",
    re.IGNORECASE,
)

SPECIAL_CHARS = set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
METHOD_MAP = {
    "GET": 0,
    "POST": 1,
    "PUT": 2,
    "DELETE": 3,
    "HEAD": 4,
    "OPTIONS": 5,
    "PATCH": 6,
}


def normalize_payload(raw_text: str) -> Tuple[str, bool, List[str]]:
    """
    Multi-layer iterative obfuscation normalizer:
    1. Recursive URL decoding (up to 3 levels)
    2. HTML entity unescaping
    3. Unicode escape decoding (\\u00xx)
    4. Hex escape decoding (\\x00)
    5. SQL comment stripping (e.g. SEL/**/ECT -> SELECT)
    6. Base64 payload detection & decoding probe

    Returns:
        (normalized_text, obfuscation_detected, detected_techniques)
    """
    if not raw_text:
        return "", False, []

    current = raw_text
    techniques = []
    obfuscation_detected = False

    # 1. Recursive URL decoding
    for level in range(1, 4):
        decoded = urllib.parse.unquote(current)
        if decoded != current:
            if level > 1:
                techniques.append(f"Double/Nested URL Encoding (Level {level})")
                obfuscation_detected = True
            elif "%" in current and decoded != current:
                techniques.append("Standard URL Encoding")
            current = decoded
        else:
            break

    # 2. HTML Entity Decoding
    html_decoded = html.unescape(current)
    if html_decoded != current:
        techniques.append("HTML Entity Encoding")
        obfuscation_detected = True
        current = html_decoded

    # 3. Unicode Escapes (\\u0027, \\u003c)
    if re.search(r"\\u[0-9a-fA-F]{4}", current):
        try:
            unicode_decoded = re.sub(
                r"\\u([0-9a-fA-F]{4})",
                lambda m: chr(int(m.group(1), 16)),
                current,
            )
            if unicode_decoded != current:
                techniques.append("Unicode Hex Escaping (\\uXXXX)")
                obfuscation_detected = True
                current = unicode_decoded
        except Exception:
            pass

    # 4. Hex Escapes (\\x27, \\x3c)
    if re.search(r"\\x[0-9a-fA-F]{2}", current):
        try:
            hex_decoded = re.sub(
                r"\\x([0-9a-fA-F]{2})",
                lambda m: chr(int(m.group(1), 16)),
                current,
            )
            if hex_decoded != current:
                techniques.append("ASCII Hex Escaping (\\xXX)")
                obfuscation_detected = True
                current = hex_decoded
        except Exception:
            pass

    # 5. SQL Comment Stripping (SEL/**/ECT -> SELECT, UN/**/ION -> UNION)
    if "/*" in current and "*/" in current:
        stripped = re.sub(r"(?<=[a-zA-Z0-9])/\*.*?\*/(?=[a-zA-Z0-9])", "", current)
        stripped = re.sub(r"/\*.*?\*/", " ", stripped)
        if stripped != current:
            techniques.append("Inline SQL Comment Splitting (/**/)")
            obfuscation_detected = True
            current = stripped

    # 6. Base64 payload probe
    b64_match = re.search(r"(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?", current)
    if b64_match and len(b64_match.group(0)) >= 16:
        candidate = b64_match.group(0)
        try:
            raw_b64 = base64.b64decode(candidate).decode("utf-8", errors="ignore")
            # If decoded text looks like script, query or command
            if re.search(r"(select|<script|alert|\.\./|whoami|/etc/passwd)", raw_b64, re.IGNORECASE):
                techniques.append("Base64 Obfuscated Substring")
                obfuscation_detected = True
                current = current.replace(candidate, f" {raw_b64} ")
        except Exception:
            pass

    # Normalize multiple whitespaces
    current = re.sub(r"\s+", " ", current).strip()

    return current, obfuscation_detected, list(set(techniques))


def calculate_entropy(text: str) -> float:
    """Computes Shannon Entropy of given text."""
    if not text:
        return 0.0
    freq: Dict[str, int] = {}
    for char in text:
        freq[char] = freq.get(char, 0) + 1
    length = len(text)
    entropy = 0.0
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def extract_features(
    method: str,
    path: str,
    query_string: str = "",
    body: str = "",
    headers: Dict[str, str] = None,
    client_stats: Dict[str, float] = None,
) -> Tuple[Dict[str, float], bool, List[str], str]:
    """
    Extracts the 23 security-oriented features from an incoming HTTP request.
    Uses multi-layer normalization prior to feature evaluation.

    Returns:
        (features_dict, obfuscation_detected, obfuscation_techniques, normalized_payload)
    """
    if headers is None:
        headers = {}
    if client_stats is None:
        client_stats = {
            "request_frequency": 1.0,
            "unique_endpoint_count": 1.0,
            "recent_suspicious_count": 0.0,
            "behavioral_deviation_score": 0.0,
        }

    raw_combined = f"{path}?{query_string} {body}".strip()
    norm_combined, obf_detected, obf_techniques = normalize_payload(raw_combined)

    # 1. HTTP Method mapping
    method_val = METHOD_MAP.get(method.upper(), 7)

    # 2. Length metrics
    url_len = float(len(path) + (len(query_string) + 1 if query_string else 0))
    path_len = float(len(path))
    query_len = float(len(query_string))
    body_len = float(len(body))
    total_len = max(len(norm_combined), 1)

    # 3. Character counts
    special_count = float(sum(1 for c in norm_combined if c in SPECIAL_CHARS))
    special_density = round(special_count / total_len, 4)
    digit_count = float(sum(1 for c in norm_combined if c.isdigit()))
    alpha_count = float(sum(1 for c in norm_combined if c.isalpha()))

    # 4. Entropy
    entropy = calculate_entropy(norm_combined)

    # 5. Encoding indicators
    raw_encoded_matches = len(re.findall(r"%[0-9a-fA-F]{2}", raw_combined))
    encoded_count = float(raw_encoded_matches)
    double_encoding = 1.0 if ("%25" in raw_combined or len(obf_techniques) > 0 and obf_detected) else 0.0

    # 6. Attack token indicators on normalized payload
    sql_kw_matches = len(SQL_KEYWORDS.findall(norm_combined))
    sql_keyword_score = min(float(sql_kw_matches), 10.0)

    sql_op_matches = 1.0 if SQL_OPERATORS.search(norm_combined) else 0.0
    xss_tag_matches = 1.0 if XSS_TAGS.search(norm_combined) else 0.0
    xss_event_matches = 1.0 if XSS_HANDLERS.search(norm_combined) else 0.0
    traversal_matches = 1.0 if PATH_TRAVERSAL.search(norm_combined) else 0.0

    # Command injection or null byte indicators
    cmd_inj = 1.0 if COMMAND_INJECTION.search(norm_combined) else 0.0
    null_control = 1.0 if (
        "%00" in raw_combined
        or "\x00" in raw_combined
        or any(ord(c) < 32 and c not in "\r\n\t" for c in norm_combined)
        or cmd_inj == 1.0
    ) else 0.0

    # 7. Header Anomaly check
    header_anomaly = 0.0
    ua = headers.get("user-agent", "").lower()
    if not ua or "sqlmap" in ua or "nikto" in ua or "acunetix" in ua or "dirbuster" in ua:
        header_anomaly = 1.0
    if "\r" in path or "\n" in path:  # CRLF Injection
        header_anomaly = 1.0

    # 8. Behavioral Features
    req_freq = float(client_stats.get("request_frequency", 1.0))
    unique_endpoints = float(client_stats.get("unique_endpoint_count", 1.0))
    suspicious_cnt = float(client_stats.get("recent_suspicious_count", 0.0))
    deviation_score = float(client_stats.get("behavioral_deviation_score", 0.0))

    features: Dict[str, float] = {
        "http_method": float(method_val),
        "url_length": url_len,
        "path_length": path_len,
        "query_length": query_len,
        "body_length": body_len,
        "special_char_count": special_count,
        "special_char_density": special_density,
        "payload_entropy": entropy,
        "digit_count": digit_count,
        "alphabetic_count": alpha_count,
        "encoded_char_count": encoded_count,
        "double_encoding_indicator": double_encoding,
        "sql_keyword_indicator": sql_keyword_score,
        "sql_operator_indicator": sql_op_matches,
        "xss_tag_indicator": xss_tag_matches,
        "xss_event_handler_indicator": xss_event_matches,
        "path_traversal_indicator": traversal_matches,
        "null_control_char_indicator": null_control,
        "header_anomaly_indicator": header_anomaly,
        "request_frequency": req_freq,
        "unique_endpoint_count": unique_endpoints,
        "recent_suspicious_count": suspicious_cnt,
        "behavioral_deviation_score": deviation_score,
    }

    return features, obf_detected, obf_techniques, norm_combined


def features_to_vector(features: Dict[str, float]) -> List[float]:
    """Converts a feature dict into a 1D ordered float list for model inference."""
    return [features[name] for name in FEATURE_NAMES]
