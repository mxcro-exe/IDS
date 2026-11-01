"""
Language Detection Engine for AegisGate Copilot.
Distinguishes between:
- 'ta': Native Tamil script (Unicode block U+0B80 - U+0BFF)
- 'tanglish': Tamil written phonetically in Latin script (e.g., 'vanakkam', 'epdi irukinga')
- 'en': Standard English
"""
import re
from typing import Literal

# Tamil Unicode range regex
TAMIL_SCRIPT_RE = re.compile(r"[\u0B80-\u0BFF]")

# Prominent Tanglish dictionary and stems
TANGLISH_VOCAB = {
    "vanakkam", "epdi", "eppadi", "irukinga", "irukeenga", "iruka", "irukku",
    "enna", "ethu", "edhu", "enge", "enga", "eppo", "yaar", "yar",
    "sollu", "solla", "solreenga", "solunga", "solren", "solradhu",
    "nandri", "nanri", "romba", "konjam", "nalla", "mosam",
    "pannu", "pannunga", "panreenga", "panra", "panradhu",
    "theriyuma", "theriyum", "theriyadhu", "puriyala", "puriyudha", "purinjidha",
    "aama", "aamam", "illai", "illa", "illaye",
    "machan", "thalaiva", "nanba", "thambi", "bro",
    "vai", "vei", "podu", "kudu", "kudunga", "kaatu", "kaatunga",
    "parkalam", "paaru", "parunga", "ungalukku", "enakku", "namakku",
    "eppadi", "seivathu", "seiyalam", "enakum", "ungalukum",
    "yenna", "yethu", "yen", "yepo", "yengae", "adhuvum", "ithuvum",
    "mudiyuma", "mudiyum", "mudiyaadhu", "seri", "sari",
}

# Tanglish verb / suffix heuristics (e.g., words ending in 'nga', 'la', 'itu', 'koodadhu')
TANGLISH_SUFFIXES = ("nga", "inga", "eenga", "la", "koodadhu", "aachu", "aayiduchu", "pannu", "podu")


def detect_language(text: str, default_lang: str = "en") -> Literal["en", "ta", "tanglish"]:
    """
    Detects language of user query:
    1. If Tamil Unicode characters exist -> 'ta'.
    2. If Latin script contains significant Tanglish keywords or patterns -> 'tanglish'.
    3. Otherwise -> 'en' (or default_lang).
    """
    if not text:
        return default_lang if default_lang in ("en", "ta", "tanglish") else "en"

    # 1. Native Tamil Script Check
    if TAMIL_SCRIPT_RE.search(text):
        return "ta"

    # 2. Tanglish Detection in Latin Script
    cleaned = text.lower()
    words = re.findall(r"\b[a-z]+\b", cleaned)
    if not words:
        return default_lang if default_lang in ("en", "ta", "tanglish") else "en"

    tanglish_hits = 0
    for w in words:
        if w in TANGLISH_VOCAB:
            tanglish_hits += 2
        elif any(w.endswith(sfx) and len(w) > len(sfx) + 2 for sfx in TANGLISH_SUFFIXES):
            tanglish_hits += 1

    # If at least 1 strong word or 2 suffix hits detected, classify as Tanglish
    if tanglish_hits >= 2 or (len(words) <= 3 and tanglish_hits >= 1):
        return "tanglish"

    return "en"

