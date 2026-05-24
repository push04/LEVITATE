@echo off
title LEVITATE Sync Agent — Setup
color 0A
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║      LEVITATE Sync Agent — First-Time Setup      ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.10+ is required but not found.
    echo         Download from https://python.org and re-run setup.bat
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] pip install failed. Check your internet connection.
    pause
    exit /b 1
)
echo        Done.

echo.
echo [2/4] Checking for Microsoft Access ODBC Driver...
reg query "HKLM\SOFTWARE\ODBC\ODBCINST.INI\Microsoft Access Driver (*.mdb, *.accdb)" >nul 2>&1
if errorlevel 1 (
    echo        Driver not found — downloading AccessDatabaseEngine_X64.exe ...
    echo        (You need the 64-bit Microsoft Access Database Engine 2016 Redistributable)
    echo.
    echo        If download fails, get it manually from:
    echo        https://www.microsoft.com/en-us/download/details.aspx?id=54920
    echo.
    powershell -Command "Invoke-WebRequest -Uri 'https://download.microsoft.com/download/3/5/C/35C84C36-661A-44E3-BE3B-7A97CEF8D24D/accessdatabaseengine_X64.exe' -OutFile 'AccessDatabaseEngine_X64.exe' -UseBasicParsing"
    if exist AccessDatabaseEngine_X64.exe (
        echo        Installing silently...
        AccessDatabaseEngine_X64.exe /quiet
        del AccessDatabaseEngine_X64.exe
        echo        Driver installed.
    ) else (
        echo [WARN]  Could not auto-download. Install manually and re-run setup.bat
    )
) else (
    echo        Driver already installed.
)

echo.
echo [3/4] Running interactive configuration wizard...
python busy_levitate_agent.py --setup

echo.
echo [4/4] Setup complete!
echo.
echo  To start syncing now:   double-click run.bat
echo  To build .exe:          double-click build_exe.bat
echo.
pause
