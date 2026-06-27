@echo off
setlocal EnableDelayedExpansion
title Levitate WhatsApp Admin Agent
color 0A

echo.
echo  ============================================================
echo       LEVITATE LABS - WhatsApp Admin Agent Setup
echo  ============================================================
echo.

:: ── Check Node.js ────────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Node.js is not installed.
    echo.
    echo  Please install Node.js 18 or higher from:
    echo  https://nodejs.org/en/download
    echo.
    echo  After installing Node.js, run this file again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=1,2,3 delims=v." %%a in ('node --version') do set NODE_MAJOR=%%b
if %NODE_MAJOR% LSS 18 (
    color 0C
    echo  [ERROR] Node.js version is too old.
    echo  Required: Node.js 18 or higher
    echo  Current:
    node --version
    echo.
    echo  Please update Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo  [OK] Node.js found:
node --version
echo.

:: ── Install dependencies if needed ───────────────────────────────────────────
cd /d "%~dp0"

if not exist "node_modules\whatsapp-web.js" (
    echo  [SETUP] Installing dependencies (takes 2-5 minutes first time)...
    echo  Please wait...
    echo.
    call npm install --loglevel=error
    if errorlevel 1 (
        color 0C
        echo  [ERROR] Failed to install dependencies.
        echo  Try running: npm install
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed.
    echo.
)

:: ── Load existing config ──────────────────────────────────────────────────────
set "ENV_FILE=%~dp0.env"
set "NEXT_APP_URL="
set "DAEMON_SECRET="
set "SUPABASE_URL="
set "SUPABASE_KEY="

if exist "%ENV_FILE%" (
    echo  [OK] Found existing config at .env
    echo  Loading config...
    for /f "usebackq tokens=1,2 delims==" %%a in ("%ENV_FILE%") do (
        if "%%a"=="NEXT_APP_URL"                 set "NEXT_APP_URL=%%b"
        if "%%a"=="DAEMON_SECRET"                set "DAEMON_SECRET=%%b"
        if "%%a"=="NEXT_PUBLIC_SUPABASE_URL"     set "SUPABASE_URL=%%b"
        if "%%a"=="SUPABASE_SERVICE_ROLE_KEY"    set "SUPABASE_KEY=%%b"
    )
    echo.
)

:: ── First-time setup ─────────────────────────────────────────────────────────
set "NEEDS_SAVE=0"

if "!NEXT_APP_URL!"=="" (
    set "NEEDS_SAVE=1"
    echo  ┌─────────────────────────────────────────────────────────┐
    echo  │  FIRST TIME SETUP — Enter your Levitate server details  │
    echo  └─────────────────────────────────────────────────────────┘
    echo.
    set /p "NEXT_APP_URL=  Your Netlify URL (e.g. https://yoursite.netlify.app): "
    :: Strip trailing slash
    if "!NEXT_APP_URL:~-1!"=="/" set "NEXT_APP_URL=!NEXT_APP_URL:~0,-1!"
    echo.
)

if "!DAEMON_SECRET!"=="" (
    set "NEEDS_SAVE=1"
    echo  The DAEMON_SECRET is in your Netlify environment variables.
    echo  Default is: levitate-daemon-secret
    echo.
    set /p "DAEMON_SECRET=  Daemon Secret (press Enter for default): "
    if "!DAEMON_SECRET!"=="" set "DAEMON_SECRET=levitate-daemon-secret"
    echo.
)

if "!SUPABASE_URL!"=="" (
    set "NEEDS_SAVE=1"
    echo  Get these from your Supabase project Settings ^> API
    echo.
    set /p "SUPABASE_URL=  Supabase Project URL (https://xxx.supabase.co): "
    echo.
)

if "!SUPABASE_KEY!"=="" (
    set "NEEDS_SAVE=1"
    echo  Use the SERVICE ROLE key (not anon key) - shown in Supabase Settings > API
    echo.
    set /p "SUPABASE_KEY=  Supabase Service Role Key: "
    echo.
)

:: ── Save config ───────────────────────────────────────────────────────────────
if "!NEEDS_SAVE!"=="1" (
    echo  Saving config to .env...
    (
        echo NEXT_APP_URL=!NEXT_APP_URL!
        echo DAEMON_SECRET=!DAEMON_SECRET!
        echo NEXT_PUBLIC_SUPABASE_URL=!SUPABASE_URL!
        echo SUPABASE_SERVICE_ROLE_KEY=!SUPABASE_KEY!
    ) > "%ENV_FILE%"
    echo  [OK] Config saved. You won't need to enter this again.
    echo.
)

:: ── Validate config ───────────────────────────────────────────────────────────
if "!NEXT_APP_URL!"=="" (
    color 0C
    echo  [ERROR] Netlify URL is required.
    del "%ENV_FILE%" 2>nul
    pause
    exit /b 1
)
if "!SUPABASE_URL!"=="" (
    color 0C
    echo  [ERROR] Supabase URL is required.
    del "%ENV_FILE%" 2>nul
    pause
    exit /b 1
)
if "!SUPABASE_KEY!"=="" (
    color 0C
    echo  [ERROR] Supabase key is required.
    del "%ENV_FILE%" 2>nul
    pause
    exit /b 1
)

:: ── Set environment and start ─────────────────────────────────────────────────
set "NEXT_APP_URL=!NEXT_APP_URL!"
set "DAEMON_SECRET=!DAEMON_SECRET!"
set "NEXT_PUBLIC_SUPABASE_URL=!SUPABASE_URL!"
set "SUPABASE_SERVICE_ROLE_KEY=!SUPABASE_KEY!"
:: Admin mode — no COMPANY_ID
set "COMPANY_ID="

echo  ============================================================
echo   Config loaded:
echo     Server : !NEXT_APP_URL!
echo     Mode   : ADMIN (all messages)
echo  ============================================================
echo.
echo  Starting WhatsApp connection...
echo  A QR code will appear below. Scan it with WhatsApp.
echo.
echo  WhatsApp ^> Three dots ^> Linked Devices ^> Link a Device
echo.
echo  ─────────────────────────────────────────────────────────────
echo  Keep this window OPEN to send messages automatically.
echo  Minimize it — don't close it.
echo  ─────────────────────────────────────────────────────────────
echo.

node whatsapp-host.mjs

echo.
echo  [STOPPED] Agent has stopped.
echo  Run this file again to restart.
echo.
pause
