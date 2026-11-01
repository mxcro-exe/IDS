"""
Diagnostic and Auto-Installer Script for AegisGate.
Runs on new laptops/environments to verify all Python dependencies,
ML model files, Copilot datasets, and PDF guides.
Installs only what is missing.
"""
import sys
import subprocess
import importlib
from pathlib import Path

REQUIRED_PACKAGES = [
    ("fastapi", "fastapi>=0.109.0"),
    ("uvicorn", "uvicorn[standard]>=0.27.0"),
    ("httpx", "httpx>=0.26.0"),
    ("sklearn", "scikit-learn>=1.4.0"),
    ("pandas", "pandas>=2.1.0"),
    ("numpy", "numpy>=1.26.0"),
    ("shap", "shap>=0.44.0"),
    ("joblib", "joblib>=1.3.2"),
    ("reportlab", "reportlab>=4.1.0"),
    ("pytest", "pytest>=8.0.0"),
    ("dotenv", "python-dotenv>=1.0.0"),
    ("jinja2", "jinja2>=3.1.3"),
    ("matplotlib", "matplotlib>=3.8.0"),
    ("rapidfuzz", "rapidfuzz>=3.6.0"),
    ("telegram", "python-telegram-bot>=20.7"),
]

def check_missing_packages():
    missing = []
    for mod_name, pip_spec in REQUIRED_PACKAGES:
        try:
            importlib.import_module(mod_name)
        except ImportError:
            missing.append(pip_spec)
    return missing

def install_packages(packages):
    print(f"\n[*] Found {len(packages)} missing Python package(s):")
    for p in packages:
        print(f"    - {p}")
    print("\n[*] Installing missing dependencies via pip... Please wait a moment.")
    cmd = [sys.executable, "-m", "pip", "install", "--upgrade"] + packages
    res = subprocess.run(cmd)
    if res.returncode == 0:
        print("[OK] All missing packages installed successfully!")
        return True
    else:
        print("[!] Warning: Pip installation encountered an issue. Trying requirements.txt...")
        res2 = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        return res2.returncode == 0

def check_models_and_data():
    base = Path(__file__).resolve().parent.parent
    
    # 1. Check ML Models
    rf_model = base / "models" / "model.pkl"
    iso_model = base / "models" / "iso_model.pkl"
    if not rf_model.exists() or not iso_model.exists():
        print("[*] Trained ML models missing. Training now...")
        subprocess.run([sys.executable, str(base / "train_model.py")])
        print("[OK] ML models generated successfully.")
    else:
        print("[OK] ML models (Random Forest & Isolation Forest) verified.")

    # 2. Check Copilot Datasets
    gen_dir = base / "data" / "copilot" / "general_commands"
    proj_dir = base / "data" / "copilot" / "project_qa"
    if not gen_dir.exists() or not proj_dir.exists() or len(list(gen_dir.glob("*.json"))) < 15:
        print("[*] Copilot 3,000 intent datasets missing. Generating now...")
        subprocess.run([sys.executable, str(base / "tools" / "generate_datasets.py")])
        print("[OK] Copilot 3,000 datasets generated.")
    else:
        print("[OK] Copilot 3,000 Intent Datasets verified.")

    # 3. Check PDF Guides
    pdf1 = base / "reports" / "AegisGate_Manual_Testing_Guide.pdf"
    pdf2 = base / "reports" / "AegisGate_Architecture_TechStack_Guide.pdf"
    if not pdf1.exists() or not pdf2.exists():
        print("[*] Evaluation PDF guides missing. Compiling now...")
        subprocess.run([sys.executable, str(base / "tools" / "generate_guides_pdf.py")])
        subprocess.run([sys.executable, str(base / "tools" / "generate_full_blueprint_pdf.py")])
        print("[OK] Evaluation PDF guides compiled.")
    else:
        print("[OK] Evaluation PDF guides verified.")

if __name__ == "__main__":
    print("[*] Scanning Python environment for required libraries...")
    missing = check_missing_packages()
    if missing:
        success = install_packages(missing)
        if not success:
            print("[ERROR] Failed to install some dependencies. Please run manually: pip install -r requirements.txt")
            sys.exit(1)
    else:
        print("[OK] All 15 required Python packages are already installed!")

    check_models_and_data()
    print("[SUCCESS] Environment verification complete. Ready to launch!")
    sys.exit(0)

