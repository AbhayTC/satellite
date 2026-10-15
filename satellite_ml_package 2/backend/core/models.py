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
    label: Optional[str] = None
    value: Optional[float] = None
    contribution: float


class ManeuverBurn(BaseModel):
    step: int
    hours_before_tca: float
    move_m: float
    fuel_proxy: float


class ManeuverPlan(BaseModel):
    d0_m: float
    d_safe_m: float
    steps: int
    step_hours: float
    feasible: bool
    burn_needed: Optional[bool] = None
    burns: List[ManeuverBurn] = Field(default_factory=list)
    total_cost: Optional[float] = None
    fuel_proxy: Optional[float] = None
    final_separation_m: Optional[float] = None
    note: Optional[str] = None


class AlertRoute(BaseModel):
    reachable: bool
    path: List[str] = Field(default_factory=list)
    hops: Optional[int] = None
    latency_ms: Optional[float] = None
    baseline_wait_s: Optional[float] = None
    direct_visible: Optional[bool] = None


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
    rule_points: Optional[int] = None
    ml_score: Optional[float] = None


class ManeuverDecisionPayload(BaseModel):
    decision: Literal["NO_ACTION", "MONITOR", "MANEUVER"]
    phase: Literal["EARLY_WATCH", "DECISION"]
    rationale: str
    suggested_delta_v_ms: Optional[float] = None
    rule_points: Optional[int] = None
    maneuver_plan: Optional[ManeuverPlan] = None
    alert_route: Optional[AlertRoute] = None


# ── Envelope ──────────────────────────────────────────────────────────────────

PayloadType = StateUpdatePayload | RiskAlertPayload | ManeuverDecisionPayload


class StreamMessage(BaseModel):
    schema_version: str = "1.0"
    message_id: str = Field(default_factory=_new_uuid)
    msg_type: Literal["STATE_UPDATE", "RISK_ALERT", "MANEUVER_DECISION"]
    event_id: str
    emitted_at: str = Field(default_factory=_now_iso)
    source_agent: Literal["ingestion", "tracking", "risk", "maneuver"]
    payload: Any  # concrete type enforced per agent before construction

    model_config = {"arbitrary_types_allowed": True}


# ── Raw CDM row (as ingested from CSV / JSON) ─────────────────────────────────

def _safe_json_decode(v: Any):
    if v is None:
        return None
    if isinstance(v, (dict, list)):
        return v if v else None
    if isinstance(v, float):
        import math
        if math.isnan(v):
            return None
    if isinstance(v, str):
        v = v.strip()
        if not v or v.lower() == "nan":
            return None
        import json
        try:
            parsed = json.loads(v)
            return parsed if parsed else None
        except Exception:
            return None
    return v


class CdmRow(BaseModel):
    event_id: str
    step: int
    n_steps: int
    time_to_tca_hours: float
    miss_distance_m: float
    relative_speed_ms: float
    log10_pc: float
    collision_probability: float
    rule_points: Optional[int] = None
    risk_score: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    is_decision_point: bool
    phase: Literal["EARLY_WATCH", "DECISION"]
    decision: Literal["NO_ACTION", "MONITOR", "MANEUVER"]
    top_drivers: Optional[List[TopDriver]] = None
    maneuver_plan: Optional[ManeuverPlan] = None
    alert_route: Optional[AlertRoute] = None
    ml_score: Optional[float] = None

    @field_validator("event_id", mode="before")
    @classmethod
    def coerce_event_id(cls, v: Any) -> str:
        return str(v)

    @field_validator("top_drivers", mode="before")
    @classmethod
    def parse_top_drivers(cls, v: Any):
        return _safe_json_decode(v)

    @field_validator("maneuver_plan", mode="before")
    @classmethod
    def parse_maneuver_plan(cls, v: Any):
        return _safe_json_decode(v)

    @field_validator("alert_route", mode="before")
    @classmethod
    def parse_alert_route(cls, v: Any):
        return _safe_json_decode(v)

