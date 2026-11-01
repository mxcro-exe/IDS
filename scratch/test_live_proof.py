import urllib.request
import urllib.parse
import json

def test():
    # 1. Unban 127.0.0.1
    unban_url = "http://127.0.0.1:8000/api/bans/unban"
    req = urllib.request.Request(
        unban_url,
        data=json.dumps({"ip": "127.0.0.1"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        print("1. Unban Status:", res.status)

    # 2. Benign Request
    benign_url = "http://127.0.0.1:8000/api/users?search=alice"
    with urllib.request.urlopen(benign_url) as res:
        data = json.loads(res.read().decode())
        print("2. Benign Request Allowed (HTTP 200 OK): Found users:", len(data.get("users", [])))

    # 3. Malicious SQL Injection through Proxy
    attack_query = "admin' OR '1'='1"
    attack_url = "http://127.0.0.1:8000/api/users?search=" + urllib.parse.quote(attack_query)
    try:
        urllib.request.urlopen(attack_url)
    except urllib.error.HTTPError as e:
        print("3. Attack Request Blocked (HTTP 403 Forbidden):")
        body = json.loads(e.read().decode())
        print("   - Action:", "BLOCKED")
        print("   - Classification:", body.get("attack_classification"))
        print("   - Risk Score:", body.get("risk_score"))
        print("   - Reason (EN):", body.get("reason"))
        print("   - Reason (TA):", body.get("reason_tamil", "").encode("ascii", "replace").decode("ascii"))
        print("   - TreeSHAP Explanations:", body.get("shap_explanations")[:2])

    # 4. Decoy Honeypot hit
    honeypot_url = "http://127.0.0.1:8000/.env"
    try:
        urllib.request.urlopen(honeypot_url)
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode())
        print("4. Honeypot Decoy Trapped & Auto-Banned:")
        print("   - HTTP Code:", e.code)
        print("   - Incident Reason:", body.get("reason"))

if __name__ == "__main__":
    test()
