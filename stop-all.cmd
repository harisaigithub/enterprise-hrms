@echo off
title Proteccio HRMS — Stop All
setlocal

echo Stopping database (Docker)...
docker compose -f "%~dp0docker-compose.yml" down

echo Closing backend and frontend windows...
taskkill /FI "WINDOWTITLE eq HRMS Backend*" >nul 2>&1
taskkill /FI "WINDOWTITLE eq HRMS Frontend*" >nul 2>&1

echo.
echo Done. All services stopped.
pause
