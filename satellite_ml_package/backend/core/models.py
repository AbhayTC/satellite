"""Pydantic v2 message envelope and payload models for the stream agents."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Primitive helpers ─────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ── Shared sub-models ─────────────────────────────────────────────────────────

class TopDriver(BaseModel):
    feature: str
    label: str
    value: float
    contribution: float


class Deltas(BaseModel):
    log10_pc: Optional[float] = None
    miss_distance_m: Optional[float] = None


# ── Payload models ────────────────────────────────────────────────────────────

class StateUpdatePayload(BaseModel):
    step: int
    n_steps: int
    time_to_tca_hours: float
    miss_distance_m: float
    relative_speed_ms: float
    log10_pc: float
    collision_probability: float
    pc_trend: Literal["rising", "stable", "falling"]
    deltas: Deltas


class RiskAlertPayload(BaseModel):
    risk_score: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    phase: Literal["EARLY_WATCH", "DECISION"]
    top_drivers: Optional[List[TopDriver]] = None


class ManeuverDecisionPayload(BaseModel):
    decision: Literal["NO_ACTION", "MONITOR", "MANEUVER"]
    phase: Literal["EARLY_WATCH", "DECISION"]
    rationale: str
    suggested_delta_v_ms: None = None


# ── Envelope ──────────────────────────────────────────────────────────────────

PayloadType = StateUpdatePayload | RiskAlertPayload | ManeuverDecisionPayload


class StreamMessage(BaseModel):
    schema_version: str = "1.0"
    message_id: str = Field(default_factory=_new_uuid)
    msg_type: Literal["STATE_UPDATE", "RISK_ALERT", "MANEUVER_DECISION", "PIPELINE_RESET"]
    event_id: str
    emitted_at: str = Field(default_factory=_now_iso)
    source_agent: Literal["ingestion", "tracking", "risk", "maneuver"]
    payload: Any  # concrete type enforced per agent before construction

    model_config = {"arbitrary_types_allowed": True}


# ── Raw CDM row (as ingested from CSV / JSON) ─────────────────────────────────

class CdmRow(BaseModel):
    event_id: str
    step: int
    n_steps: int
    time_to_tca_hours: float
    miss_distance_m: float
    relative_speed_ms: float
    log10_pc: float
    collision_probability: float
    risk_score: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    is_decision_point: bool
    phase: Literal["EARLY_WATCH", "DECISION"]
    decision: Literal["NO_ACTION", "MONITOR", "MANEUVER"]
    top_drivers: Optional[List[TopDriver]] = None

    @field_validator("event_id", mode="before")
    @classmethod
    def coerce_event_id(cls, v: Any) -> str:
        return str(v)

    @field_validator("top_drivers", mode="before")
    @classmethod
    def parse_top_drivers(cls, v: Any):
        """Accept list, JSON-encoded string, or empty/null."""
        if v is None:
            return None
        if isinstance(v, list):
            return v if v else None
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
            import json
            parsed = json.loads(v)
            return parsed if parsed else None
        return v
