"""
Authentication Abuse and Credential Stuffing Detection Module.
Tracks failed login attempts and distinct username variations per IP
to detect brute-force password guessing and credential-stuffing campaigns.
"""
import time
import threading
from typing import Dict, Any, Tuple
from collections import defaultdict, deque


class AuthAbuseDetector:
    def __init__(self, window_seconds: int = 300, max_failures: int = 5):
        self.window_seconds = window_seconds
        self.max_failures = max_failures
        self._lock = threading.Lock()

        # IP -> deque of failed attempt timestamps
        self._failures: Dict[str, deque] = defaultdict(deque)

        # IP -> deque of (timestamp, username)
        self._usernames_attempted: Dict[str, deque] = defaultdict(deque)

    def record_attempt(self, client_ip: str, username: str, success: bool):
        """Records an authentication event."""
        now = time.time()
        with self._lock:
            if not success:
                self._failures[client_ip].append(now)

            if username:
                self._usernames_attempted[client_ip].append((now, username))

            self._prune(client_ip, now)

    def _prune(self, client_ip: str, now: float):
        cutoff = now - self.window_seconds
        fq = self._failures[client_ip]
        while fq and fq[0] < cutoff:
            fq.popleft()

        uq = self._usernames_attempted[client_ip]
        while uq and uq[0][0] < cutoff:
            uq.popleft()

    def evaluate_auth_request(
        self, client_ip: str, path: str, body_dict: dict = None
    ) -> Tuple[bool, float, str]:
        """
        Evaluates risk before forwarding to auth service.

        Returns:
            (is_abuse: bool, abuse_risk: float, reason: str)
        """
        if not path.endswith("/login") and not "/auth" in path:
            return False, 0.0, ""

        now = time.time()
        with self._lock:
            self._prune(client_ip, now)
            recent_fails = len(self._failures[client_ip])
            recent_users = len(set(u for _, u in self._usernames_attempted[client_ip]))

        # Credential Stuffing: Multiple different usernames from same IP
        if recent_users >= 4:
            return (
                True,
                0.90,
                f"Credential Stuffing Attack ({recent_users} different usernames attempted)",
            )

        # Brute Force: Exceeded max failed attempts
        if recent_fails >= self.max_failures:
            return (
                True,
                0.85,
                f"Brute-Force Auth Abuse ({recent_fails} failed login attempts in 5m)",
            )

        if recent_fails >= 3:
            return (
                False,
                0.40,
                f"Suspicious Auth Activity ({recent_fails} prior failed attempts)",
            )

        return False, 0.0, ""

    def reset_client(self, client_ip: str):
        with self._lock:
            if client_ip in self._failures:
                del self._failures[client_ip]
            if client_ip in self._usernames_attempted:
                del self._usernames_attempted[client_ip]


# Singleton auth abuse detector
auth_abuse_detector = AuthAbuseDetector()
