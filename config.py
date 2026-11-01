"""
Central Configuration for AI-Powered API Gateway IDS.
Loads settings from environment variables or defaults.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Server and Gateway Settings
GATEWAY_HOST = os.getenv("GATEWAY_HOST", "0.0.0.0")
GATEWAY_PORT = int(os.getenv("GATEWAY_PORT", "8000"))
TARGET_API_URL = os.getenv("TARGET_API_URL", "http://127.0.0.1:8000/demo")

# Operation Mode: 'learning', 'monitor', 'protect'
DEFAULT_OPERATION_MODE = os.getenv("OPERATION_MODE", "protect")

# Risk Scoring Weights (w1 + w2 + w3 = 1.0)
DEFAULT_WEIGHT_ML = float(os.getenv("WEIGHT_ML", "0.45"))
DEFAULT_WEIGHT_BEHAVIORAL = float(os.getenv("WEIGHT_BEHAVIORAL", "0.35"))
DEFAULT_WEIGHT_RULES = float(os.getenv("WEIGHT_RULES", "0.20"))

# Decision Thresholds
DEFAULT_WARN_THRESHOLD = float(os.getenv("WARN_THRESHOLD", "0.40"))
DEFAULT_BLOCK_THRESHOLD = float(os.getenv("BLOCK_THRESHOLD", "0.70"))

# Rate Limiter Settings
DEFAULT_RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "50"))
DEFAULT_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

# Auto-ban Settings
DEFAULT_AUTOBAN_MINUTES = int(os.getenv("AUTOBAN_MINUTES", "10"))

# Honeypot decoy endpoints
HONEYPOT_ENDPOINTS = [
    "/admin",
    "/admin/login",
    "/.env",
    "/config.json",
    "/phpmyadmin",
    "/wp-login.php",
    "/backup.zip",
    "/backup.sql",
    "/.git/config",
    "/actuator/env",
]

# Paths
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
REPORTS_DIR = BASE_DIR / "reports"
DATABASE_PATH = BASE_DIR / "data" / "gateway_ids.db"

# Ensure runtime directories exist
for folder in [MODELS_DIR, DATA_DIR, LOGS_DIR, REPORTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

# Notification configs
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ALERT_EMAIL_RECIPIENT = os.getenv("ALERT_EMAIL_RECIPIENT", "")
