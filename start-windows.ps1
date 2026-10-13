# ==============================================================================
# Satellite Mission Control - Root Windows PowerShell Launcher
# ==============================================================================

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $RootDir "satellite_ml_package"
$BackendDir  = Join-Path $RootDir "satellite_ml_package 2"

Write-Host "🛰️  Initializing Satellite Full-Stack Application on Windows..." -ForegroundColor Cyan
Write-Host "📁 Frontend: $FrontendDir" -ForegroundColor Gray
Write-Host "📁 Backend:  $BackendDir" -ForegroundColor Gray

# 1. Detect Python
$VenvPy = Join-Path $BackendDir "venv\Scripts\python.exe"
$VenvPyLocal = Join-Path $FrontendDir "venv\Scripts\python.exe"

if (Test-Path $VenvPy) {
    $PythonExe = $VenvPy
} elseif (Test-Path $VenvPyLocal) {
    $PythonExe = $VenvPyLocal
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonExe = "python"
} else {
    Write-Host "❌ Error: Python not found. Please install Python 3.11+." -ForegroundColor Red
    exit 1
}

Write-Host "🐍 Using Python: $PythonExe" -ForegroundColor Green

# 2. Check npm
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: npm not found. Please install Node.js 18+ and add it to PATH." -ForegroundColor Red
    exit 1
}

# 3. Launch Backend
Write-Host "🚀 [1/2] Starting Backend at http://localhost:8000..." -ForegroundColor Cyan
$BackendProcess = Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "backend.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $BackendDir `
    -PassThru

Start-Sleep -Seconds 2

# 4. Launch Frontend
Write-Host "💻 [2/2] Starting Frontend at http://localhost:5173..." -ForegroundColor Cyan
$FrontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory $FrontendDir `
    -PassThru

Write-Host ""
Write-Host "✨ Full-stack satellite platform running!" -ForegroundColor Green
Write-Host "   - Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "   - Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   - API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "   - Stream WS: ws://localhost:8000/stream" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers..." -ForegroundColor Yellow

try {
    while (-not $BackendProcess.HasExited -and -not $FrontendProcess.HasExited) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n🛑 Shutting down backend and frontend services..." -ForegroundColor Magenta
    if (-not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (-not $FrontendProcess.HasExited) {
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
