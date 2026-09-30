@echo off
title WeatherGPT - AI Meteorological Intelligence Platform
cd /d "%~dp0"

echo ===============================================================
echo     WeatherGPT - Grounded Conversational Weather AI Platform
echo ===============================================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python was not found in PATH.
    echo [*] Launching WeatherGPT directly in your default web browser...
    start "" "frontend\index.html"
    pause
    exit /b
)

echo [*] Checking Python dependencies...
python -c "import fastapi, uvicorn, httpx" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Installing required packages (fastapi, uvicorn, httpx)...
    pip install -r backend\requirements.txt
)

echo [*] Starting WeatherGPT FastAPI Server on http://localhost:8000 ...
start http://localhost:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
