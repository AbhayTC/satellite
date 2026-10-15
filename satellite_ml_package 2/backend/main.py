"""
Main FastAPI application
────────────────────────
Endpoints:
  WebSocket  /stream
  GET        /events
  GET        /events/{event_id}/history
  POST       /replay/start
  POST       /replay/stop
  POST       /replay/reset
  GET        /health
  GET        /metrics
  GET        /policy
  Static     /figs/*
  POST       /predict
  GET        /predict/info
  GET        /predict/presets
  GET        /learning
  GET        /learning/policy
  GET        /simulation/frames
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core.config import (
    CORS_ORIGINS,
    FIGS_DIR,
    METRICS_FILE,
    POLICY_FILE,
    RULES_FILE,
)
from backend.agents.orchestrator import ReplayOrchestrator
from backend.api.calculator import router as calc_router
from backend.api.learning import (
    router as learning_router,
    _load_learning,
    _load_learned_policy,
    _load_sim_frames,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ── WebSocket connection manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)
        logger.info("WS connected: %s (total=%d)", ws.client, len(self.active))

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)
        logger.info("WS disconnected (total=%d)", len(self.active))

    async def broadcast(self, data: dict):
        text = json.dumps(data)
        dead: Set[WebSocket] = set()
        for ws in list(self.active):
            try:
                await ws.send_text(text)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active.discard(ws)


manager = ConnectionManager()


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm the learning/sim caches at startup
    try:
        _load_learning()
        _load_learned_policy()
        _load_sim_frames()
        logger.info("Learning/simulation caches warmed.")
    except Exception as exc:
        logger.warning("Cache warm-up skipped: %s", exc)
    yield
    await orchestrator.stop()


app = FastAPI(
    title="Satellite CDM Replay Backend",
    version="1.0.0",
    description="Multi-agent system for ESA Collision Avoidance Challenge replay.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = ReplayOrchestrator(ws_broadcast=manager.broadcast)

# ── Include routers ───────────────────────────────────────────────────────────
app.include_router(calc_router)
app.include_router(learning_router)

# ── Static figs ───────────────────────────────────────────────────────────────
if FIGS_DIR.exists():
    app.mount("/figs", StaticFiles(directory=str(FIGS_DIR)), name="figs")
else:
    logger.warning("Figs directory not found: %s", FIGS_DIR)


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/stream")
async def websocket_stream(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Keep alive; actual data is pushed via broadcast
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── Events ────────────────────────────────────────────────────────────────────

@app.get("/events", tags=["events"])
async def list_events():
    """Return the latest STATE_UPDATE, RISK_ALERT and decision per event."""
    return orchestrator.store.latest_per_event()


@app.get("/events/{event_id}/history", tags=["events"])
async def event_history(event_id: str):
    """Return all stream messages recorded for a given event."""
    history = orchestrator.store.history(event_id)
    return {"event_id": event_id, "messages": history}


# ── Replay control ────────────────────────────────────────────────────────────

@app.post("/replay/start", tags=["replay"])
async def replay_start(source: Optional[str] = None, speed: Optional[float] = None):
    """Start (or resume) the replay pipeline."""
    await orchestrator.start(source=source, speed=speed)
    return {"status": "started", "running": orchestrator.is_running}


@app.post("/replay/stop", tags=["replay"])
async def replay_stop():
    """Stop the replay pipeline."""
    await orchestrator.stop()
    return {"status": "stopped"}


@app.post("/replay/reset", tags=["replay"])
async def replay_reset(source: Optional[str] = None, speed: Optional[float] = None):
    """Stop, clear state, and restart the replay pipeline."""
    await orchestrator.reset(source=source, speed=speed)
    return {"status": "reset", "running": orchestrator.is_running}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "replay_running": orchestrator.is_running,
        "ws_connections": len(manager.active),
    }


# ── Static data files ─────────────────────────────────────────────────────────

@app.get("/rules", tags=["data"])
async def get_rules():
    """Return the rules engine configuration (rules.json)."""
    with RULES_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/metrics", tags=["data"])
async def get_metrics():
    with METRICS_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/policy", tags=["data"])
async def get_policy():
    """Return decision policy describing rule tiers and thresholds."""
    if RULES_FILE.exists():
        with RULES_FILE.open(encoding="utf-8") as fh:
            rules_data = json.load(fh)
        return {
            "method": rules_data.get("method"),
            "max_points": rules_data.get("max_points", 12),
            "thresholds": rules_data.get("thresholds", {"review": 3, "maneuver": 6}),
            "tiers": rules_data.get("tiers", {}),
            "targets": rules_data.get("targets", {}),
            "review": {
                "threshold_points": rules_data.get("thresholds", {}).get("review", 3),
                "action": "MONITOR",
                "stats": rules_data.get("tiers", {}).get("review", {}),
            },
            "maneuver": {
                "threshold_points": rules_data.get("thresholds", {}).get("maneuver", 6),
                "action": "MANEUVER",
                "stats": rules_data.get("tiers", {}).get("maneuver", {}),
            },
            "lite": {
                "threshold_review": 0.2003,
                "threshold_maneuver": 0.6575,
                "label": "LightGBM Benchmark (Comparison Only)",
            },
        }
    with POLICY_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)
