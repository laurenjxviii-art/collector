@echo off
setlocal
cd /d "%~dp0"
echo.
echo ===============================================
echo   Collector - Production Deploy to Vercel
echo ===============================================
echo.
where npx >nul 2>nul
if errorlevel 1 (
  echo Node.js / npx was not found.
  echo Install Node.js 22+ from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
echo Deploying the linked Collector project to production...
call npx --yes vercel@latest --prod --yes
if errorlevel 1 (
  echo.
  echo Deployment did not complete. If Vercel opens a login page, sign in to the LJ account and run this file again.
  pause
  exit /b 1
)
echo.
echo Deployment complete.
echo Open: https://collector-five-ecru.vercel.app
echo.
pause
