@echo off
REM ==============================================================================
REM Full-Stack Dev Launcher for Windows (Command Prompt / Batch)
REM Boots FastAPI Backend (port 8000) & Vite Frontend (port 5173) simultaneously
REM ==============================================================================

setlocal enabledelayedexpansion
title Satellite Mission Control - Launcher

set "SCRIPT_DIR=%~dp0"
set "FRONTEND_DIR=%SCRIPT_DIR%"
set "BACKEND_DIR=%SCRIPT_DIR%..\satellite_ml_package 2"

echo ==============================================================================
echo  Satellite Full-Stack Application Launcher (Windows)
echo ==============================================================================
echo Frontend: %FRONTEND_DIR%
echo Backend:  %BACKEND_DIR%
echo.

set "PY_EXE="
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    set "PY_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
) else if exist "%FRONTEND_DIR%venv\Scripts\python.exe" (
    set "PY_EXE=%FRONTEND_DIR%venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

echo [1/2] Starting Backend at http://localhost:8000...
start "Satellite Backend (FastAPI)" cmd /k "cd /d "%BACKEND_DIR%" && "%PY_EXE%" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend at http://localhost:5173...
start "Satellite Frontend (Vite/React)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ==============================================================================
echo  Full-stack satellite platform is starting up in separate terminal windows!
echo    - Frontend:  http://localhost:5173
echo    - Backend:   http://localhost:8000
echo    - API Docs:  http://localhost:8000/docs
echo    - Stream WS: ws://localhost:8000/stream
echo ==============================================================================
echo.
pause
