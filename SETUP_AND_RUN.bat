@echo off
title AegisGate AI Gateway IDS - Auto Setup & Launcher
color 0B

echo ===============================================================================
echo        AEGISGATE AI-POWERED API GATEWAY INTRUSION DETECTION SYSTEM (IDS)
echo                Automated Environment Diagnostic & One-Click Launcher
echo ===============================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python Installation
echo [*] Checking Python installation on this machine...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python 3.10 or 3.11 is not detected in your system PATH!
    echo.
    echo Please install Python:
    echo 1. Download Python from: https://www.python.org/downloads/
    echo 2. IMPORTANT: Check the box "Add python.exe to PATH" during installation.
    echo 3. Re-run this file after installing.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
echo [OK] %PY_VER% detected.
echo.

:: 1.5 Auto-initialize .env from template if missing
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Initialized .env configuration file from template.
    )
)

:: 2. Smart Diagnostic & Auto-Install Missing Dependencies
echo [*] Checking installed Python libraries and system requirements...
python tools\check_and_install_deps.py
if %errorlevel% neq 0 (
    echo.
    echo [!] Attempting fallback direct pip install from requirements.txt...
    python -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install required Python packages.
        echo Please ensure you have an active internet connection.
        pause
        exit /b 1
    )
)
echo.

:: 3. Check Frontend Production Bundle
if not exist "frontend\dist\index.html" (
    echo [*] Frontend production bundle missing. Checking Node.js/npm...
    call npm --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [*] Node.js detected. Building modern React frontend bundle...
        cd frontend
        call npm install
        call npm run build
        cd ..
        echo [OK] Frontend built successfully.
    ) else (
        echo [!] Warning: Node.js is not installed, but pre-compiled static assets will be used.
    )
) else (
    echo [OK] React 18 + Slate Pro frontend bundle verified.
)
echo.

:: 4. Launch System & Open Browser
echo ===============================================================================
echo   [READY] Launching AegisGate AI Gateway on http://localhost:8000 ...
echo   [READY] Opening SOC Console in your default web browser...
echo   
echo   Press CTRL+C anytime in this window to stop the server.
echo ===============================================================================
echo.

:: Open browser after 2.5 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000/dashboard"

:: Start FastAPI Server
python app.py

pause

