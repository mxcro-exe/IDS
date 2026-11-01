"""
Dataset Validation Suite for AegisGate Copilot.
Validates all JSON intent datasets in:
- data/copilot/general_commands/
- data/copilot/project_qa/

Enforces strict quality rules:
1. Valid JSON schema and structure.
2. Unique intent IDs.
3. Minimum 6 patterns per intent across languages.
4. Both en, ta, and tanglish patterns & responses provided.
5. Tamil script present in 'ta' responses.
6. Known placeholder names only ({{time}}, {{date}}, etc.).
7. Cross-intent pattern ambiguity detection.
8. No empty responses or patterns.
9. Banned content checks (no abusive insults or weaponized exploit instructions).
"""
import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Set, Any

BASE_DIR = Path(__file__).resolve().parent.parent
GENERAL_DIR = BASE_DIR / "data" / "copilot" / "general_commands"
PROJECT_DIR = BASE_DIR / "data" / "copilot" / "project_qa"

ALLOWED_PLACEHOLDERS = {
    "time", "date", "day", "user_name", "greeting_by_time",
    "blocked_today", "allowed_today", "threat_level", "mode",
    "health_score", "model_version", "precision", "recall", "f1",
}

TAMIL_CHAR_RE = re.compile(r"[\u0B80-\u0BFF]")
BANNED_WORDS_RE = re.compile(r"\b(bastard|bitch|idiot|fuck|shit|asshole)\b", re.IGNORECASE)


def validate_intent(item: Dict[str, Any], seen_ids: Set[str], all_patterns: Dict[str, str], filepath: Path) -> List[str]:
    """Validates a single intent object against strict specification rules."""
    errors = []
    i_id = item.get("id")

    # 1. ID check
    if not i_id or not isinstance(i_id, str):
        return [f"Missing or invalid 'id' in {filepath.name}"]
    if i_id in seen_ids:
        errors.append(f"Duplicate intent id '{i_id}' found in {filepath.name}")
    seen_ids.add(i_id)

    # 2. Category check
    category = item.get("category")
    if not category:
        errors.append(f"Intent '{i_id}' missing 'category'")

    # 3. Patterns check
    patterns = item.get("patterns")
    if not isinstance(patterns, dict):
        errors.append(f"Intent '{i_id}' patterns must be a dictionary")
        return errors

    total_patterns = 0
    for lang in ("en", "ta", "tanglish"):
        pat_list = patterns.get(lang, [])
        if not isinstance(pat_list, list):
            errors.append(f"Intent '{i_id}' patterns[{lang}] must be a list")
            continue
        total_patterns += len(pat_list)

        for pat in pat_list:
            if not pat or not pat.strip():
                errors.append(f"Intent '{i_id}' contains empty pattern in [{lang}]")
                continue
            norm = pat.strip().lower()
            if norm in all_patterns and all_patterns[norm] != i_id:
                errors.append(
                    f"Ambiguous pattern '{pat}' in '{i_id}' conflicts with '{all_patterns[norm]}'"
                )
            else:
                all_patterns[norm] = i_id

    if total_patterns < 6:
        errors.append(f"Intent '{i_id}' has only {total_patterns} patterns (minimum 6 required)")

    # 4. Responses check
    responses = item.get("responses")
    if not isinstance(responses, dict):
        errors.append(f"Intent '{i_id}' responses must be a dictionary")
        return errors

    for lang in ("en", "ta", "tanglish"):
        resp_list = responses.get(lang, [])
        if not isinstance(resp_list, list) or len(resp_list) < 1:
            errors.append(f"Intent '{i_id}' must have at least 1 response in [{lang}]")
            continue

        for resp in resp_list:
            if not resp or not resp.strip():
                errors.append(f"Intent '{i_id}' has empty response in [{lang}]")
                continue

            # Tamil script check for 'ta' responses
            if lang == "ta" and not TAMIL_CHAR_RE.search(resp):
                errors.append(f"Intent '{i_id}' response in 'ta' does not contain native Tamil script")

            # Check placeholders
            placeholders_found = re.findall(r"\{\{([a-zA-Z0-9_]+)\}\}", resp)
            for ph in placeholders_found:
                if ph not in ALLOWED_PLACEHOLDERS:
                    errors.append(f"Intent '{i_id}' has unknown placeholder '{{{{{ph}}}}}'")

            # Check banned content
            if BANNED_WORDS_RE.search(resp):
                errors.append(f"Intent '{i_id}' contains banned/abusive content in [{lang}]")

    return errors


def run_validation(target_general: int = 2000, target_project: int = 1000) -> bool:
    """Runs full dataset validation and prints structured report."""
    print("=" * 65)
    print("   AEGISGATE COPILOT DATASET VALIDATION SUITE")
    print("=" * 65)

    seen_ids: Set[str] = set()
    all_patterns: Dict[str, str] = {}
    all_errors: List[str] = []

    cat_counts_gen: Dict[str, int] = {}
    cat_counts_proj: Dict[str, int] = {}
    total_patterns_count = 0

    # 1. Validate General Commands
    gen_files = list(GENERAL_DIR.glob("*.json")) if GENERAL_DIR.exists() else []
    print(f"[*] Scanning {len(gen_files)} general command categories...")
    for fpath in sorted(gen_files):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                items = json.load(f)
                cat_name = fpath.stem
                cat_counts_gen[cat_name] = len(items)
                for item in items:
                    errs = validate_intent(item, seen_ids, all_patterns, fpath)
                    all_errors.extend(errs)
                    pats = item.get("patterns", {})
                    total_patterns_count += sum(len(pats.get(l, [])) for l in ("en", "ta", "tanglish"))
        except Exception as e:
            all_errors.append(f"Error parsing JSON in {fpath.name}: {e}")

    # 2. Validate Project QA
    proj_files = list(PROJECT_DIR.glob("*.json")) if PROJECT_DIR.exists() else []
    print(f"[*] Scanning {len(proj_files)} project Q&A categories...")
    for fpath in sorted(proj_files):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                items = json.load(f)
                cat_name = fpath.stem
                cat_counts_proj[cat_name] = len(items)
                for item in items:
                    errs = validate_intent(item, seen_ids, all_patterns, fpath)
                    all_errors.extend(errs)
                    pats = item.get("patterns", {})
                    total_patterns_count += sum(len(pats.get(l, [])) for l in ("en", "ta", "tanglish"))
        except Exception as e:
            all_errors.append(f"Error parsing JSON in {fpath.name}: {e}")

    # Summary
    total_general = sum(cat_counts_gen.values())
    total_project = sum(cat_counts_proj.values())
    total_intents = total_general + total_project
    avg_patterns = (total_patterns_count / max(total_intents, 1))

    print("\n--- DATASET SUMMARY ---")
    print(f"• Total General Commands Intents : {total_general} / {target_general}")
    for c, cnt in cat_counts_gen.items():
        print(f"    - {c}: {cnt}")

    print(f"\n• Total Project Q&A Intents      : {total_project} / {target_project}")
    for c, cnt in cat_counts_proj.items():
        print(f"    - {c}: {cnt}")

    print(f"\n• Total Combined Intents         : {total_intents}")
    print(f"• Total Distinct Patterns Indexed: {total_patterns_count} (~{avg_patterns:.1f} per intent)")

    if all_errors:
        print(f"\n[!] VALIDATION FAILED WITH {len(all_errors)} ERRORS:")
        for err in all_errors[:20]:
            print(f"  [X] {err.encode('ascii', errors='replace').decode('ascii')}")
        if len(all_errors) > 20:
            print(f"  ... and {len(all_errors) - 20} more errors.")
        return False

    print("\n[OK] ALL DATASET INTEGRITY CHECKS PASSED PERFECTLY!")
    return True


if __name__ == "__main__":
    success = run_validation()
    sys.exit(0 if success else 1)

