import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/business/integrations/busy/installer
 * Returns a personalized one-click installer .bat file for Windows.
 * The .bat handles: Python install, agent download, ODBC driver, auto-config,
 * startup registration, and first sync — business only needs to paste their API key.
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://levitatelabs.online'
  const bat = buildInstaller(siteUrl)

  return new NextResponse(bat, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="levitate_setup.bat"',
    },
  })
}

function buildInstaller(siteUrl: string): string {
  return `@echo off
setlocal EnableDelayedExpansion
title LEVITATE Sync Agent Setup
color 0A

set LEVITATE_URL=${siteUrl}
set INSTALL_DIR=%USERPROFILE%\\LevitateAgent
set API_KEYS_URL=${siteUrl}/business/dashboard/api-keys

echo.
echo  ============================================================
echo   LEVITATE Sync Agent - One-Click Setup
echo   Automatically syncs Busy Accounting to LEVITATE CRM
echo  ============================================================
echo.
echo  Before continuing, get your API key from:
echo  !API_KEYS_URL!
echo.
echo  (Open the link above in your browser if you haven't already)
echo.

set /p "API_KEY=  Paste your LEVITATE API key and press Enter: "
if "!API_KEY!"=="" (
    echo.
    echo [ERROR] API key cannot be empty.
    echo         Get one from: !API_KEYS_URL!
    pause
    exit /b 1
)

echo.
echo  Got it. Setting everything up automatically...
echo.

REM ─── Step 1: Python ────────────────────────────────────────────────────────
echo  [1/5] Checking for Python...
python --version >nul 2>&1
if not errorlevel 1 goto :python_ok

echo        Python not found. 
echo        Opening Python download page. Please install Python 3.12 (Check "Add python.exe to PATH" during install).
timeout /t 3 >nul
start https://www.python.org/downloads/
echo.
echo        Press any key AFTER you have finished installing Python...
pause >nul

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is still not detected. Please install Python 3.10+ from python.org, ensure it is added to PATH, and re-run this script.
    pause
    exit /b 1
)
echo        Python installed OK.
goto :python_done

:python_ok
for /f "tokens=*" %%V in ('python --version 2^>^&1') do echo        %%V - OK.

:python_done

REM ─── Step 2: Download agent ────────────────────────────────────────────────
echo.
echo  [2/5] Downloading LEVITATE Sync Agent...
if not exist "!INSTALL_DIR!" mkdir "!INSTALL_DIR!"
curl -s -L -o "%TEMP%\\agent.zip" "!LEVITATE_URL!/downloads/levitate_busy_agent.zip"
if not exist "%TEMP%\\agent.zip" (
    echo [ERROR] Could not download agent files. Check your internet and try again.
    pause
    exit /b 1
)
tar -xf "%TEMP%\\agent.zip" -C "!INSTALL_DIR!"
del "%TEMP%\\agent.zip" >nul 2>&1
echo        Files saved to !INSTALL_DIR!

REM ─── Step 3: Python packages ───────────────────────────────────────────────
echo.
echo  [3/5] Installing required Python packages...
python -m pip install pyodbc requests --quiet --user >nul 2>&1
echo        Packages ready.

REM ─── Step 4: Microsoft Access ODBC driver ─────────────────────────────────
echo.
echo  [4/5] Checking Microsoft Access database driver...
reg query "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\Microsoft Access Driver (*.mdb, *.accdb)" >nul 2>&1
if not errorlevel 1 (
    echo        Driver already installed. OK.
    goto :driver_done
)
reg query "HKLM\\SOFTWARE\\WOW6432Node\\ODBC\\ODBCINST.INI\\Microsoft Access Driver (*.mdb, *.accdb)" >nul 2>&1
if not errorlevel 1 (
    echo        Driver already installed. OK.
    goto :driver_done
)

echo        Driver not found. 
echo        Opening Microsoft Access Database Engine 2016 download page.
echo        Please download the 64-bit version (accessdatabaseengine_X64.exe) and install it.
timeout /t 3 >nul
start https://www.microsoft.com/en-us/download/details.aspx?id=54920
echo.
echo        Press any key AFTER you have finished installing the driver...
pause >nul

:driver_done

REM ─── Step 5: Auto-detect Busy folder and save config ──────────────────────
echo.
echo  [5/5] Detecting Busy data folder and saving configuration...
python "!INSTALL_DIR!\\busy_levitate_agent.py" --auto-config --api-key "!API_KEY!" --api-url "!LEVITATE_URL!" --config "!INSTALL_DIR!\\config.json"
if errorlevel 1 (
    echo [ERROR] Configuration failed. See: !INSTALL_DIR!\\levitate_agent.log
    pause
    exit /b 1
)

REM ─── Add to Windows startup (Safe Method via LNK) ──────────────────────────
set "STARTUP=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
set "SHORTCUT=%STARTUP%\\LEVITATE_Sync.lnk"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\\CreateShortcut.vbs"
echo sLinkFile = "%SHORTCUT%" >> "%TEMP%\\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\\CreateShortcut.vbs"
echo oLink.TargetPath = "python.exe" >> "%TEMP%\\CreateShortcut.vbs"
echo oLink.Arguments = "busy_levitate_agent.py --config config.json" >> "%TEMP%\\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "!INSTALL_DIR!" >> "%TEMP%\\CreateShortcut.vbs"
echo oLink.WindowStyle = 7 >> "%TEMP%\\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\\CreateShortcut.vbs"

cscript /nologo "%TEMP%\\CreateShortcut.vbs"
del "%TEMP%\\CreateShortcut.vbs" >nul 2>&1

echo.
echo  Added to Windows startup. Agent will run automatically when you log in.

REM ─── First sync ────────────────────────────────────────────────────────────
echo.
echo  Running first sync now...
echo.
python "!INSTALL_DIR!\\busy_levitate_agent.py" --config "!INSTALL_DIR!\\config.json" --once

echo.
echo  ============================================================
echo   Setup complete!
echo.
echo   Your Busy customers are now syncing to LEVITATE CRM.
echo   Syncs automatically every hour while this PC is on.
echo.
echo   View your leads at:
echo   !LEVITATE_URL!/business/dashboard/leads
echo  ============================================================
echo.
pause
`
}
