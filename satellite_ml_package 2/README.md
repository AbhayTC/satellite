# Satellite CDM Replay Backend

Multi-agent FastAPI backend for replaying ESA Collision Avoidance Challenge
CDM data, computing live risk assessments, and exposing learning-agent
simulation results.

---

## Assumptions

| Item | Decision |
|---|---|
| `time_to_tca_hours` | Already in hours, not converted |
| Steps | CDM update indices, not wall-clock time |
| `top_drivers` | Empty CSV cell becomes null; parsed from JSON string otherwise |
| `suggested_delta_v_ms` | Always null (no state vectors in data) |
| MANEUVER on EARLY_WATCH | Downgraded to MONITOR with a warning log |
| MESA | Not installed; results loaded from JSON files at startup |
| GIF MIME type | Served as image/gif by FastAPI StaticFiles |

---

## Project Layout

```
satellite_ml_package/
├── backend/
│   ├── __init__.py
│   ├── main.py                   # FastAPI app
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── ingestion.py          # Agent 1: load and replay CDMs
│   │   ├── tracking.py           # Agent 2: deltas, pc_trend
│   │   ├── risk.py               # Agent 3: pass-through risk fields
│   │   ├── maneuver.py           # Agent 4: decision + rationale
│   │   └── orchestrator.py       # asyncio queue wiring + EventStore
│   ├── api/
│   │   ├── __init__.py
│   │   ├── calculator.py         # POST /predict, GET /predict/*
│   │   └── learning.py           # GET /learning, /learning/policy, /simulation/frames
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # Paths, env vars
│   │   ├── models.py             # Pydantic v2 CdmRow + all message models
│   │   └── logger.py             # Async JSONL log writer
│   └── tests/
│       ├── conftest.py
│       └── test_backend.py
├── data/
│   ├── replay_demo_v3.json       # ~19 curated events
│   ├── replay_all_v3.csv         # 2,167 events
│   ├── metrics.json
│   ├── policy.json
│   ├── learning.json
│   ├── learned_policy.json
│   ├── sim_frames.json
│   └── figs/                     # PNG + GIF figures
├── ml/
│   ├── risk_lite.py
│   ├── risk_model_lite.joblib
│   └── presets.json
├── logs/                         # Created at runtime
│   └── stream.jsonl
├── requirements.txt
├── pytest.ini
└── README.md
```

---

## Installation

```bash
# From the project root (satellite_ml_package/)
pip install -r requirements.txt
```

Python 3.11+ recommended. LightGBM 4.3+ is required by risk_lite.py.

---

## Run Commands

### Start the development server

```bash
# From satellite_ml_package/
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Configure replay source and speed

```bash
# Use the full 2,167-event CSV at 5x speed
REPLAY_SOURCE=all REPLAY_SPEED=5.0 uvicorn backend.main:app --reload
```

| Env var | Default | Values |
|---|---|---|
| `REPLAY_SOURCE` | `demo` | `demo` or `all` |
| `REPLAY_SPEED` | `1.0` | rows per second (float) |

### Start replay via API

```bash
# Default (demo, 1 row/s)
curl -X POST http://localhost:8000/replay/start

# Custom source and speed
curl -X POST "http://localhost:8000/replay/start?source=all&speed=10"

# Stop / Reset
curl -X POST http://localhost:8000/replay/stop
curl -X POST http://localhost:8000/replay/reset
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| WS | `/stream` | All stream messages as JSON |
| GET | `/events` | Latest STATE_UPDATE, RISK_ALERT, MANEUVER_DECISION per event |
| GET | `/events/{event_id}/history` | Full message history for one event |
| POST | `/replay/start` | Start replay (?source=&speed=) |
| POST | `/replay/stop` | Stop replay |
| POST | `/replay/reset` | Reset and restart |
| GET | `/health` | Health check |
| GET | `/metrics` | data/metrics.json |
| GET | `/policy` | data/policy.json |
| GET | `/figs/{filename}` | Static figures (PNG, GIF) |
| POST | `/predict` | Live risk calculator |
| GET | `/predict/info` | Model metadata |
| GET | `/predict/presets` | Preset CDM histories |
| GET | `/learning` | Learning agent results |
| GET | `/learning/policy` | Learned Q-table policy |
| GET | `/simulation/frames` | MESA sim frames (?start=0&count=30) |

### POST /predict

Request body:

```json
{
  "history": [
    {
      "time_to_tca": 5.0,
      "risk": -5.5,
      "miss_distance": 10000.0,
      "relative_speed": 8000.0,
      "mahalanobis_distance": 100.0
    }
  ]
}
```

Returns risk_lite.predict_custom() dict unchanged:

```json
{
  "risk_score": 0.8721,
  "risk_level": "HIGH",
  "n_cdm_used": 1,
  "top_drivers": [{"feature": "risk", "value": -5.5, "contribution": 0.8}],
  "warnings": [],
  "decision_if_final": "MANEUVER"
}
```

Validation rules (returns 422 on violation):
- `risk` in [-30, 0] (log10 Pc)
- `collision_probability` in (0, 1) exclusive of 0 and 1
- `miss_distance` >= 0
- `relative_speed` >= 0
- `mahalanobis_distance` >= 0
- 1 to 10 rows in `history`
- At least one of `risk` or `collision_probability` must be provided

---

## Run Tests

```bash
# From satellite_ml_package/
pytest -v
```

### Test coverage

| ID | Description |
|---|---|
| (a) | Tracking deltas and pc_trend (rising/falling/stable, window, single-row) |
| (b) | MANEUVER is never emitted on an EARLY_WATCH row |
| (c) | /predict returns UNSCORED + warning when all CDMs are under the cutoff |
| (d) | /predict returns 422 for an out-of-range risk value |
| (e) | Empty / whitespace / [] / "[]" CSV cell parsed as null |
| (f) | /simulation/frames slice bounds: 422 on bad params, 404 on missing file |
| (g) | /learning response contains all expected top-level keys |

---

## Stream Message Schema

Every WebSocket / JSONL message follows this envelope:

```json
{
  "schema_version": "1.0",
  "message_id": "<uuid>",
  "msg_type": "STATE_UPDATE | RISK_ALERT | MANEUVER_DECISION",
  "event_id": "<string>",
  "emitted_at": "<ISO-8601>",
  "source_agent": "ingestion | tracking | risk | maneuver",
  "payload": {}
}
```

STATE_UPDATE payload fields: step, n_steps, time_to_tca_hours, miss_distance_m,
relative_speed_ms, log10_pc, collision_probability, pc_trend, deltas.

RISK_ALERT payload fields: risk_score, risk_level, phase, top_drivers.

MANEUVER_DECISION payload fields: decision, phase, rationale, suggested_delta_v_ms.

---

## Decision Semantics

| Phase | Decision | Meaning |
|---|---|---|
| DECISION | MANEUVER | Score >= maneuver threshold |
| DECISION | MONITOR | Score in operator-review band |
| DECISION | NO_ACTION | Score below review threshold |
| EARLY_WATCH | MONITOR | Tentative watch, may clear later |
| EARLY_WATCH | NO_ACTION | No concern yet |

MANEUVER is only valid on DECISION rows. The maneuver agent logs a warning
and downgrades to MONITOR if the data violates this invariant.
