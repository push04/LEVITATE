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

echo ==============================================
echo MarketPulse daily run starting...
echo This takes several minutes - do not close this window.
echo Live output below is also being saved to marketpulse\%LOGFILE%
echo ==============================================
echo.

echo ============================================== > "%LOGFILE%"
echo MarketPulse run started: %date% %time% >> "%LOGFILE%"
echo ============================================== >> "%LOGFILE%"

REM Tee stdout+stderr to both the console and the log file, since dumping
REM everything straight into the log file (with nothing shown on screen for
REM several minutes) made the window look frozen or broken while it was
REM actually still working.
powershell -NoProfile -Command "& { npm start 2>&1 | Tee-Object -FilePath '%LOGFILE%' -Append }"
set EXITCODE=%ERRORLEVEL%

echo. >> "%LOGFILE%"
echo Run finished: %date% %time% - exit code %EXITCODE% >> "%LOGFILE%"

copy /y "%LOGFILE%" "logs\latest.log" >nul 2>&1

echo.
echo ==============================================
if %EXITCODE% neq 0 (
  echo MarketPulse run FAILED - exit code %EXITCODE%
  echo See marketpulse\%LOGFILE% for details
) else (
  echo MarketPulse run completed successfully
  echo Full log: marketpulse\%LOGFILE%
)
echo ==============================================
echo.
echo Press any key to close this window...
pause >nul

exit /b %EXITCODE%
