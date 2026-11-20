@echo off
title ZTICK Backend (FastAPI)
cd /d "%~dp0"
echo ========================================================
echo               ZTICK BACKEND (FastAPI)
echo ========================================================
echo.

REM Cek apakah folder venv sudah ada
if not exist "venv\Scripts\activate.bat" (
    echo [1/3] Membuat virtual environment Python...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Gagal membuat venv!
        echo Pastikan Python sudah terinstall di komputer Anda.
        echo Download Python di: https://www.python.org/downloads/
        pause
        exit /b 1
    )
    echo [2/3] Mengaktifkan venv dan menginstall requirements...
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Gagal menginstall dependensi requirements.txt.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Mengaktifkan virtual environment...
    call venv\Scripts\activate.bat
)

echo.
echo [OK] Menjalankan server FastAPI...
echo - API Server: http://127.0.0.1:8000
echo - Swagger Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo Tekan Ctrl+C untuk menghentikan server.
echo.
uvicorn app.main:app --reload --port 8000
pause
