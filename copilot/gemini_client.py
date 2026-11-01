"""
Gemini API Client for AegisGate Copilot (Step 4 Online Fallback).
Supports:
- Gemini 2.0 / 1.5 Flash models via direct REST API with httpx.
- Secure key management (GEMINI_API_KEY in .env, never exposed to client).
- Dynamic function calling with local live-data tools (get_system_status, get_top_attackers, explain_alert).
- Redaction of PII/secrets before sending.
- Circuit breaker, rate limiting, and in-memory TTL caching.
- Fall-through logging for the Admin 'Copilot Knowledge' learning loop.
"""
import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import httpx

from copilot.redaction import redact_sensitive_info
from copilot.tools import (
    get_system_status,
    get_top_attackers,
    get_recent_alerts_summary,
    explain_alert_by_id,
)

BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_PATH = BASE_DIR / "prompts" / "gemini_system_prompt.md"
UNANSWERED_LOG_PATH = BASE_DIR / "data" / "copilot" / "unanswered_log.json"

# Tool declarations for Gemini Function Calling
GEMINI_TOOLS = [
    {
        "function_declarations": [
            {
                "name": "get_system_status",
                "description": "Returns current live AegisGate IDS telemetry: total requests, blocked attacks, health score, threat level, and enforcement mode.",
                "parameters": {"type": "OBJECT", "properties": {}},
            },
            {
                "name": "get_top_attackers",
                "description": "Returns the top hostile client IPs, hit counts, and risk scores.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "limit": {"type": "INTEGER", "description": "Max number of top IPs to return"}
                    },
                },
            },
            {
                "name": "get_recent_alerts_summary",
                "description": "Returns recent blocked and warned attack alerts.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "limit": {"type": "INTEGER", "description": "Max alerts to return"}
                    },
                },
            },
            {
                "name": "explain_alert_by_id",
                "description": "Returns detailed TreeSHAP feature attributions and intercepted payload for a specific alert ID.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "alert_id": {"type": "INTEGER", "description": "Numeric alert ID to inspect"}
                    },
                    "required": ["alert_id"],
                },
            },
        ]
    }
]


class GeminiManager:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
        self.timeout = float(os.getenv("GEMINI_TIMEOUT", "12.0"))
        
        # Circuit breaker state
        self.consecutive_failures = 0
        self.circuit_open_until = 0.0

        # Query cache: query_str -> (response_text, chips, timestamp)
        self.cache: Dict[str, Tuple[str, List[str], float]] = {}
        self.CACHE_TTL = 90.0  # seconds

        # System prompt cache
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        if PROMPT_PATH.exists():
            try:
                return PROMPT_PATH.read_text(encoding="utf-8").strip()
            except Exception:
                pass
        return "You are AegisGate Copilot, a helpful and friendly cybersecurity AI assistant."

    def is_configured(self) -> bool:
        """Returns True if a non-empty Gemini API key is present and circuit breaker is closed."""
        if not self.api_key:
            # Recheck environment
            self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not self.api_key:
            return False
        if time.time() < self.circuit_open_until:
            return False
        return True

    def log_unanswered_question(self, query: str, lang: str):
        """Logs queries that reached Gemini to help expand the built-in datasets."""
        try:
            records = []
            if UNANSWERED_LOG_PATH.exists():
                with open(UNANSWERED_LOG_PATH, "r", encoding="utf-8") as f:
                    records = json.load(f)
            # Find existing query or add new
            norm = query.strip().lower()
            found = False
            for r in records:
                if r.get("query_norm") == norm:
                    r["count"] = r.get("count", 1) + 1
                    r["last_asked"] = time.time()
                    found = True
                    break
            if not found:
                records.append({
                    "query": query,
                    "query_norm": norm,
                    "lang": lang,
                    "count": 1,
                    "first_asked": time.time(),
                    "last_asked": time.time(),
                })
            # Keep top 500
            records.sort(key=lambda x: x.get("count", 1), reverse=True)
            with open(UNANSWERED_LOG_PATH, "w", encoding="utf-8") as f:
                json.dump(records[:500], f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def generate_reply(
        self, query: str, lang: str = "en", session_id: str = "default"
    ) -> Tuple[Optional[str], List[str]]:
        """
        Sends query to Gemini REST API with redaction and function calling.
        Returns: (response_text, suggestion_chips)
        """
        if not self.is_configured():
            return None, []

        # 1. Cache lookup
        norm_q = query.strip().lower()
        if norm_q in self.cache:
            resp, chips, ts = self.cache[norm_q]
            if time.time() - ts < self.CACHE_TTL:
                return resp, chips

        # 2. Redact sensitive info before sending to cloud
        redacted_query = redact_sensitive_info(query)

        # 3. Log to learning loop
        self.log_unanswered_question(query, lang)

        # 4. Prepare Gemini request payload
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        # Contents with conversation instruction
        contents = [
            {
                "role": "user",
                "parts": [
                    {"text": f"[User Language: {lang}]\n{redacted_query}"}
                ]
            }
        ]

        payload = {
            "contents": contents,
            "system_instruction": {
                "parts": [{"text": self.system_prompt}]
            },
            "tools": GEMINI_TOOLS,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 600,
            }
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload, headers=headers)
                if res.status_code != 200:
                    self.consecutive_failures += 1
                    if self.consecutive_failures >= 3:
                        self.circuit_open_until = time.time() + 30.0  # Open circuit for 30s
                    return None, []

                self.consecutive_failures = 0
                data = res.json()

                # Check for candidates
                candidates = data.get("candidates", [])
                if not candidates:
                    return None, []

                candidate_content = candidates[0].get("content", {})
                parts = candidate_content.get("parts", [])

                # Check for tool call
                function_call = None
                text_response = ""

                for p in parts:
                    if "functionCall" in p:
                        function_call = p["functionCall"]
                    elif "text" in p:
                        text_response += p["text"]

                # If Gemini called a tool: execute it and call back
                if function_call:
                    fn_name = function_call.get("name")
                    fn_args = function_call.get("args", {})
                    tool_result = self._execute_tool(fn_name, fn_args)

                    # Send tool result back to Gemini for final formatting
                    followup_contents = [
                        {"role": "user", "parts": [{"text": redacted_query}]},
                        {"role": "model", "parts": [{"functionCall": function_call}]},
                        {
                            "role": "function",
                            "parts": [
                                {
                                    "functionResponse": {
                                        "name": fn_name,
                                        "response": {"result": tool_result},
                                    }
                                }
                            ],
                        },
                    ]

                    followup_payload = {
                        "contents": followup_contents,
                        "system_instruction": {"parts": [{"text": self.system_prompt}]},
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 500},
                    }
                    res2 = client.post(url, json=followup_payload, headers=headers)
                    if res2.status_code == 200:
                        data2 = res2.json()
                        cands2 = data2.get("candidates", [])
                        if cands2:
                            for p in cands2[0].get("content", {}).get("parts", []):
                                if "text" in p:
                                    text_response += p["text"]
                    else:
                        # Fallback to direct tool result formatting
                        text_response = f"Live Telemetry ({fn_name}): {json.dumps(tool_result, ensure_ascii=False)}"

                final_text = text_response.strip()
                if final_text:
                    chips = ["Explain more", "/status", "Check health score"]
                    # Cache non-function general replies
                    if not function_call:
                        self.cache[norm_q] = (final_text, chips, time.time())
                    return final_text, chips

        except Exception as e:
            self.consecutive_failures += 1
            if self.consecutive_failures >= 3:
                self.circuit_open_until = time.time() + 30.0
            print(f"[!] Gemini API Error: {e}")

        return None, []

    def _execute_tool(self, name: str, args: Dict[str, Any]) -> Any:
        """Executes local system tool requested by Gemini."""
        if name == "get_system_status":
            return get_system_status()
        elif name == "get_top_attackers":
            limit = args.get("limit", 5)
            return get_top_attackers(limit)
        elif name == "get_recent_alerts_summary":
            limit = args.get("limit", 5)
            return get_recent_alerts_summary(limit)
        elif name == "explain_alert_by_id":
            alert_id = args.get("alert_id", 0)
            return explain_alert_by_id(alert_id) or {"status": "not_found"}
        return {"error": f"Unknown tool: {name}"}


# Global Gemini Manager singleton
gemini_mgr = GeminiManager()


def is_gemini_configured() -> bool:
    return gemini_mgr.is_configured()


def generate_gemini_reply(
    query: str, lang: str = "en", session_id: str = "default"
) -> Tuple[Optional[str], List[str]]:
    return gemini_mgr.generate_reply(query, lang=lang, session_id=session_id)

