# AegisGate ML Training & Evaluation Datasets

This directory contains raw, processed, and partitioned datasets used to train, calibrate, and evaluate the AegisGate AI-Powered API Gateway IDS models (M1 through M8).

## Common Request Schema
Every sample conforms to the unified schema:
- `method`: HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.)
- `path`: URL endpoint path (e.g. `/api/v1/search`, `/login`, `/admin/config`)
- `query`: Query string parameters (raw or encoded)
- `headers`: HTTP headers (JSON string)
- `body`: Request payload body
- `label`: Binary classification label (`0` = Benign, `1` = Malicious)
- `attack_type`: Multi-class label (`Benign`, `SQLi`, `XSS`, `Path Traversal`, `Command Injection`, `Brute Force/Auth Abuse`, `Other`)
- `source`: Provenance of the sample (`csic_2010`, `synthetic`, `hard_negatives`, `mutation_aug`, `feedback`)
- `seed_id`: Unique identifier of the seed request for group-aware splitting (prevents mutation and near-duplicate leakage across splits)

## Data Sources & Provenance

### 1. CSIC 2010 HTTP Dataset
- **Description**: Standard benchmark developed by the Information Security Institute of CSIC (Spanish Research Council). Contains thousands of normal and anomalous HTTP requests against an e-commerce web application.
- **License**: Open Academic Research License.
- **Attacks Mapped**: SQL Injection, Cross-Site Scripting, Parameter Tampering, Path Traversal, Information Disclosure.

### 2. Hard Negatives Corpus
- **Description**: Benign web requests specifically crafted with confusing syntax to stress-test false positive rejection:
  - English sentences containing SQL keywords (`SELECT`, `UNION`, `DROP`, `UPDATE`) in search queries, forum titles, and customer feedback.
  - Code snippets in developer discussion posts (`def query(): return db.select()`, `<div>safe preview</div>`).
  - JSON payloads with mathematical/logical operators and angle brackets (`{"filter": "<100>", "condition": "x < y"}`).
  - File paths containing multiple dots, extensions, and version tags (`report.2024.final.pdf`, `photo.profile.v2.png`).
  - Legitimate encoded characters in search strings (`/search?q=C%2B%2B+concurrency`, `/docs?tag=R%26D`).
  - Tamil and multilingual Unicode text (`வணக்கம்`, `பாதுகாப்பு சோதனை`, `பயனர் தேடல்`, accents, CJK).
  - Base64-encoded legitimate avatars and Bearer tokens.
  - SQL tutorial and blog discussion content.
- **Label**: `0` (`Benign`).

### 3. Comprehensive Harmless Synthetic Attack Corpus
- **Description**: Standardized, harmless test payload strings covering all seven target classes with syntactic variations.
- **Classes**:
  - `SQLi`: Tautologies (`' OR 1=1--`), union queries (`' UNION SELECT 1,2,3--`), error-based (`'; WAITFOR DELAY '0:0:5'--`), stacked queries.
  - `XSS`: Reflected/stored script tags, event handlers (`onerror=alert(1)`), iframe injections, svg payloads.
  - `Path Traversal`: Dot-dot-slash variations (`../../etc/passwd`, `..\\..\\windows\\win.ini`), null-byte variations, sensitive system targets.
  - `Command Injection`: Semicolon, pipe, backtick, and subshell injections (`cat /etc/passwd`, `id`, `whoami`, `curl http://test.local`).
  - `Brute Force/Auth Abuse`: High-frequency login attempts, credential stuffing tokens, basic auth sprays, JWT tampering probes.
  - `Other`: Honeypot probing, unusual method fuzzing, SSRF probes (`http://169.254.169.254/latest/meta-data/`).
- **License**: MIT / Public Domain harmless academic test vectors.
- **Tag**: `source="synthetic"`.

### 4. Mutation Augmentation & Generalization Test Sets
- **Train Augmentations**: Mixed-case, single/double URL encoding, inline SQL comments (`SEL/**/ECT`), whitespace substitutions, HTML entity encoding, hex literals.
- **Separate Generalization Test Recipes**: Triple encoding, nested comment-obfuscated Unicode, multi-layer concatenated encoding recipes held out exclusively for out-of-distribution mutation generalization testing.

## Splitting Strategy & Leakage Control
- **Split Ratio**: 65% Train, 10% Validation (early stopping & threshold optimization), 10% Calibration (probability calibration), 15% Held-Out Test (final benchmark only).
- **Group-Aware Splitting**: Seed payloads and their mutations share the exact same `seed_id`. Group-aware stratified splitting guarantees that no variant of a seed payload ever leaks across splits.
- **Reproducibility**: Seed fixed at `random_state=42`. All split checksums (SHA-256) are saved in `data/split_info.json`.
