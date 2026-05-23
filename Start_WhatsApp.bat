@echo off
title Levitate Labs - WhatsApp Daemon
color 0A
echo ==============================================
echo       LEVITATE LABS - WHATSAPP DAEMON
echo ==============================================
echo.
echo Starting the local WhatsApp bridge...
echo Please leave this window open to send messages.
echo.
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
node whatsapp-host.mjs
pause
