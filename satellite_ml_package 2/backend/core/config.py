"""Central configuration for the satellite CDM replay backend."""
import os
from pathlib import Path

# Resolve project root relative to this file: backend/core/ -> project root
_ROOT = Path(__file__).resolve().parents[2]

# ── Data paths ────────────────────────────────────────────────────────────────
DATA_DIR   = _ROOT / "data"
ML_DIR     = _ROOT / "ml"
FIGS_DIR   = DATA_DIR / "figs"
LOGS_DIR   = _ROOT / "logs"

REPLAY_DEMO_FILE = DATA_DIR / "replay_demo_v4.json"
REPLAY_ALL_FILE  = DATA_DIR / "replay_all_v4.csv"
RULES_FILE       = ML_DIR / "rules.json"
METRICS_FILE     = DATA_DIR / "metrics.json"
POLICY_FILE      = DATA_DIR / "policy.json"
LEARNING_FILE    = DATA_DIR / "learning.json"
LEARNED_POLICY_FILE = DATA_DIR / "learned_policy.json"
SIM_FRAMES_FILE  = DATA_DIR / "sim_frames.json"

STREAM_LOG_FILE  = LOGS_DIR / "stream.jsonl"

# ── Replay settings ───────────────────────────────────────────────────────────
# "demo" → replay_demo_v4.json (19 events)
# "all"  → replay_all_v4.csv (2,167 events)
REPLAY_SOURCE: str = os.environ.get("REPLAY_SOURCE", "demo")

# Seconds of wall-clock time between each synthetic CDM "tick" during replay
REPLAY_SPEED: float = float(os.environ.get("REPLAY_SPEED", "1.0"))

# ── CORS ──────────────────────────────────────────────────────────────────────
_cors_env = os.environ.get("CORS_ORIGINS", "")
if _cors_env:
    CORS_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

LOGS_DIR.mkdir(parents=True, exist_ok=True)
