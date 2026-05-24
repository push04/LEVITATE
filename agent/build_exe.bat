@echo off
title LEVITATE Agent — Building .exe
color 0E
echo.
echo  Building LEVITATE Sync Agent as a standalone Windows executable...
echo  (This may take 1-2 minutes)
echo.

pip install pyinstaller --quiet

pyinstaller ^
  --onefile ^
  --name "levitate_busy_agent" ^
  --icon NONE ^
  --add-data "config.example.json;." ^
  --hidden-import pyodbc ^
  --hidden-import requests ^
  --hidden-import certifi ^
  --hidden-import charset_normalizer ^
  --hidden-import idna ^
  --hidden-import urllib3 ^
  --noconfirm ^
  --clean ^
  busy_levitate_agent.py

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. See above for details.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   Build complete!
echo   Executable: dist\levitate_busy_agent.exe
echo.
echo   Distribute to your customer:
echo     1. dist\levitate_busy_agent.exe
echo     2. config.example.json  (rename to config.json, fill in)
echo     3. setup_driver.bat     (installs Access ODBC driver)
echo  ============================================================
echo.
pause
