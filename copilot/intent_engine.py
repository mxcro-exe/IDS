"""
AegisGate Copilot Intent Matching Engine.
Implements:
1. Exact match index (normalized pattern -> intent, sub-microsecond).
2. Fuzzy matching (rapidfuzz token_set_ratio & token_sort_ratio).
3. Semantic matching (TF-IDF n-gram vector index with cosine similarity).
4. Three-tier confidence thresholds (Immediate >= 0.80/0.88, Clarification 0.65-0.80, Fallback < 0.65).
5. Anti-repetition response variant cycling.
6. Multi-turn conversation context tracking (last 5 turns).
7. Dynamic placeholder resolution (fill_placeholders).
"""
import os
import json
import random
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from copilot.normalizer import normalize_text
from copilot.lang_detect import detect_language
from copilot.placeholders import fill_placeholders

BASE_DIR = Path(__file__).resolve().parent.parent
GENERAL_COMMANDS_DIR = BASE_DIR / "data" / "copilot" / "general_commands"
PROJECT_QA_DIR = BASE_DIR / "data" / "copilot" / "project_qa"


class Intent:
    def __init__(self, data: Dict[str, Any], source_type: str = "general"):
        self.id = data["id"]
        self.category = data.get("category", "general")
        self.source_type = source_type  # 'general' or 'project'
        self.patterns = data.get("patterns", {"en": [], "ta": [], "tanglish": []})
        self.responses = data.get("responses", {"en": [], "ta": [], "tanglish": []})
        self.chips = data.get("chips", [])
        self.action = data.get("action", None)
        self.needs_live_data = data.get("needs_live_data", False)
        self.tags = data.get("tags", [])


class IntentEngine:
    def __init__(self):
        self.intents: Dict[str, Intent] = {}
        self.exact_map: Dict[str, Tuple[str, str]] = {}  # normalized_text -> (intent_id, lang)
        self.all_pattern_texts: List[str] = []
        self.pattern_to_intent: List[Tuple[str, str]] = []  # index -> (intent_id, lang)
        
        # Anti-repetition state: intent_id -> last_response_index
        self.last_response_index: Dict[str, int] = {}
        
        # User session context: session_id -> list of last turns
        self.sessions: Dict[str, List[Dict[str, Any]]] = {}

        # Vectorizer and matrix for semantic search
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None

        # Thresholds
        self.EXACT_THRESHOLD = 1.0
        self.FUZZY_THRESHOLD = 0.88
        self.SEMANTIC_THRESHOLD = 0.80
        self.CLARIFICATION_MIN = 0.65

        # Initial load
        self.reload_intents()

    def reload_intents(self):
        """Loads all JSON intent files from general_commands and project_qa."""
        self.intents.clear()
        self.exact_map.clear()
        self.all_pattern_texts.clear()
        self.pattern_to_intent.clear()

        # 1. Load general commands
        if GENERAL_COMMANDS_DIR.exists():
            for p in sorted(GENERAL_COMMANDS_DIR.glob("*.json")):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        items = json.load(f)
                        if isinstance(items, list):
                            for item in items:
                                self._register_intent(item, source_type="general")
                except Exception as e:
                    print(f"[!] Error loading {p}: {e}")

        # 2. Load project QA
        if PROJECT_QA_DIR.exists():
            for p in sorted(PROJECT_QA_DIR.glob("*.json")):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        items = json.load(f)
                        if isinstance(items, list):
                            for item in items:
                                self._register_intent(item, source_type="project")
                except Exception as e:
                    print(f"[!] Error loading {p}: {e}")

        # 3. Fit TF-IDF semantic index if we have patterns
        if self.all_pattern_texts:
            self.vectorizer = TfidfVectorizer(
                analyzer="char_wb",
                ngram_range=(2, 4),
                min_df=1,
                lowercase=False
            )
            self.tfidf_matrix = self.vectorizer.fit_transform(self.all_pattern_texts)

    def _register_intent(self, data: Dict[str, Any], source_type: str):
        intent = Intent(data, source_type=source_type)
        self.intents[intent.id] = intent

        # Build exact map and list of patterns
        for lang, pat_list in intent.patterns.items():
            for pat in pat_list:
                norm = normalize_text(pat)
                if norm:
                    self.exact_map[norm] = (intent.id, lang)
                    self.all_pattern_texts.append(norm)
                    self.pattern_to_intent.append((intent.id, lang))

    def get_intent_count(self) -> Dict[str, int]:
        """Returns total counts for general commands and project QA."""
        gen_count = sum(1 for i in self.intents.values() if i.source_type == "general")
        proj_count = sum(1 for i in self.intents.values() if i.source_type == "project")
        return {
            "total": len(self.intents),
            "general": gen_count,
            "project": proj_count,
            "patterns": len(self.all_pattern_texts),
        }

    def match(
        self,
        query: str,
        user_lang: Optional[str] = None,
        session_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Executes multi-tier intent matching for a normalized query:
        1. Contextual follow-up check.
        2. Exact match.
        3. Fuzzy match.
        4. Semantic TF-IDF match.
        Returns match dict with:
        - match_type: 'exact' | 'fuzzy' | 'semantic' | 'clarification' | 'none'
        - intent: Optional[Intent]
        - confidence: float
        - response_text: str
        - chips: List[str]
        - action: Optional[Dict]
        - lang: str
        """
        detected_lang = user_lang or detect_language(query)
        norm_query = normalize_text(query)

        if not norm_query:
            return {"match_type": "none", "confidence": 0.0, "intent": None}

        # Contextual follow-up handling
        context_result = self._handle_context_followup(norm_query, detected_lang, session_id)
        if context_result:
            return context_result

        # Level 1: Exact Match (Hash map lookup)
        if norm_query in self.exact_map:
            intent_id, matched_lang = self.exact_map[norm_query]
            intent = self.intents[intent_id]
            resp = self._pick_response(intent, detected_lang)
            self._update_session(session_id, query, intent.id)
            return {
                "match_type": "exact",
                "confidence": 1.0,
                "intent": intent,
                "response_text": resp,
                "chips": intent.chips,
                "action": intent.action,
                "lang": detected_lang,
            }

        # Level 2: Fuzzy Match (RapidFuzz token_set_ratio & partial ratio)
        best_fuzzy_score = 0.0
        best_fuzzy_idx = -1

        for idx, pat in enumerate(self.all_pattern_texts):
            # RapidFuzz returns 0-100
            score = fuzz.token_set_ratio(norm_query, pat) / 100.0
            if score > best_fuzzy_score:
                best_fuzzy_score = score
                best_fuzzy_idx = idx
                if score >= 0.98:
                    break

        if best_fuzzy_score >= self.FUZZY_THRESHOLD and best_fuzzy_idx >= 0:
            intent_id, _ = self.pattern_to_intent[best_fuzzy_idx]
            intent = self.intents[intent_id]
            resp = self._pick_response(intent, detected_lang)
            self._update_session(session_id, query, intent.id)
            return {
                "match_type": "fuzzy",
                "confidence": round(best_fuzzy_score, 4),
                "intent": intent,
                "response_text": resp,
                "chips": intent.chips,
                "action": intent.action,
                "lang": detected_lang,
            }

        # Level 3: Semantic Match (TF-IDF character n-gram cosine similarity)
        best_semantic_score = 0.0
        top_candidates = []

        if self.vectorizer and self.tfidf_matrix is not None and len(self.all_pattern_texts) > 0:
            query_vec = self.vectorizer.transform([norm_query])
            sims = cosine_similarity(query_vec, self.tfidf_matrix)[0]
            top_indices = np.argsort(sims)[::-1][:5]

            best_semantic_score = float(sims[top_indices[0]]) if len(top_indices) > 0 else 0.0

            if best_semantic_score >= self.SEMANTIC_THRESHOLD:
                intent_id, _ = self.pattern_to_intent[top_indices[0]]
                intent = self.intents[intent_id]
                resp = self._pick_response(intent, detected_lang)
                self._update_session(session_id, query, intent.id)
                return {
                    "match_type": "semantic",
                    "confidence": round(best_semantic_score, 4),
                    "intent": intent,
                    "response_text": resp,
                    "chips": intent.chips,
                    "action": intent.action,
                    "lang": detected_lang,
                }

            # Collect top 2-3 distinct candidates for clarification
            seen_intents = set()
            for idx in top_indices:
                score = float(sims[idx])
                if score >= self.CLARIFICATION_MIN:
                    i_id, _ = self.pattern_to_intent[idx]
                    if i_id not in seen_intents:
                        seen_intents.add(i_id)
                        top_candidates.append((self.intents[i_id], score))
                        if len(top_candidates) >= 3:
                            break

        # Level 4: Clarification Flow (0.65 <= confidence < 0.80)
        overall_best = max(best_fuzzy_score, best_semantic_score)
        if overall_best >= self.CLARIFICATION_MIN and top_candidates:
            clarification_chips = []
            for cand, _ in top_candidates:
                # Use first pattern or a chip
                if cand.patterns.get(detected_lang):
                    clarification_chips.append(cand.patterns[detected_lang][0])
                elif cand.chips:
                    clarification_chips.append(cand.chips[0])

            if detected_lang == "ta":
                prompt_text = "நீங்கள் இதை கேட்கிறீர்களா? கீழே உள்ள விருப்பங்களைத் தேர்ந்தெடுக்கவும்:"
            elif detected_lang == "tanglish":
                prompt_text = "Neenga idhai ketteengala? Keezhe ulla options-la onna choose pannunga:"
            else:
                prompt_text = "Did you mean one of these? Please select an option:"

            return {
                "match_type": "clarification",
                "confidence": round(overall_best, 4),
                "intent": None,
                "response_text": prompt_text,
                "chips": clarification_chips[:3],
                "action": None,
                "lang": detected_lang,
            }

        # Fallback to Step 3 / 4 / 5
        return {
            "match_type": "none",
            "confidence": round(overall_best, 4),
            "intent": None,
            "lang": detected_lang,
        }

    def _handle_context_followup(
        self, norm_query: str, lang: str, session_id: str
    ) -> Optional[Dict[str, Any]]:
        """Handles multi-turn followups like 'explain more', 'why', 'in tamil', 'yes', 'no'."""
        history = self.sessions.get(session_id, [])
        if not history:
            return None

        last_turn = history[-1]
        last_intent_id = last_turn.get("intent_id")
        if not last_intent_id or last_intent_id not in self.intents:
            return None

        last_intent = self.intents[last_intent_id]

        # 'in tamil' request
        if norm_query in ("in tamil", "tamil la", "tamilil", "tamilil sollu", "tamil la sollu"):
            resp = self._pick_response(last_intent, "ta")
            return {
                "match_type": "context_followup",
                "confidence": 1.0,
                "intent": last_intent,
                "response_text": resp,
                "chips": last_intent.chips,
                "action": last_intent.action,
                "lang": "ta",
            }

        # 'explain more' / 'slower' / 'why'
        if norm_query in ("explain more", "more details", "in detail", "vilakkama sollu", "more info", "why"):
            # If technical details or longer variant exists
            resp = self._pick_response(last_intent, lang, prefer_long=True)
            return {
                "match_type": "context_followup",
                "confidence": 1.0,
                "intent": last_intent,
                "response_text": resp,
                "chips": last_intent.chips,
                "action": last_intent.action,
                "lang": lang,
            }

        # 'yes' / 'ok' confirmation to previous chip
        if norm_query in ("yes", "aama", "sari", "ok", "confirm"):
            resp = (
                "சரி, செயல்முறை தொடரப்பட்டது."
                if lang == "ta"
                else "Got it. Proceeding with the action."
            )
            return {
                "match_type": "context_followup",
                "confidence": 1.0,
                "intent": last_intent,
                "response_text": resp,
                "chips": [],
                "action": last_intent.action,
                "lang": lang,
            }

        return None

    def _pick_response(self, intent: Intent, lang: str, prefer_long: bool = False) -> str:
        """Selects a response variant, avoiding repeating the exact same variant consecutively."""
        variants = intent.responses.get(lang) or intent.responses.get("en") or []
        if not variants:
            return "Information is currently unavailable."

        if prefer_long and len(variants) > 1:
            # Pick longest variant
            chosen = max(variants, key=len)
        else:
            # Avoid repeating last index
            last_idx = self.last_response_index.get(intent.id, -1)
            choices = [i for i in range(len(variants)) if i != last_idx]
            if not choices:
                choices = list(range(len(variants)))
            picked_idx = random.choice(choices)
            self.last_response_index[intent.id] = picked_idx
            chosen = variants[picked_idx]

        # Fill runtime placeholders
        return fill_placeholders(chosen, lang=lang)

    def _update_session(self, session_id: str, query: str, intent_id: str):
        """Keeps up to 5 history turns per session."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        self.sessions[session_id].append({
            "query": query,
            "intent_id": intent_id,
        })
        if len(self.sessions[session_id]) > 5:
            self.sessions[session_id].pop(0)


# Global singleton instance
intent_engine = IntentEngine()

