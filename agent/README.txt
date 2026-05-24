LEVITATE Sync Agent for Busy Accounting
========================================

QUICK START
-----------
1. Get your config.json:
   Go to your LEVITATE dashboard → Admin → Integrations → Busy → LEVITATE Agent tab
   Click "Download My Config" — this gives you a config.json with your API key pre-filled.

2. Copy config.json into this folder (same folder as setup.bat).

3. Double-click:  setup.bat
   This will:
   - Install Python (if not already installed)
   - Install required libraries (pyodbc, requests)
   - Install Microsoft Access ODBC Driver (to read Busy .bds files)
   - Run the interactive configuration wizard

4. Double-click:  run.bat
   The agent will start syncing your Busy data to LEVITATE.

REQUIREMENTS
------------
- Windows 10 / 11 (64-bit)
- Internet connection (for first-time dependency install only)
- Busy Accounting installed on this machine (default path: C:\BusyWin\DATA\)

LOGS
----
After running, check levitate_agent.log in this folder for sync results.

SUPPORT
-------
Contact LEVITATE at levitatelabs.online@gmail.com
