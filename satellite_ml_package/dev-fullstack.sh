#!/usr/bin/env bash
# ==============================================================================
# Full-Stack Dev Launcher: Satellite Conjunction Control Center
# Boots FastAPI Backend (port 8000) & Vite Frontend (port 5173) simultaneously
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../satellite_ml_package 2" && pwd)"

echo "🛰️  Initializing Satellite Full-Stack Application..."
echo "📁 Frontend: $FRONTEND_DIR"
echo "📁 Backend:  $BACKEND_DIR"

# 1. Detect Python / Uvicorn
if [ -x "$BACKEND_DIR/venv/Scripts/python.exe" ]; then
    UVICORN_CMD="$BACKEND_DIR/venv/Scripts/python.exe -m uvicorn"
elif [ -x "$BACKEND_DIR/venv/bin/python" ]; then
    UVICORN_CMD="$BACKEND_DIR/venv/bin/python -m uvicorn"
elif [ -x "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3" ]; then
    UVICORN_CMD="/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -m uvicorn"
elif command -v uvicorn >/dev/null 2>&1; then
    UVICORN_CMD="uvicorn"
elif command -v python3 >/dev/null 2>&1; then
    UVICORN_CMD="python3 -m uvicorn"
elif command -v python >/dev/null 2>&1; then
    UVICORN_CMD="python -m uvicorn"
else
    echo "❌ Error: Python 3 / Uvicorn not found. Please install Python 3.11+."
    exit 1
fi

# Cleanup handler for graceful shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down backend and frontend services..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 2. Launch Backend
echo "🚀 [1/2] Starting Backend at http://localhost:8000..."
(
    cd "$BACKEND_DIR"
    $UVICORN_CMD backend.main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# Brief pause to allow backend socket bind
sleep 1.5

# 3. Launch Frontend
echo "💻 [2/2] Starting Frontend at http://localhost:5173..."
(
    cd "$FRONTEND_DIR"
    npm run dev
) &
FRONTEND_PID=$!

echo "✨ Full-stack stack running!"
echo "   - Frontend:  http://localhost:5173"
echo "   - Backend:   http://localhost:8000"
echo "   - API Docs:  http://localhost:8000/docs"
echo "   - Stream WS: ws://localhost:8000/stream"
echo "Press Ctrl+C to stop all servers."

# Wait for both processes
wait
