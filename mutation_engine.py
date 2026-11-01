"""
Mutation Engine for AegisGate IDS.
Generates realistic obfuscation variants of payloads for:
1. Training data augmentation (Train Recipes)
2. Generalization evaluation (Held-Out Test Recipes)

Ensures that test recipes represent out-of-distribution obfuscations that the model
did not encounter during augmentation.
"""
import random
import re
import sys
import urllib.parse
from typing import List, Dict, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def mutate_mixed_case(payload: str, rng: random.Random) -> str:
    """Randomly flips case of alphabetical characters (e.g. sElEcT, <sCrIpt>)."""
    return "".join(c.upper() if rng.random() > 0.5 else c.lower() for c in payload)


def mutate_url_single(payload: str, rng: random.Random) -> str:
    """Encodes characters or key tokens into %XX format."""
    chars_to_encode = set(" '\"<>=;()/-*|&")
    out = []
    for c in payload:
        if c in chars_to_encode and rng.random() > 0.3:
            out.append(f"%{ord(c):02X}")
        else:
            out.append(c)
    return "".join(out)


def mutate_url_double(payload: str, rng: random.Random) -> str:
    """Double URL encodes key characters (% -> %25)."""
    single = urllib.parse.quote(payload, safe="")
    return single.replace("%", "%25")


def mutate_sql_comments(payload: str, rng: random.Random) -> str:
    """Splices inline C-style comments into SQL keywords: SEL/**/ECT, UN/**/ION."""
    keywords = ["SELECT", "UNION", "FROM", "WHERE", "ORDER", "GROUP", "INSERT", "UPDATE", "DELETE", "DROP"]
    res = payload
    for kw in keywords:
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        matches = list(pattern.finditer(res))
        for m in reversed(matches):
            word = m.group(0)
            if len(word) >= 4:
                split_idx = len(word) // 2
                spliced = word[:split_idx] + "/**/" + word[split_idx:]
                res = res[:m.start()] + spliced + res[m.end():]
    return res


def mutate_whitespace_variants(payload: str, rng: random.Random) -> str:
    """Replaces spaces with tab, newline, comments, or multiple spaces."""
    substitutions = ["  ", "\t", "/**/", " \t ", "\r\n"]
    words = payload.split(" ")
    if len(words) <= 1:
        return payload
    result = [words[0]]
    for w in words[1:]:
        sep = rng.choice(substitutions)
        result.append(sep + w)
    return "".join(result)


def mutate_html_entities(payload: str, rng: random.Random) -> str:
    """Encodes script tags or angle brackets into HTML entities or hex entities."""
    mapping = {
        "<": ["&lt;", "&#60;", "&#x3c;", "&#X3C;"],
        ">": ["&gt;", "&#62;", "&#x3e;", "&#X3E;"],
        "\"": ["&quot;", "&#34;", "&#x22;"],
        "'": ["&#39;", "&#x27;"],
    }
    out = []
    for c in payload:
        if c in mapping and rng.random() > 0.3:
            out.append(rng.choice(mapping[c]))
        else:
            out.append(c)
    return "".join(out)


def mutate_unicode_fullwidth(payload: str, rng: random.Random) -> str:
    """Transforms ASCII characters to Unicode full-width equivalents (U+FF01 to U+FF5E)."""
    out = []
    for c in payload:
        code = ord(c)
        if 0x21 <= code <= 0x7E and rng.random() > 0.4:
            out.append(chr(code + 0xFEE0))
        else:
            out.append(c)
    return "".join(out)


def mutate_null_bytes(payload: str, rng: random.Random) -> str:
    """Injects URL-encoded null bytes or control characters."""
    nulls = ["%00", "%0d%0a", "%0a", "%08"]
    if len(payload) > 5:
        idx = rng.randint(1, len(payload) - 2)
        return payload[:idx] + rng.choice(nulls) + payload[idx:]
    return payload + "%00"


def mutate_hex_literals(payload: str, rng: random.Random) -> str:
    """Replaces string literals with hex representations: 'admin' -> 0x61646d696e."""
    pattern = re.compile(r"'([a-zA-Z0-9_]{3,12})'")
    def to_hex(m):
        raw = m.group(1)
        return "0x" + raw.encode("utf-8").hex()
    return pattern.sub(to_hex, payload)


# ==============================================================================
# Train Augmentation Recipes
# ==============================================================================
TRAIN_RECIPES = [
    "mixed_case",
    "url_single",
    "url_double",
    "sql_comments",
    "whitespace_variants",
    "html_entities",
    "hex_literals",
]


def apply_train_mutation(payload: str, recipe: str, rng: random.Random) -> str:
    """Applies a specific mutation recipe allowed in training augmentation."""
    if recipe == "mixed_case":
        return mutate_mixed_case(payload, rng)
    elif recipe == "url_single":
        return mutate_url_single(payload, rng)
    elif recipe == "url_double":
        return mutate_url_double(payload, rng)
    elif recipe == "sql_comments":
        return mutate_sql_comments(payload, rng)
    elif recipe == "whitespace_variants":
        return mutate_whitespace_variants(payload, rng)
    elif recipe == "html_entities":
        return mutate_html_entities(payload, rng)
    elif recipe == "hex_literals":
        return mutate_hex_literals(payload, rng)
    return payload


# ==============================================================================
# Held-Out Test Generalization Recipes (NEVER USED IN TRAINING AUGMENTATION)
# ==============================================================================
def mutate_triple_url(payload: str, rng: random.Random) -> str:
    """Held-out recipe 1: Triple URL encoding (% -> %25 -> %2525)."""
    single = urllib.parse.quote(payload, safe="")
    double = single.replace("%", "%25")
    return double.replace("%", "%25")


def mutate_nested_comment_unicode(payload: str, rng: random.Random) -> str:
    """Held-out recipe 2: Spliced inline comments + Full-width Unicode characters."""
    spliced = mutate_sql_comments(payload, rng)
    return mutate_unicode_fullwidth(spliced, rng)


def mutate_null_byte_path_traversal(payload: str, rng: random.Random) -> str:
    """Held-out recipe 3: Overlong UTF-8 / dot-dot-slash with trailing null byte and hex entity."""
    res = payload.replace("../", "..%c0%af").replace("..\\", "..%c0%5c")
    return res + "%00.jpg"


def mutate_mixed_evasion_pipeline(payload: str, rng: random.Random) -> str:
    """Held-out recipe 4: Complex multi-stage pipeline: hex entity + mixed case + comment wrap."""
    p1 = mutate_mixed_case(payload, rng)
    p2 = mutate_html_entities(p1, rng)
    return mutate_null_bytes(p2, rng)


TEST_RECIPES = [
    "triple_url",
    "nested_comment_unicode",
    "null_byte_path_traversal",
    "mixed_evasion_pipeline",
]


def apply_test_mutation(payload: str, recipe: str, rng: random.Random) -> str:
    """Applies a held-out test mutation recipe for zero-shot obfuscation evaluation."""
    if recipe == "triple_url":
        return mutate_triple_url(payload, rng)
    elif recipe == "nested_comment_unicode":
        return mutate_nested_comment_unicode(payload, rng)
    elif recipe == "null_byte_path_traversal":
        return mutate_null_byte_path_traversal(payload, rng)
    elif recipe == "mixed_evasion_pipeline":
        return mutate_mixed_evasion_pipeline(payload, rng)
    return payload


class MutationEngine:
    """High-level generator interface for training augmentation & test sets."""

    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)

    def augment_train_payload(self, payload: str, n_variants: int = 2) -> List[str]:
        """Generates n_variants using only the train-safe recipes."""
        variants = []
        selected_recipes = self.rng.sample(TRAIN_RECIPES, min(n_variants, len(TRAIN_RECIPES)))
        for r in selected_recipes:
            v = apply_train_mutation(payload, r, self.rng)
            if v != payload:
                variants.append(v)
        return variants

    def generate_unseen_test_payload(self, payload: str, recipe: str) -> str:
        """Generates a held-out test mutation variant using unseen recipes."""
        return apply_test_mutation(payload, recipe, self.rng)


if __name__ == "__main__":
    engine = MutationEngine(seed=42)
    sample_sqli = "' UNION SELECT username, password FROM users WHERE 1=1--"
    sample_xss = "<script>alert('AegisGate IDS');</script>"

    print("Original SQLi:", sample_sqli)
    print("Train Augmentations:")
    for v in engine.augment_train_payload(sample_sqli, n_variants=3):
        print("  ->", v)

    print("\nHeld-out Test Generalization Variants:")
    for r in TEST_RECIPES:
        print(f"  [{r}] ->", engine.generate_unseen_test_payload(sample_sqli, r))
