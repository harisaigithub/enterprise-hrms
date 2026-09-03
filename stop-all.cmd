@echo off
title Proteccio HRMS — Stop All
setlocal

echo Stopping database (Docker)...
docker compose -f "%~dp0docker-compose.yml" down

echo Closing backend and frontend windows...
taskkill /FI "WINDOWTITLE eq HRMS Backend*" >nul 2>&1
taskkill /FI "WINDOWTITLE eq HRMS Frontend*" >nul 2>&1

echo Freeing ports 4000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Done. All services stopped.
pause
