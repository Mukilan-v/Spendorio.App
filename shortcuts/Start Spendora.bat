@echo off
title Spendora & SpendTracker
cd /d "c:\Users\acer\Documents\Task Cost"

:: Check if port 3000 is already active
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo Spendora & SpendTracker is already running!
    start http://localhost:3000
    exit /b
)

echo Starting Spendora & SpendTracker in background...
start "" "wscript.exe" "c:\Users\acer\Documents\Task Cost\run_server_silent.vbs"

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak >nul

:: Open default browser
start http://localhost:3000

exit
