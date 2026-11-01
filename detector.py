"""
Hybrid Intrusion Detection & Explainability Engine.
Combines Random Forest (supervised multi-class) + Isolation Forest (zero-day anomaly)
+ TreeSHAP local feature attribution + Behavioral & Rule risk weighting.
"""
import time
import joblib
import numpy as np
import shap
from pathlib import Path
from typing import Dict, Any, Tuple, List, Optional

from features import (
    FEATURE_NAMES,
    extract_features,
    features_to_vector,
)
from mitre import get_mitre_details
from config import (
    MODELS_DIR,
    DEFAULT_WEIGHT_ML,
    DEFAULT_WEIGHT_BEHAVIORAL,
    DEFAULT_WEIGHT_RULES,
    DEFAULT_WARN_THRESHOLD,
    DEFAULT_BLOCK_THRESHOLD,
)

CLASS_NAMES = [
    "Benign",
    "SQL_Injection",
    "XSS",
    "Path_Traversal",
    "Command_Injection",
    "Brute_Force",
]


class HybridIDSDetector:
    def __init__(self):
        self.rf_model = None
        self.iso_model = None
        self.shap_explainer = None
        self.is_loaded = False
        self.model_version = "v1.0"

        # Configurable Weights & Thresholds
        self.weight_ml = DEFAULT_WEIGHT_ML
        self.weight_behavioral = DEFAULT_WEIGHT_BEHAVIORAL
        self.weight_rules = DEFAULT_WEIGHT_RULES
        self.warn_threshold = DEFAULT_WARN_THRESHOLD
        self.block_threshold = DEFAULT_BLOCK_THRESHOLD

        self.load_models()

    def update_settings(
        self,
        weight_ml: float,
        weight_beh: float,
        weight_rules: float,
        warn_th: float,
        block_th: float,
    ):
        """Allows dynamic weight tuning from settings."""
        self.weight_ml = weight_ml
        self.weight_behavioral = weight_beh
        self.weight_rules = weight_rules
        self.warn_threshold = warn_th
        self.block_threshold = block_th

    def load_models(self) -> bool:
        """Loads trained Random Forest and Isolation Forest binaries."""
        rf_path = MODELS_DIR / "model.pkl"
        iso_path = MODELS_DIR / "iso_model.pkl"

        if rf_path.exists() and iso_path.exists():
            try:
                self.rf_model = joblib.load(rf_path)
                self.iso_model = joblib.load(iso_path)
                # Initialize SHAP TreeExplainer for fast local explanation
                self.shap_explainer = shap.TreeExplainer(self.rf_model)
                self.is_loaded = True
                print("[OK] Hybrid ML models & SHAP TreeExplainer loaded successfully.")
                return True
            except Exception as e:
                print(f"[!] Error loading models: {e}")
                self.is_loaded = False
                return False
        return False

    def predict_request(
        self,
        method: str,
        path: str,
        query: str = "",
        body: str = "",
        headers: Dict[str, str] = None,
        client_stats: Dict[str, float] = None,
        rule_risk: float = 0.0,
        forced_attack_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete inspection:
        1. Feature extraction & obfuscation normalization
        2. Supervised ML prediction (Random Forest)
        3. Anomaly detection (Isolation Forest)
        4. SHAP feature attribution
        5. Weighted risk scoring -> ALLOW / WARN / BLOCK decision
        """
        if headers is None:
            headers = {}
        if client_stats is None:
            client_stats = {
                "request_frequency": 1.0,
                "unique_endpoint_count": 1.0,
                "recent_suspicious_count": 0.0,
                "behavioral_deviation_score": 0.0,
                "behavioral_risk": 0.0,
            }

        t0 = time.perf_counter()

        # 1. Feature Extraction & Normalization
        features, obf_detected, obf_techniques, norm_payload = extract_features(
            method=method,
            path=path,
            query_string=query,
            body=body,
            headers=headers,
            client_stats=client_stats,
        )
        vector = features_to_vector(features)
        X = np.array([vector])

        # Default fallback if model not loaded
        if not self.is_loaded:
            self.load_models()

        if self.is_loaded and self.rf_model is not None:
            # Random Forest Probabilities
            probs = self.rf_model.predict_proba(X)[0]
            pred_class_idx = int(np.argmax(probs))
            confidence = float(probs[pred_class_idx])
            pred_class_name = CLASS_NAMES[pred_class_idx]

            # Supervised Risk = 1.0 - P(Benign)
            rf_risk = float(1.0 - probs[0])

            # Isolation Forest Anomaly Score
            # score_samples returns negative values (lower means more anomalous)
            iso_raw = float(self.iso_model.score_samples(X)[0])
            # Normalize to 0.0 - 1.0 where 1.0 is highest anomaly
            iso_risk = float(np.clip(0.5 - (iso_raw * 1.5), 0.0, 1.0))

            # Combine Supervised + Unsupervised
            ml_risk = round((0.80 * rf_risk) + (0.20 * iso_risk), 4)

            # Fast SHAP Attribution for anomalous/attack predictions
            shap_contributions = self._compute_shap_reasons(X, pred_class_idx, features)
        else:
            # Fallback heuristic if models missing
            pred_class_name = "Benign"
            confidence = 0.50
            ml_risk = 0.10
            shap_contributions = []

        # If rule module explicitly specified attack (e.g. Honeypot, Scanner)
        if forced_attack_type:
            pred_class_name = forced_attack_type
            confidence = 1.0

        # Behavioral Risk from client tracker
        behavioral_risk = float(client_stats.get("behavioral_risk", 0.0))

        # Deterministic attack indicators boost rule risk
        if features.get("sql_operator_indicator", 0) > 0 and features.get("sql_keyword_indicator", 0) > 0:
            rule_risk = max(rule_risk, 0.95)
            if pred_class_name == "Benign":
                pred_class_name = "SQL_Injection"
                confidence = 0.96
        elif features.get("xss_tag_indicator", 0) > 0 or features.get("xss_event_handler_indicator", 0) > 0:
            rule_risk = max(rule_risk, 0.95)
            if pred_class_name == "Benign":
                pred_class_name = "XSS"
                confidence = 0.95
        elif features.get("path_traversal_indicator", 0) > 0:
            rule_risk = max(rule_risk, 0.95)
            if pred_class_name == "Benign":
                pred_class_name = "Path_Traversal"
                confidence = 0.95
        elif features.get("null_control_char_indicator", 0) > 0:
            rule_risk = max(rule_risk, 0.92)
            if pred_class_name == "Benign":
                pred_class_name = "Command_Injection"
                confidence = 0.92

        # 4. Multi-Factor Risk Score Calculation
        weighted_risk = (
            (self.weight_ml * ml_risk)
            + (self.weight_behavioral * behavioral_risk)
            + (self.weight_rules * rule_risk)
        )
        
        # High confidence threats escalate directly to BLOCK threshold
        if rule_risk >= 0.85 or ml_risk >= 0.80:
            final_risk = round(max(rule_risk, ml_risk, weighted_risk), 4)
        else:
            final_risk = round(weighted_risk, 4)

        # 5. Policy Decision: ALLOW / WARN / BLOCK
        if final_risk >= self.block_threshold:
            action = "BLOCK"
        elif final_risk >= self.warn_threshold:
            action = "WARN"
        else:
            action = "ALLOW"

        t1 = time.perf_counter()
        latency_ms = round((t1 - t0) * 1000.0, 2)

        # Generate Bilingual Reasons
        reason_en, reason_ta = self._generate_bilingual_explanation(
            action, pred_class_name, final_risk, shap_contributions, obf_techniques
        )

        # MITRE ATT&CK Metadata
        mitre_info = get_mitre_details(pred_class_name)

        # Active triggered indicators
        triggered_indicators = [
            k for k, v in features.items() if v > 0.0 and ("indicator" in k or "density" in k)
        ]
        if obf_detected:
            triggered_indicators.append("obfuscation_detected")

        return {
            "action": action,
            "risk_score": final_risk,
            "attack_type": pred_class_name,
            "confidence": round(confidence, 4),
            "ml_risk": ml_risk,
            "behavioral_risk": behavioral_risk,
            "rule_risk": rule_risk,
            "latency_ms": latency_ms,
            "reason_en": reason_en,
            "reason_ta": reason_ta,
            "mitre": mitre_info,
            "shap_contributions": shap_contributions,
            "triggered_indicators": triggered_indicators,
            "obfuscation_detected": obf_detected,
            "obfuscation_techniques": obf_techniques,
            "normalized_payload": norm_payload,
            "features": features,
        }

    def _compute_shap_reasons(
        self, X: np.ndarray, class_idx: int, features: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Calculates top contributing features using SHAP TreeExplainer."""
        if self.shap_explainer is None:
            return []

        try:
            shap_values = self.shap_explainer.shap_values(X)
            # Depending on shap version, shape can be list of arrays or 3D array
            if isinstance(shap_values, list):
                vals = shap_values[class_idx][0]
            elif len(shap_values.shape) == 3:
                vals = shap_values[0, :, class_idx]
            else:
                vals = shap_values[0]

            contributions = []
            for i, feat_name in enumerate(FEATURE_NAMES):
                contributions.append({
                    "feature": feat_name,
                    "contribution": round(float(vals[i]), 4),
                    "value": round(float(features.get(feat_name, 0.0)), 4),
                })

            # Sort by absolute impact descending
            contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
            return contributions[:5]
        except Exception:
            return []

    def _generate_bilingual_explanation(
        self,
        action: str,
        attack_type: str,
        risk_score: float,
        shap_items: List[Dict[str, Any]],
        obf_techniques: List[str],
    ) -> Tuple[str, str]:
        """Creates human-readable explanation in English and Tamil."""
        if action == "ALLOW":
            return (
                f"Request verified benign (Risk Score: {risk_score:.2f}). Within normal baseline parameters.",
                f"கோரிக்கை பாதுகாப்பானது என சரிபார்க்கப்பட்டது (ஆபத்து அளவு: {risk_score:.2f}). சாதாரண வரம்பிற்குள் உள்ளது.",
            )

        top_factors = []
        for item in shap_items[:3]:
            name = item["feature"].replace("_indicator", "").replace("_", " ")
            top_factors.append(f"{name} ({item['contribution']:+.2f})")

        factor_str_en = " + ".join(top_factors) if top_factors else "anomaly patterns"

        obf_str_en = f" [Obfuscation: {', '.join(obf_techniques)}]" if obf_techniques else ""
        obf_str_ta = " [குறியீட்டு மறைப்பு கண்டறியப்பட்டது]" if obf_techniques else ""

        reason_en = (
            f"Flagged {attack_type} ({action}) with Risk Score {risk_score:.2f}. "
            f"Top contributing factors: {factor_str_en}.{obf_str_en}"
        )

        reason_ta = (
            f"{attack_type} தாக்குதல் கண்டறியப்பட்டு {action} செய்யப்பட்டது (ஆபத்து அளவு: {risk_score:.2f}). "
            f"முக்கிய காரணிகள்: {factor_str_en}.{obf_str_ta}"
        )

        return reason_en, reason_ta


# Singleton hybrid detector
detector = HybridIDSDetector()
