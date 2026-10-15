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
import rule_engine  # noqa: E402

# Pre-load thresholds from rules.json
_rules_path = ML_DIR / "rules.json"
if _rules_path.exists():
    rule_engine.load_thresholds(str(_rules_path))

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
    """Run the transparent rule engine assessment as primary, with lite ML model as benchmark."""
    rows = [r.model_dump() for r in body.history]

    # Primary: Rule Engine assessment
    rule_res = rule_engine.assess(rows)

    # Benchmark: Lite ML model
    ml_res = risk_lite.predict_custom(rows)

    warnings = list(dict.fromkeys(rule_res.get("warnings", []) + ml_res.get("warnings", [])))

    return {
        # Primary Rule Engine assessment
        "points": rule_res.get("points"),
        "max_points": rule_res.get("max_points", rule_engine.MAX_POINTS),
        "risk_score": rule_res.get("risk_score"),
        "risk_level": rule_res.get("risk_level"),
        "decision_if_final": rule_res.get("decision_if_final"),
        "n_cdm_used": rule_res.get("n_cdm_used", 0),
        "drivers": rule_res.get("drivers", []),
        "warnings": warnings,

        # Backward compatibility with existing frontend clients
        "top_drivers": rule_res.get("drivers", []),

        # Lite ML Benchmark Comparison
        "ml_score": ml_res.get("risk_score"),
        "ml_risk_level": ml_res.get("risk_level"),
        "ml_decision": ml_res.get("decision_if_final"),
        "ml_benchmark": {
            "risk_score": ml_res.get("risk_score"),
            "risk_level": ml_res.get("risk_level"),
            "decision_if_final": ml_res.get("decision_if_final"),
            "thresholds": {"review": 0.2003, "maneuver": 0.6575},
            "top_drivers": ml_res.get("top_drivers", []),
            "label": "LightGBM Benchmark (Comparison Only)",
        },
    }


@router.get("/info")
async def predict_info():
    """Return rule engine metadata and ML benchmark metadata."""
    ml_info = risk_lite.info()
    rule_thresholds = rule_engine.load_thresholds(str(_rules_path)) if _rules_path.exists() else dict(rule_engine.THRESHOLDS)
    return {
        "rule_engine": {
            "cutoff_days": rule_engine.CUTOFF_DAYS,
            "max_points": rule_engine.MAX_POINTS,
            "thresholds": rule_thresholds,
            "params": rule_engine.PARAMS,
        },
        "ml_benchmark": ml_info,
        "cutoff_days": rule_engine.CUTOFF_DAYS,
        "threshold": rule_thresholds.get("review", 3),
        "threshold_hi": rule_thresholds.get("maneuver", 6),
        "ranges": ml_info.get("ranges", {}),
    }


@router.get("/presets")
async def predict_presets():
    """Return the preset CDM histories from ml/presets.json."""
    presets_file = ML_DIR / "presets.json"
    with presets_file.open(encoding="utf-8") as fh:
        return json.load(fh)
