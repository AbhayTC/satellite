"""
pytest tests for the satellite CDM replay backend.

Tests:
  (a) Tracking deltas and pc_trend computation
  (b) MANEUVER never appears on an EARLY_WATCH row
  (c) /predict returns UNSCORED + warning when newest CDM is under 2 days out
  (d) /predict returns 422 for an out-of-range risk value
  (e) Parsing an empty top_drivers CSV cell as null
  (f) /simulation/frames slice bounds (422 / 404)
  (g) /learning contains expected keys
"""
from __future__ import annotations

import asyncio
import json
import sys
from collections import deque
from pathlib import Path
from typing import List
from unittest.mock import patch, MagicMock

import pytest

# ── Project root on sys.path ──────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

ML_DIR = ROOT / "ml"
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))


# =============================================================================
# (a) Tracking: deltas and pc_trend
# =============================================================================

from backend.core.models import CdmRow
from backend.agents.tracking import compute_trend_and_deltas


def _make_row(**kwargs) -> CdmRow:
    defaults = dict(
        event_id="test_evt",
        step=1,
        n_steps=5,
        time_to_tca_hours=100.0,
        miss_distance_m=5000.0,
        relative_speed_ms=7500.0,
        log10_pc=-8.0,
        collision_probability=1e-8,
        risk_score=0.1,
        risk_level="LOW",
        is_decision_point=False,
        phase="EARLY_WATCH",
        decision="NO_ACTION",
        top_drivers=None,
    )
    defaults.update(kwargs)
    return CdmRow(**defaults)


class TestTrackingDeltas:

    def _history(self, log10_pcs: List[float], miss_distances: List[float] | None = None) -> deque:
        """Build a history deque from lists of log10_pc values."""
        dq: deque = deque(maxlen=5)
        if miss_distances is None:
            miss_distances = [5000.0] * len(log10_pcs)
        for i, (pc, md) in enumerate(zip(log10_pcs, miss_distances)):
            dq.append(_make_row(step=i + 1, log10_pc=pc, miss_distance_m=md))
        return dq

    def test_rising_trend(self):
        """log10_pc going from -10 to -9.5 (delta = +0.5 >= 0.2) → rising."""
        h = self._history([-10.0, -9.7, -9.5])
        trend, deltas = compute_trend_and_deltas(h)
        assert trend == "rising"
        assert deltas.log10_pc is not None
        assert deltas.log10_pc > 0

    def test_falling_trend(self):
        """log10_pc going from -5 to -6 (delta = -1.0 <= -0.2) → falling."""
        h = self._history([-5.0, -5.5, -6.0])
        trend, deltas = compute_trend_and_deltas(h)
        assert trend == "falling"
        assert deltas.log10_pc is not None
        assert deltas.log10_pc < 0

    def test_stable_trend(self):
        """log10_pc changes by less than 0.2 → stable."""
        h = self._history([-8.0, -8.05, -8.1])
        trend, deltas = compute_trend_and_deltas(h)
        assert trend == "stable"

    def test_single_row_no_deltas(self):
        """Single row → no deltas computed (None), trend stable."""
        h = self._history([-8.0])
        trend, deltas = compute_trend_and_deltas(h)
        assert trend == "stable"
        assert deltas.log10_pc is None
        assert deltas.miss_distance_m is None

    def test_miss_distance_delta(self):
        """Delta miss_distance_m is correctly computed over the window."""
        h = self._history([-8.0, -8.0, -8.0], miss_distances=[3000.0, 4000.0, 5000.0])
        _, deltas = compute_trend_and_deltas(h)
        assert deltas.miss_distance_m == pytest.approx(2000.0, abs=0.1)

    def test_window_truncated_to_three(self):
        """Only the last 3 rows (not all 5) are used for the trend window."""
        # First two rows push log10_pc up; last 3 make it stable
        h = self._history([-5.0, -4.0, -8.0, -8.05, -8.1])
        trend, _ = compute_trend_and_deltas(h)
        assert trend == "stable"


# =============================================================================
# (b) MANEUVER never on EARLY_WATCH row
# =============================================================================

from backend.agents.maneuver import maneuver_agent
from backend.core.models import StreamMessage, StateUpdatePayload, Deltas, RiskAlertPayload


def _make_state_msg(row: CdmRow, trend: str = "stable") -> StreamMessage:
    payload = StateUpdatePayload(
        step=row.step,
        n_steps=row.n_steps,
        time_to_tca_hours=row.time_to_tca_hours,
        miss_distance_m=row.miss_distance_m,
        relative_speed_ms=row.relative_speed_ms,
        log10_pc=row.log10_pc,
        collision_probability=row.collision_probability,
        pc_trend=trend,
        deltas=Deltas(),
    )
    return StreamMessage(
        msg_type="STATE_UPDATE",
        event_id=row.event_id,
        source_agent="tracking",
        payload=payload.model_dump(),
    )


def _make_risk_msg(row: CdmRow) -> StreamMessage:
    payload = RiskAlertPayload(
        risk_score=row.risk_score,
        risk_level=row.risk_level,
        phase=row.phase,
        top_drivers=None,
    )
    return StreamMessage(
        msg_type="RISK_ALERT",
        event_id=row.event_id,
        source_agent="risk",
        payload=payload.model_dump(),
    )


class TestManeuverInvariant:

    @pytest.mark.asyncio
    async def test_maneuver_downgraded_on_early_watch(self):
        """
        If a CdmRow has decision=MANEUVER but phase=EARLY_WATCH,
        the maneuver agent must downgrade to MONITOR (or at minimum
        must NOT emit a MANEUVER_DECISION with decision=MANEUVER).
        """
        row = _make_row(
            phase="EARLY_WATCH",
            decision="MANEUVER",     # illegal combination
            is_decision_point=False,
        )
        state_msg = _make_state_msg(row)
        risk_msg  = _make_risk_msg(row)

        in_q  = asyncio.Queue()
        out_q = asyncio.Queue()
        stop  = asyncio.Event()

        await in_q.put((row, state_msg, risk_msg))
        await in_q.put(None)          # sentinel

        await maneuver_agent(in_q, out_q, stop_event=stop)

        result = await out_q.get()    # first item
        assert result is not None
        _, _, decision_msg = result
        assert decision_msg.payload["decision"] != "MANEUVER", (
            "MANEUVER must not be emitted on an EARLY_WATCH row"
        )

    @pytest.mark.asyncio
    async def test_maneuver_allowed_on_decision_row(self):
        """MANEUVER on a DECISION row must be passed through unchanged."""
        row = _make_row(
            phase="DECISION",
            decision="MANEUVER",
            is_decision_point=True,
        )
        state_msg = _make_state_msg(row)
        risk_msg  = _make_risk_msg(row)

        in_q  = asyncio.Queue()
        out_q = asyncio.Queue()
        stop  = asyncio.Event()

        await in_q.put((row, state_msg, risk_msg))
        await in_q.put(None)

        await maneuver_agent(in_q, out_q, stop_event=stop)

        result = await out_q.get()
        _, _, decision_msg = result
        assert decision_msg.payload["decision"] == "MANEUVER"


# =============================================================================
# (c & d) /predict endpoint tests
# =============================================================================

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


VALID_ROW = {
    "time_to_tca": 5.0,
    "risk": -5.5,
    "miss_distance": 10000.0,
    "relative_speed": 8000.0,
    "mahalanobis_distance": 100.0,
}


class TestPredictEndpoint:

    def test_valid_request_returns_200(self):
        resp = client.post("/predict", json={"history": [VALID_ROW]})
        assert resp.status_code == 200
        body = resp.json()
        assert "risk_level" in body
        assert "risk_score" in body

    def test_out_of_range_risk_returns_422(self):
        """risk must be in [-30, 0]; 1.0 is out of range → 422."""
        bad_row = {**VALID_ROW, "risk": 1.0}
        resp = client.post("/predict", json={"history": [bad_row]})
        assert resp.status_code == 422

    def test_risk_too_low_returns_422(self):
        """risk = -31 is below -30 → 422."""
        bad_row = {**VALID_ROW, "risk": -31.0}
        resp = client.post("/predict", json={"history": [bad_row]})
        assert resp.status_code == 422

    def test_unscored_when_all_cdms_under_cutoff(self):
        """
        When the newest (and only) CDM is very close to TCA (e.g., 0.5 days),
        the model cannot score → UNSCORED with a warning.
        The cutoff is read from the model bundle; it is ~2 days.
        """
        close_row = {**VALID_ROW, "time_to_tca": 0.5}
        resp = client.post("/predict", json={"history": [close_row]})
        assert resp.status_code == 200
        body = resp.json()
        assert body["risk_level"] == "UNSCORED"
        assert len(body["warnings"]) > 0
        assert any("days" in w.lower() or "closest approach" in w.lower()
                   for w in body["warnings"])

    def test_empty_history_returns_422(self):
        resp = client.post("/predict", json={"history": []})
        assert resp.status_code == 422

    def test_too_many_rows_returns_422(self):
        resp = client.post("/predict", json={"history": [VALID_ROW] * 11})
        assert resp.status_code == 422

    def test_missing_risk_fields_returns_422(self):
        """Neither risk nor collision_probability provided → 422."""
        no_risk = {
            "time_to_tca": 5.0,
            "miss_distance": 10000.0,
            "relative_speed": 8000.0,
        }
        resp = client.post("/predict", json={"history": [no_risk]})
        assert resp.status_code == 422


# =============================================================================
# (e) Empty top_drivers CSV cell parsed as null
# =============================================================================

class TestTopDriversParsing:

    def test_empty_string_is_null(self):
        row = _make_row()
        row_dict = row.model_dump()
        row_dict["top_drivers"] = ""
        parsed = CdmRow(**row_dict)
        assert parsed.top_drivers is None

    def test_whitespace_string_is_null(self):
        row_dict = _make_row().model_dump()
        row_dict["top_drivers"] = "   "
        parsed = CdmRow(**row_dict)
        assert parsed.top_drivers is None

    def test_none_is_null(self):
        row_dict = _make_row().model_dump()
        row_dict["top_drivers"] = None
        parsed = CdmRow(**row_dict)
        assert parsed.top_drivers is None

    def test_empty_list_is_null(self):
        row_dict = _make_row().model_dump()
        row_dict["top_drivers"] = []
        parsed = CdmRow(**row_dict)
        assert parsed.top_drivers is None

    def test_json_encoded_list_parsed(self):
        drivers_json = json.dumps([
            {"feature": "risk", "label": "Latest log10 Pc", "value": -5.5, "contribution": 0.8}
        ])
        row_dict = _make_row().model_dump()
        row_dict["top_drivers"] = drivers_json
        parsed = CdmRow(**row_dict)
        assert parsed.top_drivers is not None
        assert len(parsed.top_drivers) == 1
        assert parsed.top_drivers[0].feature == "risk"

    def test_json_empty_list_is_null(self):
        row_dict = _make_row().model_dump()
        row_dict["top_drivers"] = "[]"
        parsed = CdmRow(**row_dict)
        assert parsed.top_drivers is None


# =============================================================================
# (f) /simulation/frames slice bounds and missing file
# =============================================================================

class TestSimulationFrames:

    def test_default_slice(self):
        resp = client.get("/simulation/frames")
        assert resp.status_code == 200
        body = resp.json()
        assert "frames" in body
        assert body["count"] <= 30

    def test_custom_slice(self):
        resp = client.get("/simulation/frames?start=0&count=5")
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] <= 5

    def test_count_zero_returns_422(self):
        resp = client.get("/simulation/frames?count=0")
        assert resp.status_code == 422

    def test_count_over_max_returns_422(self):
        resp = client.get("/simulation/frames?count=91")
        assert resp.status_code == 422

    def test_negative_start_returns_422(self):
        resp = client.get("/simulation/frames?start=-1")
        assert resp.status_code == 422

    def test_missing_file_returns_404(self):
        """Mock _load_sim_frames to raise FileNotFoundError → 404."""
        from backend.api.learning import _load_sim_frames
        with patch("backend.api.learning._load_sim_frames",
                   side_effect=FileNotFoundError("not found")):
            resp = client.get("/simulation/frames")
        assert resp.status_code == 404

    def test_start_beyond_end_returns_empty(self):
        """start far beyond the data → frames list is empty (not an error)."""
        resp = client.get("/simulation/frames?start=999999&count=10")
        assert resp.status_code == 200
        body = resp.json()
        assert body["frames"] == []
        assert body["count"] == 0


# =============================================================================
# (g) /learning contains expected keys
# =============================================================================

EXPECTED_LEARNING_KEYS = {
    "method", "reward_assumptions", "reward_table", "actions",
    "split", "comparison", "learning_curve", "references",
    "sensitivity", "learned_policy", "caveats",
}


class TestLearningEndpoint:

    def test_learning_returns_200(self):
        resp = client.get("/learning")
        assert resp.status_code == 200

    def test_learning_contains_all_keys(self):
        resp = client.get("/learning")
        body = resp.json()
        missing = EXPECTED_LEARNING_KEYS - set(body.keys())
        assert not missing, f"Missing keys in /learning: {missing}"

    def test_learning_policy_returns_list(self):
        resp = client.get("/learning/policy")
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert len(body) > 0

    def test_learning_policy_row_schema(self):
        resp = client.get("/learning/policy")
        body = resp.json()
        row = body[0]
        # Each row should have score_band, trend, best_action, q_values, visits
        for key in ("score_band", "trend", "best_action", "q_values", "visits"):
            assert key in row, f"Missing key '{key}' in policy row"
