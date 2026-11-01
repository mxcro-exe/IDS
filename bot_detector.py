"""
Bot and Automated Scanner Detection Module.
Identifies automated vulnerability scanners, crawler signatures, and
unnatural request periodicity (low-jitter timing).
"""
import time
import math
import re
from typing import Dict, Any, Tuple
from collections import defaultdict, deque

KNOWN_SCANNER_PATTERNS = [
    r"sqlmap",
    r"nikto",
    r"acunetix",
    r"nessus",
    r"nmap",
    r"dirbuster",
    r"gobuster",
    r"nuclei",
    r"masscan",
    r"wpscan",
    r"havij",
    r"openvas",
    r"zaproxy",
    r"arachni",
]


class BotDetector:
    def __init__(self, sample_window: int = 10):
        self.sample_window = sample_window
        # IP -> deque of request timestamps
        self._timing_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=self.sample_window))

    def evaluate_request(
        self, client_ip: str, headers: Dict[str, str]
    ) -> Tuple[bool, float, str]:
        """
        Evaluates bot signals.

        Returns:
            (is_bot: bool, bot_risk: float, reason: str)
        """
        ua = headers.get("user-agent", "").strip()

        # 1. Missing or blank User-Agent
        if not ua:
            return True, 0.70, "Missing User-Agent Header (Automated Client)"

        # 2. Known Automated Security Scanner Signature
        ua_lower = ua.lower()
        for pattern in KNOWN_SCANNER_PATTERNS:
            if re.search(pattern, ua_lower):
                return True, 0.95, f"Automated Vulnerability Scanner Identified ({pattern})"

        # 3. Bare script clients without browser markers
        if re.search(r"^(python-requests|curl/|libwww-perl|go-http-client|urllib)", ua_lower):
            # Record timing to check for periodicity
            is_periodic, jitter = self._check_periodicity(client_ip)
            if is_periodic:
                return True, 0.85, f"Periodic Bot Script ({ua}) with Low Jitter ({jitter:.3f}s)"
            return True, 0.50, f"Script-based HTTP Client Detected ({ua})"

        # 4. Standard client timing check
        is_periodic, jitter = self._check_periodicity(client_ip)
        if is_periodic:
            return True, 0.75, f"Unnatural Bot Periodicity Detected (Jitter std={jitter:.3f}s)"

        return False, 0.0, ""

    def _check_periodicity(self, client_ip: str) -> Tuple[bool, float]:
        """
        Calculates the standard deviation of inter-arrival times.
        If std-dev is near 0 across multiple requests, traffic is scripted.
        """
        now = time.time()
        q = self._timing_history[client_ip]
        q.append(now)

        if len(q) < 5:
            return False, 1.0

        intervals = [q[i] - q[i - 1] for i in range(1, len(q))]
        mean_interval = sum(intervals) / len(intervals)

        # Variance
        variance = sum((x - mean_interval) ** 2 for x in intervals) / len(intervals)
        std_dev = math.sqrt(variance)

        # If requests arrive with identical interval (< 0.08s variation)
        if std_dev < 0.08 and mean_interval < 5.0:
            return True, std_dev

        return False, std_dev


# Singleton bot detector
bot_detector = BotDetector()
