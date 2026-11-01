"""
Authentication, Role-Based Access Control (RBAC), and 2FA Service for AegisGate IDS.
Implements JWT tokens, bcrypt password hashing, pyotp TOTP multi-factor authentication,
and granular role permissions: ADMIN, ANALYST, VIEWER.
"""
import time
import os
import bcrypt
import pyotp
from typing import Dict, Any, Optional
from jose import jwt, JWTError
from database import get_db_connection
from services.audit_service import log_audit_event

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "aegisgate-enterprise-ids-super-secure-jwt-secret-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 86400  # 24 hours

# Role definitions & permissions
ROLE_PERMISSIONS = {
    "admin": ["read", "write", "ban", "rules", "retrain", "settings", "simulate", "export"],
    "analyst": ["read", "write", "ban", "rules", "simulate", "export"],
    "viewer": ["read", "export"],
}


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[float] = None) -> str:
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    expire = time.time() + (expires_delta if expires_delta else ACCESS_TOKEN_EXPIRE_SECONDS)
    to_encode.update({"exp": expire, "iat": time.time()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("exp") and time.time() > payload["exp"]:
            return None
        return payload
    except JWTError:
        return None


def register_user(
    username: str,
    password: str,
    role: str = "viewer",
    enable_totp: bool = False,
    created_by: str = "system",
) -> Dict[str, Any]:
    """Registers a new user account with hashed password and optional TOTP secret."""
    if role not in ROLE_PERMISSIONS:
        role = "viewer"

    pw_hash = hash_password(password)
    totp_secret = pyotp.random_base32() if enable_totp else None
    now = time.time()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO users (username, password_hash, role, totp_secret, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, NULL)
    """, (username, pw_hash, role, totp_secret, now))

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_audit_event(
        actor=created_by,
        action="REGISTER_USER",
        target=f"user:{username}",
        details={"role": role, "totp_enabled": enable_totp},
    )

    return {
        "id": user_id,
        "username": username,
        "role": role,
        "totp_secret": totp_secret,
        "totp_uri": pyotp.totp.TOTP(totp_secret).provisioning_uri(username, issuer_name="AegisGate IDS") if totp_secret else None,
    }


def authenticate_user(
    username: str,
    password: str,
    totp_code: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Authenticates username, password, and optional TOTP 2FA.
    Returns user dict with token if valid, else None.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        log_audit_event(actor="anonymous", action="LOGIN_FAILED", target=f"user:{username}", details={"reason": "User not found"})
        return None

    user = dict(row)

    if not verify_password(password, user["password_hash"]):
        conn.close()
        log_audit_event(actor="anonymous", action="LOGIN_FAILED", target=f"user:{username}", details={"reason": "Bad password"})
        return None

    # Check 2FA if secret exists
    if user.get("totp_secret"):
        if not totp_code:
            conn.close()
            return {"requires_2fa": True, "username": username}
        totp = pyotp.TOTP(user["totp_secret"])
        if not totp.verify(totp_code, valid_window=1):
            conn.close()
            log_audit_event(actor=username, action="LOGIN_2FA_FAILED", target=f"user:{username}")
            return None

    # Update last login
    now = time.time()
    cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user["id"]))
    conn.commit()
    conn.close()

    # Generate token
    token = create_access_token({
        "sub": user["username"],
        "user_id": user["id"],
        "role": user["role"],
        "permissions": ROLE_PERMISSIONS.get(user["role"], ["read"]),
    })

    log_audit_event(actor=username, action="LOGIN_SUCCESS", target=f"user:{username}", details={"role": user["role"]})

    return {
        "status": "authenticated",
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["role"],
        "permissions": ROLE_PERMISSIONS.get(user["role"], []),
    }


def seed_default_admin() -> None:
    """Ensures at least one default admin user exists for initial login."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        register_user(
            username="admin",
            password="adminpassword123",
            role="admin",
            enable_totp=False,
            created_by="system_bootstrap",
        )
