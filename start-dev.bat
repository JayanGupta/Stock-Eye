@echo off
setlocal enabledelayedexpansion
title Stock-Eye — Dev Mode

echo.
echo  =============================================
echo   Stock-Eye — Dev Mode ^(hot reload^)
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

REM ── Start Postgres in Docker ──────────────────────────────────────────
echo  [1/4] Starting PostgreSQL in Docker...
docker compose -f docker-compose.dev.yml up -d
echo.

REM ── Set up web/.env if missing ────────────────────────────────────────
if not exist web\.env (
    echo  [2/4] Creating web\.env from example...
    copy web\.env.example web\.env >nul
    REM Patch DATABASE_URL to use the Docker Postgres
    powershell -NoProfile -Command ^
      "(Get-Content 'web\.env') -replace 'postgresql://user:password@localhost', 'postgresql://stockeye:stockeye_dev@localhost' | Set-Content 'web\.env'"
    echo  [OK] web\.env created — edit it if needed.
) else (
    echo  [2/4] Using existing web\.env
)

REM ── Install Node dependencies ─────────────────────────────────────────
echo.
echo  [3/4] Installing Node dependencies...
call pnpm install
if errorlevel 1 (
    echo  ERROR: pnpm install failed.
    echo  Make sure Node 22 and pnpm are installed:
    echo    npm install -g pnpm
    pause
    exit /b 1
)

REM ── Run DB migrations + seed ──────────────────────────────────────────
echo.
echo  [4/4] Running DB migrations and seed...
cd web
call pnpm db:migrate --name init 2>nul || call pnpm exec prisma migrate deploy
call pnpm db:seed
cd ..

echo.
echo  =============================================
echo   Starting Next.js dev server...
echo   http://localhost:3000
echo   Demo login: demo@stockeye.dev / demo1234
echo  =============================================
echo.

pnpm dev

endlocal
