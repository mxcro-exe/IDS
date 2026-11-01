"""
Protected Demo Backend API.
Simulates a real microservice with users, products, authentication,
search, and file download capabilities.
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional
import time

demo_router = APIRouter(prefix="/demo", tags=["Protected Demo API"])

# Sample Mock Database
MOCK_USERS = [
    {"id": 1, "username": "admin_root", "email": "admin@gateway-ids.local", "role": "SuperAdmin", "status": "active"},
    {"id": 2, "username": "john_doe", "email": "john.doe@company.org", "role": "Developer", "status": "active"},
    {"id": 3, "username": "alice_sec", "email": "alice.security@enterprise.io", "role": "SecurityAnalyst", "status": "active"},
    {"id": 4, "username": "bob_ops", "email": "bob.devops@cloudscale.net", "role": "DevOpsEngineer", "status": "active"},
]

MOCK_PRODUCTS = [
    {"id": 101, "name": "Enterprise WAF Appliance", "category": "Hardware", "price": 4999.00, "stock": 14},
    {"id": 102, "name": "AI Intrusion Sensor License", "category": "Software", "price": 1250.00, "stock": 85},
    {"id": 103, "name": "API Security Audit Toolkit", "category": "Service", "price": 890.00, "stock": 50},
    {"id": 104, "name": "Hardware Security Module (HSM)", "category": "Hardware", "price": 7500.00, "stock": 5},
]


@demo_router.get("/api/users")
async def get_users(search: Optional[str] = Query(None, description="Search by username or email")):
    """Returns users list, filtered if search parameter provided."""
    if search:
        s = search.lower()
        filtered = [u for u in MOCK_USERS if s in u["username"].lower() or s in u["email"].lower()]
        return {"total": len(filtered), "query": search, "users": filtered}
    return {"total": len(MOCK_USERS), "users": MOCK_USERS}


@demo_router.get("/api/products")
async def get_products(category: Optional[str] = Query(None)):
    """Returns products catalog."""
    if category:
        c = category.lower()
        items = [p for p in MOCK_PRODUCTS if p["category"].lower() == c]
        return {"category": category, "total": len(items), "items": items}
    return {"total": len(MOCK_PRODUCTS), "items": MOCK_PRODUCTS}


@demo_router.post("/api/login")
async def login_user(payload: dict = Body(...)):
    """Handles authentication for credentials testing."""
    username = payload.get("username", "")
    password = payload.get("password", "")

    # Pre-defined valid credentials
    if username == "admin_root" and password == "SecuredP@ssw0rd2026":
        return {
            "status": "success",
            "message": "Authentication successful",
            "token": "mock_jwt_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            "user": {"username": username, "role": "SuperAdmin"}
        }

    # Simulate authentication failure
    raise HTTPException(
        status_code=401,
        detail={"status": "error", "message": "Invalid username or password"}
    )


@demo_router.get("/api/search")
async def general_search(q: str = Query(..., description="General query term")):
    """Simulates search query."""
    return {
        "status": "success",
        "query": q,
        "results": [
            {"title": f"Result for {q}", "relevance": 0.98},
            {"title": "System Security Best Practices Guide", "relevance": 0.85}
        ]
    }


@demo_router.get("/api/files/download")
async def download_file(file: str = Query(..., description="Filename to retrieve")):
    """Simulates file retrieval."""
    safe_files = ["report_2026.pdf", "architecture_spec.md", "dataset_meta.json"]
    if file in safe_files:
        return {"status": "success", "file": file, "content": f"[Simulated file buffer for {file}]"}
    raise HTTPException(status_code=404, detail="Requested file not found in public registry.")


@demo_router.get("/api/leak-test")
async def leak_test_endpoint():
    """
    Demo endpoint that intentionally emits sensitive PII (credit cards & API secrets)
    to demonstrate that the API Gateway's Response Leak Filter catches and masks them!
    """
    return {
        "status": "success",
        "description": "Simulated backend response containing sensitive customer record",
        "customer": {
            "name": "Jane Doe",
            "email": "jane.doe@securebank.com",
            "primary_card": "4532-8921-9981-4321",
            "backup_card": "5425-1111-2222-3333",
            "national_id": "123-45-6789",
            "live_api_secret": "api_key_99a8b7c6d5e4f3a2b1c0d9e8",
            "auth_jwt": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        }
    }


@demo_router.get("/api/system/status")
async def system_status():
    """Health check for backend API."""
    return {
        "service": "Protected Demo Backend API",
        "status": "HEALTHY",
        "timestamp": time.time(),
        "uptime": "99.98%"
    }
