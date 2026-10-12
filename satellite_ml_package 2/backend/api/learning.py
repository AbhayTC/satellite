"""
Learning & Simulation endpoints
  GET /learning
  GET /learning/policy
  GET /simulation/frames?start=0&count=30
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from backend.core.config import LEARNED_POLICY_FILE, LEARNING_FILE, SIM_FRAMES_FILE

logger = logging.getLogger(__name__)
router = APIRouter(tags=["learning"])

_SIM_MAX_COUNT = 90


# ── Cache helpers ─────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_learning() -> Dict[str, Any]:
    with LEARNING_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def _load_learned_policy() -> List[dict]:
    with LEARNED_POLICY_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def _load_sim_frames() -> List[dict]:
    if not SIM_FRAMES_FILE.exists():
        raise FileNotFoundError(str(SIM_FRAMES_FILE))
    with SIM_FRAMES_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


# ── Endpoints ─────────────────────────────────────────────────────────────────

LEARNING_KEYS = {
    "method", "reward_assumptions", "reward_table", "actions",
    "split", "comparison", "learning_curve", "references",
    "sensitivity", "learned_policy", "caveats",
}


@router.get("/learning")
async def get_learning():
    """Return the full learning.json document."""
    return _load_learning()


@router.get("/learning/policy")
async def get_learned_policy():
    """Return the learned Q-table policy (list of 30 rows)."""
    return _load_learned_policy()


@router.get("/simulation/frames")
async def get_simulation_frames(
    start: int = Query(0, ge=0, description="First frame index (0-based)"),
    count: int = Query(30, ge=1, le=_SIM_MAX_COUNT, description="Number of frames"),
):
    """
    Return a slice of the MESA simulation frames.
    - 422 if start < 0 or count < 1 (enforced by Query constraints above).
    - 404 if sim_frames.json is missing.
    """
    try:
        frames = _load_sim_frames()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="sim_frames.json not found.")

    slice_ = frames[start: start + count]
    return {
        "start": start,
        "count": len(slice_),
        "total": len(frames),
        "frames": slice_,
    }
