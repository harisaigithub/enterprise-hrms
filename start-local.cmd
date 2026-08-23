@echo off
title Proteccio HRMS — Start Local (No Docker)
setlocal

set "ROOT=%~dp0"

echo ================================================
echo   Proteccio Enterprise HRMS — Local Start
echo ================================================
echo.
echo Skipping Docker because a local PostgreSQL instance was detected.

echo.
echo [1/3] First-time setup checks...
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
echo [2/3] Applying migrations + demo data (first run only)...
pushd "%ROOT%backend"
if not exist "%ROOT%.hrms-seeded" (
  call npx prisma migrate deploy
  if errorlevel 1 goto :fail
  call npm run prisma:seed
  if errorlevel 1 goto :fail
  echo seeded > "%ROOT%.hrms-seeded"
) else (
  call npx prisma migrate deploy
  if errorlevel 1 goto :fail
  echo   Demo data already seeded - keeping existing data.
)
popd

echo.
echo [3/3] Starting backend  -> http://localhost:4000/api/health
start "HRMS Backend" cmd /k "cd /d ""%ROOT%backend"" && npm run dev"

echo [3/3] Starting frontend -> http://localhost:5173
start "HRMS Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev"

echo.
echo All services are launching.
echo   - Open  http://localhost:5173  and log in
echo   - Demo accounts in DEMO_CREDENTIALS.md (password: Password@123)
echo.
echo To reset demo data:  delete .hrms-seeded, then run start-local.cmd again
pause
exit /b 0

:fail
echo.
echo FAILED. Please check console errors above.
pause
exit /b 1
