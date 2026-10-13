@echo off
REM ==============================================================================
REM Satellite Mission Control - Root Windows Launcher
REM Double-click this file to start the entire system!
REM ==============================================================================

setlocal enabledelayedexpansion
title Satellite Mission Control - Launcher

set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%satellite_ml_package"
set "BACKEND_DIR=%ROOT_DIR%satellite_ml_package 2"

echo ==============================================================================
echo  Satellite Full-Stack Application Launcher (Windows)
echo ==============================================================================
echo Root:     %ROOT_DIR%
echo Frontend: %FRONTEND_DIR%
echo Backend:  %BACKEND_DIR%
echo.

set "PY_EXE="
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    set "PY_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
) else if exist "%FRONTEND_DIR%\venv\Scripts\python.exe" (
    set "PY_EXE=%FRONTEND_DIR%\venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

echo [1/2] Launching Backend on http://localhost:8000...
start "Satellite Backend (FastAPI)" cmd /k "cd /d "%BACKEND_DIR%" && "%PY_EXE%" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Frontend on http://localhost:5173...
start "Satellite Frontend (Vite/React)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ==============================================================================
echo  Full-stack satellite platform is booting up!
echo    - Mission Control Dashboard:  http://localhost:5173
echo    - FastAPI Backend:            http://localhost:8000
echo    - Swagger Interactive Docs:   http://localhost:8000/docs
echo    - WebSocket Live Stream:      ws://localhost:8000/stream
echo ==============================================================================
echo.
pause
