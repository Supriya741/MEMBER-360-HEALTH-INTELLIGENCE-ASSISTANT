@echo off
setlocal enabledelayedexpansion
title Member 360 Backend Server Launcher
cd /d "%~dp0backend"

echo =======================================================
echo    Member 360 Health Intelligence Assistant
echo    Starting Backend Server...
echo =======================================================
echo.

:: 1. Detect Python command
set "PY_CMD="
python --version >nul 2>&1 && set "PY_CMD=python"
if not defined PY_CMD (
  py -3 --version >nul 2>&1 && set "PY_CMD=py -3"
)
if not defined PY_CMD (
  py --version >nul 2>&1 && set "PY_CMD=py"
)
if not defined PY_CMD (
  for /d %%P in ("%LOCALAPPDATA%\Programs\Python\Python3*" "%LOCALAPPDATA%\Python\pythoncore-3*" "%ProgramFiles%\Python3*" "C:\Python3*") do (
    if exist "%%P\python.exe" set "PY_CMD=%%P\python.exe"
  )
)

if not defined PY_CMD (
  echo [ERROR] Python was not found on this computer.
  echo.
  echo Please install Python (version 3.10+) from https://www.python.org/downloads/
  echo IMPORTANT: During installation, make sure to check "Add python.exe to PATH".
  echo.
  pause
  exit /b 1
)

:: 2. Activate or create virtual environment
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
) else if exist venv\Scripts\activate.bat (
  call venv\Scripts\activate.bat
) else (
  echo [1/2] Creating isolated Python environment (.venv)...
  %PY_CMD% -m venv .venv
  call .venv\Scripts\activate.bat
  echo [2/2] Installing backend dependencies...
  python -m pip install -r requirements.txt
)

echo.
echo =======================================================
echo    Backend running at: http://localhost:8000
echo    Interactive API Docs: http://localhost:8000/docs
echo =======================================================
echo (Keep this window open while using Member 360)
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause


