"""
Honeypot Decoy and Auto-Ban Management Module.
Traps adversaries attempting reconnaissance on sensitive endpoints
(/admin, /.env, /backup.zip, etc.) and enforces timed bans.
"""
import time
import threading
from typing import Dict, Any, List, Optional
from config import HONEYPOT_ENDPOINTS, DEFAULT_AUTOBAN_MINUTES


class HoneypotManager:
    def __init__(self, ban_duration_minutes: int = DEFAULT_AUTOBAN_MINUTES):
        self.ban_duration = ban_duration_minutes * 60
        self.honeypot_endpoints = set(HONEYPOT_ENDPOINTS)
        self._banned_ips: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def update_duration(self, minutes: int):
        with self._lock:
            self.ban_duration = minutes * 60

    def is_honeypot_hit(self, path: str) -> bool:
        """Checks if the requested path targets a decoy honeypot."""
        cleaned = path.rstrip("/").lower()
        for decoy in self.honeypot_endpoints:
            if cleaned == decoy.lower() or cleaned.startswith(decoy.lower() + "/"):
                return True
        return False

    def trigger_ban(self, client_ip: str, reason: str = "Honeypot Decoy Access") -> Dict[str, Any]:
        """Bans an IP address for the configured duration."""
        now = time.time()
        expires_at = now + self.ban_duration
        ban_record = {
            "ip": client_ip,
            "reason": reason,
            "banned_at": now,
            "expires_at": expires_at,
            "duration_seconds": self.ban_duration,
        }
        with self._lock:
            self._banned_ips[client_ip] = ban_record
        return ban_record

    def is_banned(self, client_ip: str) -> Optional[Dict[str, Any]]:
        """
        Checks whether client IP is currently actively banned.
        Automatically expires old bans.
        """
        now = time.time()
        with self._lock:
            if client_ip in self._banned_ips:
                record = self._banned_ips[client_ip]
                if now < record["expires_at"]:
                    remaining = int(record["expires_at"] - now)
                    record_copy = dict(record)
                    record_copy["remaining_seconds"] = remaining
                    return record_copy
                else:
                    # Expired ban
                    del self._banned_ips[client_ip]
        return None

    def unban_ip(self, client_ip: str) -> bool:
        """Manually unbans an IP address."""
        with self._lock:
            if client_ip in self._banned_ips:
                del self._banned_ips[client_ip]
                return True
        return False

    def list_active_bans(self) -> List[Dict[str, Any]]:
        """Returns list of currently active bans with remaining time."""
        now = time.time()
        active = []
        with self._lock:
            to_remove = []
            for ip, record in self._banned_ips.items():
                if now < record["expires_at"]:
                    rec = dict(record)
                    rec["remaining_seconds"] = int(record["expires_at"] - now)
                    active.append(rec)
                else:
                    to_remove.append(ip)
            for ip in to_remove:
                del self._banned_ips[ip]
        return active


# Singleton honeypot manager
honeypot_manager = HoneypotManager()
