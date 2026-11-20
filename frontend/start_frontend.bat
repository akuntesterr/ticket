@echo off
title ZTICK Frontend (Next.js)
cd /d "%~dp0"
echo ========================================================
echo               ZTICK FRONTEND (Next.js)
echo ========================================================
echo.

if not exist "node_modules" (
    echo [1/2] Menginstall dependensi frontend (npm install)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install gagal.
        pause
        exit /b 1
    )
)

echo.
echo [OK] Menjalankan Next.js Web App...
echo - Website URL: http://localhost:3000
echo ========================================================
echo Tekan Ctrl+C untuk menghentikan server.
echo.
call npm run dev
pause
