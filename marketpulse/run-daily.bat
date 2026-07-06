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

REM Tee stdout to both the console and the log file, since dumping everything
REM straight into the log file (with nothing shown on screen for several
REM minutes) made the window look frozen or broken while it was actually
REM still working. Deliberately NOT merging stderr in here (no 2^>&1) -
REM Windows PowerShell 5.1 wraps a piped native command's stderr lines as
REM NativeCommandError records, which made ordinary console.warn retry
REM messages (nothing actually wrong) print as scary red errors. Stderr
REM still prints live to the console as normal, it just will not appear in
REM the saved log file.
powershell -NoProfile -Command "& { npm start | Tee-Object -FilePath '%LOGFILE%' -Append }"
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
