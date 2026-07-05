@echo off
REM MarketPulse daily runner - double-click, or point Windows Task Scheduler at
REM this file (Action: "Start a program", Program: this .bat, no arguments).
REM Runs the full pipeline (news, watchlist, prices, sentiment, technicals,
REM digest) and writes straight into the shared Supabase project
REM levitatelabs.online reads from. Nothing else to run by hand.

cd /d "%~dp0"

if not exist logs mkdir logs

REM Locale-independent YYYY-MM-DD, since %date% formatting varies by Windows
REM regional settings and breaks silently on some machines.
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%d

set LOGFILE=logs\%TODAY%.log

echo ============================================== > "%LOGFILE%"
echo MarketPulse run started: %date% %time% >> "%LOGFILE%"
echo ============================================== >> "%LOGFILE%"

call npm start >> "%LOGFILE%" 2>&1
set EXITCODE=%ERRORLEVEL%

echo. >> "%LOGFILE%"
echo Run finished: %date% %time% - exit code %EXITCODE% >> "%LOGFILE%"

copy /y "%LOGFILE%" "logs\latest.log" >nul 2>&1

if %EXITCODE% neq 0 (
  echo MarketPulse run FAILED - see marketpulse\logs\%TODAY%.log
) else (
  echo MarketPulse run completed successfully - see marketpulse\logs\%TODAY%.log
)

exit /b %EXITCODE%
