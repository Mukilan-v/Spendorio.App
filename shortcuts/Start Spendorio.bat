@echo off
title Spendorio & SpendTracker
cd /d "c:\Users\acer\Documents\Task Cost"

netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo Spendorio & SpendTracker is already running!
    start http://localhost:3000
    exit /b
)

echo Starting Spendorio & SpendTracker in background...
start "" "wscript.exe" "c:\Users\acer\Documents\Task Cost\run_server_silent.vbs"
timeout /t 2 /nobreak >nul
start http://localhost:3000
exit
