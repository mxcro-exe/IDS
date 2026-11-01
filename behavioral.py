"""
Behavioral Analysis Module.
Maintains short-term client history with time decay to measure
request velocity, endpoint diversity, failure rates, and behavioral deviation.
"""
import time
import threading
from collections import defaultdict, deque
from typing import Dict, Any, List


class ClientBehaviorTracker:
    def __init__(self, history_ttl_seconds: int = 900):  # 15 minutes TTL
        self.history_ttl = history_ttl_seconds
        self._lock = threading.Lock()

        # IP -> list of (timestamp, endpoint, status_code, is_suspicious)
        self._history: Dict[str, deque] = defaultdict(deque)

        # Baseline running averages across all clients
        self._global_request_rates: deque = deque(maxlen=200)

    def record_request(
        self,
        client_ip: str,
        endpoint: str,
        status_code: int = 200,
        is_suspicious: bool = False,
    ):
        """Records an inspected request into the client's behavioral window."""
        now = time.time()
        with self._lock:
            q = self._history[client_ip]
            q.append({
                "time": now,
                "endpoint": endpoint,
                "status": status_code,
                "suspicious": is_suspicious,
            })
            self._prune_expired(client_ip, now)

    def _prune_expired(self, client_ip: str, now: float):
        """Evicts entries older than TTL."""
        q = self._history[client_ip]
        cutoff = now - self.history_ttl
        while q and q[0]["time"] < cutoff:
            q.popleft()

    def get_client_metrics(self, client_ip: str) -> Dict[str, float]:
        """
        Calculates client behavioral metrics:
        - request_frequency: requests in last 60 seconds
        - unique_endpoint_count: distinct endpoints in history window
        - recent_suspicious_count: suspicious incidents in history window
        - behavioral_deviation_score: deviation from normal velocity
        """
        now = time.time()
        with self._lock:
            self._prune_expired(client_ip, now)
            q = list(self._history[client_ip])

        if not q:
            return {
                "request_frequency": 1.0,
                "unique_endpoint_count": 1.0,
                "recent_suspicious_count": 0.0,
                "behavioral_deviation_score": 0.0,
                "behavioral_risk": 0.0,
            }

        one_min_ago = now - 60.0
        req_last_min = sum(1 for entry in q if entry["time"] >= one_min_ago)
        request_frequency = max(float(req_last_min), 1.0)

        # Track global rate for baseline
        self._global_request_rates.append(request_frequency)
        avg_rate = (
            sum(self._global_request_rates) / len(self._global_request_rates)
            if self._global_request_rates
            else 2.0
        )

        unique_endpoints = len(set(entry["endpoint"] for entry in q))
        recent_suspicious = sum(1 for entry in q if entry["suspicious"])
        failures_count = sum(1 for entry in q if entry["status"] >= 400)

        # Z-score or normalized ratio
        deviation = round(abs(request_frequency - avg_rate) / max(avg_rate, 1.0), 3)

        # Calculate composite behavioral risk score (0.0 to 1.0)
        # Factors: High frequency relative to limit, high suspicious events, high error rate
        freq_factor = min(request_frequency / 40.0, 1.0) * 0.4
        susp_factor = min(recent_suspicious / 3.0, 1.0) * 0.4
        fail_factor = min(failures_count / 10.0, 1.0) * 0.2
        behavioral_risk = round(min(freq_factor + susp_factor + fail_factor, 1.0), 4)

        return {
            "request_frequency": float(request_frequency),
            "unique_endpoint_count": float(unique_endpoints),
            "recent_suspicious_count": float(recent_suspicious),
            "behavioral_deviation_score": float(deviation),
            "behavioral_risk": behavioral_risk,
        }

    def clear_client(self, client_ip: str):
        with self._lock:
            if client_ip in self._history:
                del self._history[client_ip]


# Singleton tracker
behavior_tracker = ClientBehaviorTracker()
