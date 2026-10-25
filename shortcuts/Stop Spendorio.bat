@echo off
title Stop Spendorio & SpendTracker
echo Stopping Spendorio & SpendTracker on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
taskkill /F /IM cloudflared.exe >nul 2>&1
echo Spendorio & SpendTracker and Mobile Tunnel stopped successfully.
timeout /t 2 /nobreak >nul
exit
