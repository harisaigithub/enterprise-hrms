@echo off
title Proteccio HRMS — Start All
setlocal

set "ROOT=%~dp0"

echo ================================================
echo   Proteccio Enterprise HRMS — One-command start
echo ================================================

echo.
echo [1/3] Starting PostgreSQL (Docker)...
docker compose -f "%ROOT%docker-compose.yml" up -d db
if errorlevel 1 goto :fail

echo [1/3] Waiting for database to be healthy...
docker exec hrms-postgres pg_isready -U hrms_admin -d hrms_db >nul 2>&1
if errorlevel 1 (
  timeout /t 3 /nobreak >nul
  docker exec hrms-postgres pg_isready -U hrms_admin -d hrms_db >nul 2>&1
)

echo [2/3] Starting backend  -> http://localhost:4000/api/health
start "HRMS Backend" cmd /k "cd /d "%ROOT%backend" && npm run dev"

echo [3/3] Starting frontend -> http://localhost:5173
start "HRMS Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo All services are launching.
echo   - Open  http://localhost:5173  and log in
echo   - Demo accounts in DEMO_CREDENTIALS.md (password: Password@123)
echo.
echo To stop everything: run  stop-all.cmd
pause
exit /b 0

:fail
echo.
echo FAILED to start the database. Is Docker Desktop running?
pause
exit /b 1
