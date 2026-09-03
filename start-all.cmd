@echo off
title Proteccio HRMS — Start All
setlocal

set "ROOT=%~dp0"

echo ================================================
echo   Proteccio Enterprise HRMS — One-command start
echo ================================================

echo.
echo [1/4] First-time setup checks...
if not exist "%ROOT%backend\node_modules\" (
  echo   Installing backend dependencies...
  pushd "%ROOT%backend" && call npm install && popd
  if errorlevel 1 goto :fail
) else (
  echo   Backend dependencies present.
)

if not exist "%ROOT%frontend\node_modules\" (
  echo   Installing frontend dependencies...
  pushd "%ROOT%frontend" && call npm install && popd
  if errorlevel 1 goto :fail
) else (
  echo   Frontend dependencies present.
)

if not exist "%ROOT%backend\.env" (
  echo   Creating backend\.env from .env.example...
  copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
)
if not exist "%ROOT%frontend\.env" (
  echo   Creating frontend\.env from .env.example...
  copy "%ROOT%frontend\.env.example" "%ROOT%frontend\.env" >nul
)

echo.
echo [2/4] Starting PostgreSQL (Docker)...
docker compose -f "%ROOT%docker-compose.yml" up -d db
if errorlevel 1 goto :fail

echo [2/4] Waiting for database to be healthy...
docker exec hrms-postgres pg_isready -U hrms_admin -d hrms_db >nul 2>&1
if errorlevel 1 (
  timeout /t 3 /nobreak >nul
  docker exec hrms-postgres pg_isready -U hrms_admin -d hrms_db >nul 2>&1
)

echo.
echo [3/4] Applying migrations + demo data (first run only)...
pushd "%ROOT%backend"
if not exist "%ROOT%.hrms-seeded" (
  call npx prisma migrate deploy
  if errorlevel 1 goto :fail
  call npx prisma generate
  if errorlevel 1 goto :fail
  call npm run prisma:seed
  if errorlevel 1 goto :fail
  echo seeded > "%ROOT%.hrms-seeded"
) else (
  call npx prisma migrate deploy
  if errorlevel 1 goto :fail
  call npx prisma generate
  if errorlevel 1 goto :fail
  echo   Demo data already seeded - keeping existing data.
)
popd

echo.
echo [4/4] Starting backend  -> http://localhost:4000/api/health
start "HRMS Backend" /d "%ROOT%backend" cmd /k "npm run dev"

echo [4/4] Starting frontend -> http://localhost:5173
start "HRMS Frontend" /d "%ROOT%frontend" cmd /k "npm run dev"

echo.
echo All services are launching.
echo   - Open  http://localhost:5173  and log in
echo   - Demo accounts in DEMO_CREDENTIALS.md (password: Password@123)
echo.
echo To stop everything: run  stop-all.cmd
echo To reset demo data:  delete .hrms-seeded, then run start-all.cmd again
pause
exit /b 0

:fail
echo.
echo FAILED. Check Docker Desktop is running, or install errors above.
pause
exit /b 1
