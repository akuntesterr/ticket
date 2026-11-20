@echo off
title ZTICK Launcher
cd /d "%~dp0"
echo ========================================================
echo              ZTICK APPLICATION LAUNCHER
echo ========================================================
echo.
echo 1. Menjalankan Backend (FastAPI)...
start "ZTICK Backend" cmd /k "cd /d %~dp0backend && start_backend.bat"

echo 2. Menjalankan Frontend (Next.js)...
start "ZTICK Frontend" cmd /k "cd /d %~dp0frontend && start_frontend.bat"

echo.
echo ========================================================
echo Jendela Backend dan Frontend telah dibuka!
echo.
echo - Backend API  : http://127.0.0.1:8000/docs
echo - Frontend Web : http://localhost:3000
echo ========================================================
echo Jangan tutup jendela ini jika ingin membaca informasi ini.
pause
