#!/usr/bin/env python3
"""
AegisGate Security CLI Tool.
Provides direct command-line operations sharing the unified backend service layer.
Usage:
  python aegis.py status
  python aegis.py score
  python aegis.py ban <ip> [duration] [reason]
  python aegis.py unban <ip>
  python aegis.py bans
  python aegis.py allow <ip>
  python aegis.py mode [learning|monitor|protect]
  python aegis.py simulate [sqli|xss|traversal|cmdi|benign]
  python aegis.py retrain
  python aegis.py export [requests|alerts|pdf]
"""
import sys
import json
import argparse
from typing import List

# Ensure UTF-8 output encoding for Windows command prompts
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from database import init_db, get_dashboard_metrics
from services.health_service import compute_health_score
from services.ban_service import ban_ip, unban_ip, list_active_bans, add_to_allowlist
from services.attacker_service import get_attacker_profile
from services.rule_service import list_rules
from features import extract_features, features_to_vector
from detector import detector


def cmd_status():
    m = get_dashboard_metrics()
    h = compute_health_score()
    print("=" * 60)
    print("🛡️  AegisGate IDS Security Status")
    print("=" * 60)
    print(f"Mode:             {h['mode'].upper()}")
    print(f"Health Score:     {h['score']}/100 (Grade {h['grade']})")
    print(f"Total Requests:   {m['total_requests']:,}")
    print(f"Allowed:          {m['allowed_requests']:,}")
    print(f"Warned:           {m['warned_requests']:,}")
    print(f"Blocked:          {m['blocked_requests']:,}")
    print(f"Prevention Rate:  {m['prevention_rate']}%")
    print(f"Avg Latency:      {m['avg_latency_ms']} ms")
    print(f"Active IP Bans:   {h['active_bans']}")
    print("=" * 60)


def cmd_score():
    h = compute_health_score()
    print(f"🏆 Security Health Score: {h['score']}/100 [Grade {h['grade']}]")
    print("-" * 50)
    if h["deductions"]:
        print("Posture Deductions:")
        for d in h["deductions"]:
            print(f"  [{d['points']} pts] {d['title']}: {d['description']}")
    else:
        print("All security controls fully hardened. Zero deductions.")


def cmd_ban(args):
    ip = args.ip
    duration = args.duration or "30m"
    reason = args.reason or "Banned via Aegis CLI"
    res = ban_ip(ip, reason=reason, duration_str=duration, banned_by="cli_admin")
    print(f"⛔ Successfully banned {ip} for {duration}. (Expires: {res.get('expires_at')})")


def cmd_unban(args):
    ip = args.ip
    success = unban_ip(ip, unbanned_by="cli_admin")
    if success:
        print(f"✅ Successfully lifted ban on {ip}.")
    else:
        print(f"⚠️ IP {ip} was not actively banned.")


def cmd_bans():
    bans = list_active_bans()
    print(f"Active IP Bans ({len(bans)}):")
    for b in bans:
        print(f"  • {b['ip_or_cidr']:<18} | Reason: {b['reason']:<25} | Remaining: {b['remaining_human']}")


def cmd_allow(args):
    ip = args.ip
    res = add_to_allowlist(ip, reason="Added via Aegis CLI", created_by="cli_admin")
    print(f"✅ Successfully added {ip} to trusted allowlist.")


def cmd_simulate(args):
    atype = (args.attack_type or "sqli").lower()
    payloads = {
        "sqli": ("GET", "/demo/api/users", "search=admin' OR '1'='1"),
        "xss": ("GET", "/demo/api/search", "q=<script>alert('xss')</script>"),
        "traversal": ("GET", "/demo/api/files", "file=../../../../etc/passwd"),
        "cmdi": ("GET", "/demo/api/ping", "host=127.0.0.1; id"),
        "benign": ("GET", "/demo/api/users", "search=alice"),
    }
    method, path, query = payloads.get(atype, payloads["sqli"])
    detector.load_models()
    res = detector.predict_request(method=method, path=path, query=query)

    print(f"🧪 Sandbox Simulation [{atype.upper()}]:")
    print(f"  Target:     127.0.0.1 (Local Sandbox Safe)")
    print(f"  Verdict:    {res['action']}")
    print(f"  Risk Score: {res['risk_score']:.4f}")
    print(f"  Attack:     {res['attack_type']}")
    print(f"  Confidence: {res.get('confidence', 0.99):.2%}")
    print(f"  Reason:     {res.get('reason_en', res.get('reason', 'Interception rule applied.'))}")


def main():
    parser = argparse.ArgumentParser(description="AegisGate IDS Administrative CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    subparsers.add_parser("status", help="Display real-time IDS metrics")
    subparsers.add_parser("score", help="Display security health score & posture")

    ban_p = subparsers.add_parser("ban", help="Ban an IP address")
    ban_p.add_argument("ip", help="Client IP or CIDR")
    ban_p.add_argument("--duration", "-d", default="30m", help="Duration (e.g. 30m, 2h, 7d, permanent)")
    ban_p.add_argument("--reason", "-r", default="Administrative action", help="Reason for ban")

    unban_p = subparsers.add_parser("unban", help="Unban an IP address")
    unban_p.add_argument("ip", help="Client IP to unban")

    subparsers.add_parser("bans", help="List all active IP bans")

    allow_p = subparsers.add_parser("allow", help="Add IP to allowlist")
    allow_p.add_argument("ip", help="Client IP or CIDR to allow")

    sim_p = subparsers.add_parser("simulate", help="Run local harmless attack simulation")
    sim_p.add_argument("attack_type", nargs="?", default="sqli", choices=["sqli", "xss", "traversal", "cmdi", "benign"])

    args = parser.parse_args()
    init_db()

    if args.command == "status":
        cmd_status()
    elif args.command == "score":
        cmd_score()
    elif args.command == "ban":
        cmd_ban(args)
    elif args.command == "unban":
        cmd_unban(args)
    elif args.command == "bans":
        cmd_bans()
    elif args.command == "allow":
        cmd_allow(args)
    elif args.command == "simulate":
        cmd_simulate(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
