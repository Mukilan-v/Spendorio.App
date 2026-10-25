@echo off
title Spendora Mobile Phone Tunnel
cd /d "c:\Users\acer\Documents\Task Cost"

:: 1. Check if local server is running
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting Spendora local server in background...
    start "" "wscript.exe" "c:\Users\acer\Documents\Task Cost\run_server_silent.vbs"
    timeout /t 2 /nobreak >nul
)

:: 2. Check if cloudflared is already running in background
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr /I "cloudflared.exe" >nul
if %errorlevel% equ 0 (
    cls
    "C:\Program Files\nodejs\node.exe" scripts/update_phone_link.js
    cls
    echo ============================================================
    echo   SPENDORA & SPENDTRACKER - MOBILE TUNNEL IS ACTIVE!
    echo ============================================================
    echo.
    if exist "%USERPROFILE%\Desktop\Phone_Link.txt" (
        type "%USERPROFILE%\Desktop\Phone_Link.txt"
    )
    echo.
    echo ============================================================
    pause
    exit /b
)

cls
echo ============================================================
echo   SPENDORA & SPENDTRACKER - STARTING MOBILE PHONE ACCESS
echo ============================================================
echo.
echo Starting Cloudflare Secure Mobile Tunnel...
start "" /B .\cloudflared.exe tunnel --protocol http2 --url http://localhost:3000 --logfile tunnel.log
timeout /t 4 /nobreak >nul
"C:\Program Files\nodejs\node.exe" scripts/update_phone_link.js
cls
if exist "%USERPROFILE%\Desktop\Phone_Link.txt" (
    type "%USERPROFILE%\Desktop\Phone_Link.txt"
)
pause
