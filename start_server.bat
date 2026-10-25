@echo off
cd /d "c:\Users\acer\Documents\Task Cost"

:: 1. Start Spendorio Java Spring Boot Backend if port 3000 is not already running
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting Spendorio Java Spring Boot Backend...
    start "" /B cmd.exe /c "c:\Users\acer\Documents\Task Cost\start_springboot.bat"
    timeout /t 5 /nobreak >nul
)

:: 2. Start Cloudflare mobile tunnel if not already running
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr /I "cloudflared.exe" >nul
if %errorlevel% neq 0 (
    start "" /B .\cloudflared.exe tunnel --protocol http2 --url http://127.0.0.1:3000 --logfile tunnel.log
    timeout /t 3 /nobreak >nul
    start "" /B "C:\Program Files\nodejs\node.exe" scripts/update_phone_link.js
)
