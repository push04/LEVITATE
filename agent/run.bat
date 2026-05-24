@echo off
title LEVITATE Sync Agent
color 0B
echo.
echo  LEVITATE Sync Agent running...  (close this window to stop)
echo.
python busy_levitate_agent.py --config config.json
if errorlevel 1 (
    echo.
    echo [ERROR] Agent exited with an error. Check levitate_agent.log for details.
    pause
)
