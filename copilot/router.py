"""
AegisGate Copilot Answer Engine Router.
Enforces strict 6-step hierarchical answer routing:
Step 0: Safety and prompt injection check (always first).
Step 1: General Commands dataset (2000 intents) -> Badge: 'Instant'.
Step 2: Project Q&A dataset (1000 intents) -> Badge: 'Instant'.
Step 3: Live-data tools and commands (numbers from active system) -> Badge: 'Instant'.
Step 4: Gemini API (online LLM fallback with tool calling) -> Badge: 'Gemini'.
Step 5: Offline fallback (friendly bilingual message + suggestions) -> Badge: 'Offline'.
"""
import time
from typing import Dict, Any, Optional

from copilot.safety import check_safety
from copilot.lang_detect import detect_language
from copilot.intent_engine import intent_engine
from copilot.tools import execute_live_tool_query


def route_message(
    query: str,
    user_lang: Optional[str] = None,
    session_id: str = "default",
    allow_cloud_ai: bool = True
) -> Dict[str, Any]:
    """
    Routes a user query through the 6-step answering pipeline.
    Returns:
    {
        "response": str,
        "badge": "Instant" | "Gemini" | "Offline",
        "step": str,
        "latency_ms": float,
        "chips": List[str],
        "action": Optional[Dict],
        "lang": str
    }
    """
    start_time = time.perf_counter()
    lang = user_lang or detect_language(query)

    # =========================================================================
    # STEP 0: Safety & Prompt Injection Check
    # =========================================================================
    is_safe, refusal_msg = check_safety(query, lang=lang)
    if not is_safe:
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "response": refusal_msg,
            "badge": "Instant",
            "step": "step_0_safety",
            "latency_ms": latency,
            "chips": ["What can you do?", "/status", "Explain SQL injection"],
            "action": None,
            "lang": lang,
        }

    # =========================================================================
    # STEP 3 CHECK FIRST: Slash Commands & Direct Live-Data Telemetry Queries
    # Numbers about the system ('how many blocked today', 'explain alert 482',
    # /status, /top attackers) MUST come directly from live tool execution.
    # =========================================================================
    is_slash_cmd = query.strip().startswith("/")
    tool_matched, tool_resp, tool_chips = execute_live_tool_query(query, lang=lang)
    if tool_matched and tool_resp and (is_slash_cmd or any(k in query.lower() for k in ("blocked", "status", "attacker", "alert", "health"))):
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "response": tool_resp,
            "badge": "Instant",
            "step": "step_3_live_tools",
            "latency_ms": latency,
            "chips": tool_chips,
            "action": None,
            "lang": lang,
        }

    # =========================================================================
    # STEP 1 & 2: Built-in Datasets (General Commands & Project Q&A)
    # =========================================================================
    match_res = intent_engine.match(query, user_lang=lang, session_id=session_id)
    match_type = match_res.get("match_type")

    # If an exact, fuzzy, semantic, or context follow-up matched:
    if match_type in ("exact", "fuzzy", "semantic", "context_followup") and match_res.get("intent"):
        intent = match_res["intent"]
        step_name = "step_1_general" if intent.source_type == "general" else "step_2_project"
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "response": match_res["response_text"],
            "badge": "Instant",
            "step": step_name,
            "latency_ms": latency,
            "chips": match_res.get("chips", []),
            "action": match_res.get("action", None),
            "lang": match_res.get("lang", lang),
            "intent_id": intent.id,
            "confidence": match_res.get("confidence", 1.0),
        }

    # If confidence was in the clarification bracket (0.65 - 0.80)
    if match_type == "clarification":
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "response": match_res["response_text"],
            "badge": "Instant",
            "step": "step_clarification",
            "latency_ms": latency,
            "chips": match_res.get("chips", []),
            "action": None,
            "lang": match_res.get("lang", lang),
            "confidence": match_res.get("confidence", 0.70),
        }

    # =========================================================================
    # STEP 3: Live-Data Tools & Operational Commands
    # =========================================================================
    tool_matched, tool_resp, tool_chips = execute_live_tool_query(query, lang=lang)
    if tool_matched and tool_resp:
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "response": tool_resp,
            "badge": "Instant",
            "step": "step_3_live_tools",
            "latency_ms": latency,
            "chips": tool_chips,
            "action": None,
            "lang": lang,
        }

    # =========================================================================
    # STEP 4: Gemini API (Online AI Assistant)
    # =========================================================================
    if allow_cloud_ai:
        try:
            # We import gemini_client lazily or if available
            from copilot.gemini_client import generate_gemini_reply, is_gemini_configured
            if is_gemini_configured():
                gemini_text, gemini_chips = generate_gemini_reply(query, lang=lang, session_id=session_id)
                if gemini_text:
                    latency = round((time.perf_counter() - start_time) * 1000, 2)
                    return {
                        "response": gemini_text,
                        "badge": "Gemini",
                        "step": "step_4_gemini",
                        "latency_ms": latency,
                        "chips": gemini_chips or ["Explain more", "Show live status", "How does AegisGate work?"],
                        "action": None,
                        "lang": lang,
                    }
        except ImportError:
            pass
        except Exception as e:
            # Gemini network/quota error: log and gracefully fall through to Step 5
            print(f"[*] Gemini fallback error: {e}")

    # =========================================================================
    # STEP 5: Offline Fallback
    # =========================================================================
    latency = round((time.perf_counter() - start_time) * 1000, 2)
    if lang == "ta":
        fallback_msg = (
            "மேகக்கணி AI (Gemini) தற்போது கிடைக்கவில்லை அல்லது முடக்கப்பட்டுள்ளது. "
            "ஆனால் என்னால் உள்ளமைக்கப்பட்ட கேள்விகளுக்கு பதிலளிக்கவும், நேரடி கேட்வே தரவைக் காட்டவும் முடியும். "
            "கீழே உள்ள தலைப்புகளில் ஏதேனும் ஒன்றை முயற்சிக்கவும்:"
        )
    elif lang == "tanglish":
        fallback_msg = (
            "Cloud AI (Gemini) ipo available illa or disabled. "
            "Aana built-in security questions matrum live gateway status-ku ennale instant-ah answer panna mudiyum. "
            "Keezhe ulla topics-la try pannunga:"
        )
    else:
        fallback_msg = (
            "Cloud AI is currently unavailable or disabled in settings. "
            "However, I can still answer all built-in security questions, explain detection algorithms, and show real-time gateway metrics. "
            "Try one of these suggestions below:"
        )

    return {
        "response": fallback_msg,
        "badge": "Offline",
        "step": "step_5_offline_fallback",
        "latency_ms": latency,
        "chips": [
            "What is AegisGate?",
            "/status",
            "How many attacks blocked today?",
            "What is SQL injection?",
            "Tell me a joke",
        ],
        "action": None,
        "lang": lang,
    }

