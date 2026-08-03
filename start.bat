@echo off
setlocal enabledelayedexpansion
title Stock-Eye — Starting...

echo.
echo  =============================================
echo   Stock-Eye — Local Docker Setup
echo  =============================================
echo.

REM ── Check Docker is running ───────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Docker Desktop is not running.
    echo  Please open Docker Desktop and wait for it to start, then run this again.
    echo.
    pause
    exit /b 1
)
echo  [OK] Docker Desktop is running

REM ── Generate .env if missing ──────────────────────────────────────────
if not exist .env (
    echo  [..] No .env found — generating one with a random AUTH_SECRET...
    for /f "delims=" %%i in ('powershell -NoProfile -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"') do set "SECRET=%%i"
    (
        echo AUTH_SECRET=!SECRET!
        echo POSTGRES_PASSWORD=stockeye_dev
    ) > .env
    echo  [OK] Created .env
) else (
    echo  [OK] Using existing .env
)

echo.
echo  Starting all services (this takes a few minutes on first run):
echo    - PostgreSQL 16
echo    - Redis
echo    - DB migrations + seed  ^(demo@stockeye.dev / demo1234^)
echo    - Python ML service     ^(YOLOv8, forecasting, PDF invoices^)
echo    - Next.js web app
echo.
echo  Press Ctrl+C to stop watching logs. Services keep running in Docker.
echo  Run stop.bat to shut everything down.
echo.

docker compose up --build

if errorlevel 1 (
    echo.
    echo  ERROR: docker compose failed. See the output above for details.
)

echo.
pause
endlocal
