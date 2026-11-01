"""
Text Normalization for AegisGate Copilot Intent Matching Engine.
Handles Unicode NFC, Tamil script preservation, repeated character collapsing,
common slang/shortcut expansion, and punctuation/emoji stripping.
"""
import re
import unicodedata

# Common chat shortcut dictionary
SHORTCUTS = {
    "pls": "please",
    "plz": "please",
    "thx": "thanks",
    "ty": "thanks",
    "tq": "thank you",
    "tysm": "thank you so much",
    "wat": "what",
    "wht": "what",
    "u": "you",
    "ur": "your",
    "r": "are",
    "gud": "good",
    "gd": "good",
    "bcoz": "because",
    "bcuz": "because",
    "cuz": "because",
    "idk": "i dont know",
    "nvm": "never mind",
    "brb": "be right back",
    "btw": "by the way",
    "mrng": "morning",
    "nyt": "night",
    "nite": "night",
    "abt": "about",
    "info": "information",
    "sec": "security",
    "hw": "how",
    "whr": "where",
    "whn": "when",
    "y": "why",
    "k": "ok",
    "kk": "ok",
    "okay": "ok",
    "okie": "ok",
    "alright": "ok",
    "dnt": "dont",
    "wont": "will not",
    "cant": "cannot",
}

# Regex to collapse 3+ repeated characters down to 1 or 2
# e.g., "hiiiii" -> "hi", "goooood" -> "good"
REPEATED_CHARS_RE = re.compile(r"(.)\1{2,}", flags=re.IGNORECASE)

# Punctuation/emoji cleaning regex that PRESERVES:
# - Tamil Unicode block (\u0B80-\u0BFF)
# - Standard alphanumerics (\w)
# - Basic math symbols (+ - * / % = ^)
# - Space
CLEAN_CHARS_RE = re.compile(r"[^\w\s\u0B80-\u0BFF\+\-\*\/\%\=\^]", flags=re.UNICODE)


def collapse_repeats(text: str) -> str:
    """Collapses 3 or more repeated letters to 1 or 2 letters."""
    # If character repeats 3+ times, reduce to 1 if it's typically single (like 'i', 'h', 'a')
    # or 2 for vowels like 'o' ('goood' -> 'good')
    def _repl(match):
        char = match.group(1)
        if char.lower() in ("o", "e"):
            return char * 2
        return char

    return REPEATED_CHARS_RE.sub(_repl, text)


def normalize_text(text: str, preserve_math: bool = False) -> str:
    """
    Normalizes input text for fast and robust intent matching:
    1. Unicode NFC normalization.
    2. Lowercasing.
    3. Collapsing repeated characters ("hiiiii" -> "hi").
    4. Stripping punctuation/emojis while strictly preserving Tamil script.
    5. Expanding common chat shortcuts ("pls" -> "please").
    6. Collapsing extra whitespace.
    """
    if not text:
        return ""

    # 1. Unicode NFC
    text = unicodedata.normalize("NFC", text.strip())

    # 2. Lowercase (Tamil has no casing, works fine on English/Tanglish)
    text = text.lower()

    # 3. Collapse repeated chars
    text = collapse_repeats(text)

    # 4. Filter punctuation & noise
    if preserve_math:
        text = CLEAN_CHARS_RE.sub(" ", text)
    else:
        # Strip all symbols except letters, digits, and Tamil
        text = re.sub(r"[^\w\s\u0B80-\u0BFF]", " ", text, flags=re.UNICODE)

    # 5. Expand shortcuts token by token
    tokens = text.split()
    expanded_tokens = [SHORTCUTS.get(t, t) for t in tokens]
    text = " ".join(expanded_tokens)

    # 6. Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

