@echo off
title Install Microsoft Access ODBC Driver
color 0A
echo.
echo  Installing Microsoft Access Database Engine 2016 (x64)
echo  Required to read Busy .bds database files.
echo.

reg query "HKLM\SOFTWARE\ODBC\ODBCINST.INI\Microsoft Access Driver (*.mdb, *.accdb)" >nul 2>&1
if not errorlevel 1 (
    echo  Driver is already installed. Nothing to do.
    pause
    exit /b 0
)

echo  Downloading driver (approx 55 MB)...
powershell -Command "Invoke-WebRequest -Uri 'https://download.microsoft.com/download/3/5/C/35C84C36-661A-44E3-BE3B-7A97CEF8D24D/accessdatabaseengine_X64.exe' -OutFile 'AccessDatabaseEngine_X64.exe' -UseBasicParsing"

if not exist AccessDatabaseEngine_X64.exe (
    echo.
    echo [ERROR] Download failed. Install manually from:
    echo         https://www.microsoft.com/en-us/download/details.aspx?id=54920
    pause
    exit /b 1
)

echo  Installing...
AccessDatabaseEngine_X64.exe /quiet /norestart
del AccessDatabaseEngine_X64.exe

echo.
echo  Done! You can now run levitate_busy_agent.exe
echo.
pause
