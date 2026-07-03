@echo off
setlocal
cd /d "%~dp0tenderpulse-bj"

echo ============================================
echo  TenderPulse BJ - Bihar/Jharkhand Tender Bot
echo ============================================

if not exist node_modules (
    echo [setup] Installing scraper/server dependencies, first run only...
    call npm install
)

if not exist "%USERPROFILE%\AppData\Local\ms-playwright" (
    echo [setup] Installing Playwright browser, first run only...
    call npx playwright install chromium
)

if not exist dashboard\node_modules (
    echo [setup] Installing admin dashboard dependencies, first run only...
    call npm install --prefix dashboard
)

if not exist dashboard\dist (
    echo [setup] Building admin dashboard, first run only...
    call npm run build --prefix dashboard
)

if not exist data mkdir data

echo [run] Starting crawler loop in its own window...
start "TenderPulse - Crawler" cmd /k npm run start

echo [run] Starting admin server + dashboard in its own window...
start "TenderPulse - Admin Server" cmd /k npm run server

echo.
echo Two windows just opened: one crawls, one serves the admin dashboard.
echo Open http://localhost:4000 in your browser to use the dashboard.
echo Closing this window will NOT stop them - close their own windows to stop.
echo.
pause
