"""
Live Calculator API  (/predict, /predict/info, /predict/presets)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field, model_validator

from backend.core.config import ML_DIR

# ── Ensure ml/ is importable ──────────────────────────────────────────────────
_ml_path = str(ML_DIR)
if _ml_path not in sys.path:
    sys.path.insert(0, _ml_path)

import risk_lite  # noqa: E402  (ml/ added to path above)

router = APIRouter(prefix="/predict", tags=["calculator"])


# ── Pydantic v2 request schema ────────────────────────────────────────────────

class CdmInputRow(BaseModel):
    """One CDM row for the live risk calculator."""

    time_to_tca: float = Field(
        ..., description="Days before closest approach (> 0)"
    )
    risk: Optional[float] = Field(
        None,
        ge=-30,
        le=0,
        description="log10(Pc), range [-30, 0]",
    )
    collision_probability: Optional[float] = Field(
        None,
        gt=0,
        lt=1,
        description="Collision probability, exclusive of 0 and 1",
    )
    miss_distance: float = Field(..., ge=0, description="Miss distance in metres")
    relative_speed: float = Field(..., ge=0, description="Relative speed in m/s")
    mahalanobis_distance: Optional[float] = Field(
        None, ge=0, description="Mahalanobis distance (optional)"
    )

    @model_validator(mode="after")
    def at_least_one_risk_field(self) -> "CdmInputRow":
        if self.risk is None and self.collision_probability is None:
            raise ValueError(
                "Provide at least one of 'risk' (log10 Pc) or 'collision_probability'."
            )
        return self


class PredictRequest(BaseModel):
    history: List[CdmInputRow] = Field(
        ..., min_length=1, max_length=10, description="1–10 CDM rows"
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("")
async def predict(body: PredictRequest):
    """Run the lite risk model on a custom CDM history."""
    rows = [r.model_dump() for r in body.history]
    return risk_lite.predict_custom(rows)


@router.get("/info")
async def predict_info():
    """Return model metadata (cutoff, thresholds, feature ranges)."""
    return risk_lite.info()


@router.get("/presets")
async def predict_presets():
    """Return the preset CDM histories from ml/presets.json."""
    presets_file = ML_DIR / "presets.json"
    with presets_file.open(encoding="utf-8") as fh:
        return json.load(fh)
