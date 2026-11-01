"""
Thread-Safe Sliding-Window Rate Limiter.
Enforces request thresholds per client IP across a rolling time window.
Returns HTTP 429 when limits are breached.
"""
import time
import threading
from collections import deque
from typing import Dict, Tuple


class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int = 50, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clients: Dict[str, deque] = {}
        self._lock = threading.Lock()

    def update_settings(self, max_requests: int, window_seconds: int):
        """Allows dynamic configuration updates from admin settings."""
        with self._lock:
            self.max_requests = max_requests
            self.window_seconds = window_seconds

    def is_allowed(self, client_ip: str) -> Tuple[bool, int, int]:
        """
        Checks if the request is allowed under the sliding window.

        Returns:
            (allowed: bool, current_count: int, max_requests: int)
        """
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            if client_ip not in self._clients:
                self._clients[client_ip] = deque()

            q = self._clients[client_ip]

            # Evict timestamps older than the sliding window
            while q and q[0] < window_start:
                q.popleft()

            # Check if limit exceeded
            if len(q) >= self.max_requests:
                return False, len(q), self.max_requests

            # Record this valid request timestamp
            q.append(now)
            return True, len(q), self.max_requests

    def get_client_count(self, client_ip: str) -> int:
        """Returns active request count in the current window."""
        now = time.time()
        window_start = now - self.window_seconds
        with self._lock:
            if client_ip not in self._clients:
                return 0
            q = self._clients[client_ip]
            while q and q[0] < window_start:
                q.popleft()
            return len(q)

    def reset_client(self, client_ip: str):
        """Clears client rate history."""
        with self._lock:
            if client_ip in self._clients:
                self._clients[client_ip].clear()
