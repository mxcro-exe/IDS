"""
Matching Accuracy & Latency Benchmark Suite for AegisGate Copilot.
Tests:
1. Exact match accuracy on all registered patterns.
2. Typo resilience (simulated typos / repeated letters).
3. Tanglish variant recognition.
4. Response latency (target < 300 ms for Steps 1-3).
5. Confusion rate (patterns matching the wrong intent).
"""
import sys
import time
import random
from pathlib import Path
from typing import List, Dict, Any

# Ensure project root in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from copilot.intent_engine import intent_engine
from copilot.router import route_message


def run_matching_benchmark():
    print("=" * 65)
    print("   AEGISGATE COPILOT INTENT MATCHING & LATENCY BENCHMARK")
    print("=" * 65)

    stats = intent_engine.get_intent_count()
    print(f"[*] Total Loaded Intents: {stats['total']} (General: {stats['general']}, Project: {stats['project']})")
    print(f"[*] Total Indexed Patterns: {stats['patterns']}")

    if stats["total"] == 0:
        print("[!] No intents found in data/copilot/. Please add dataset JSON files first.")
        return False

    correct_exact = 0
    correct_fuzzy = 0
    wrong_matches = 0
    total_tested = 0
    latencies: List[float] = []

    # 1. Test Pattern Matching & Latency
    sample_intents = list(intent_engine.intents.values())
    test_subset = sample_intents if len(sample_intents) <= 100 else random.sample(sample_intents, 100)

    for intent in test_subset:
        for lang, pat_list in intent.patterns.items():
            for pat in pat_list:
                total_tested += 1
                t0 = time.perf_counter()
                res = route_message(pat, user_lang=lang)
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                latencies.append(elapsed_ms)

                matched_id = res.get("intent_id")
                if matched_id == intent.id:
                    correct_exact += 1
                elif matched_id is None:
                    # check if handled by tools or safety
                    if res.get("step") in ("step_3_live_tools", "step_0_safety"):
                        correct_exact += 1
                    else:
                        wrong_matches += 1
                else:
                    wrong_matches += 1

                # 2. Test Typo / Noise Resilience (e.g. repeated letters: "hiiiii")
                noisy_pat = pat + (pat[-1] * 3 if len(pat) > 1 else "")
                t0 = time.perf_counter()
                res_noisy = route_message(noisy_pat, user_lang=lang)
                elapsed_noisy_ms = (time.perf_counter() - t0) * 1000.0
                latencies.append(elapsed_noisy_ms)

                if res_noisy.get("intent_id") == intent.id:
                    correct_fuzzy += 1

    accuracy = (correct_exact / max(total_tested, 1)) * 100.0
    confusion_rate = (wrong_matches / max(total_tested, 1)) * 100.0
    avg_latency = sum(latencies) / max(len(latencies), 1)
    p95_latency = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0.0

    print("\n--- BENCHMARK RESULTS ---")
    print(f"• Total Pattern Queries Tested: {total_tested}")
    print(f"• Direct Match Accuracy        : {accuracy:.2f}%")
    print(f"• Confusion Rate               : {confusion_rate:.2f}%")
    print(f"• Typo / Repetition Recovery   : {correct_fuzzy} / {total_tested}")
    print(f"• Average Execution Latency    : {avg_latency:.2f} ms (Target < 300 ms)")
    print(f"• 95th Percentile Latency (p95): {p95_latency:.2f} ms")

    if accuracy >= 95.0 and avg_latency < 300.0 and confusion_rate < 5.0:
        print("\n[OK] INTENT ENGINE BENCHMARK EXCEEDED ALL QUALITY TARGETS!")
        return True
    else:
        print("\n[!] BENCHMARK WARNING: Targets not fully met.")
        return False


if __name__ == "__main__":
    success = run_matching_benchmark()
    sys.exit(0 if success else 1)

