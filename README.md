# 🛰️ Autonomous Satellite Collision Risk Prediction & Mission Control Platform

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black.svg)](https://threejs.org/)
[![LightGBM](https://img.shields.io/badge/Model-LightGBM-brightgreen.svg)](https://lightgbm.readthedocs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An end-to-end aerospace machine learning and multi-agent mission control platform designed to predict orbital conjunction risks, eliminate costly false alarms, and autonomously recommend collision avoidance maneuvers using **European Space Agency (ESA) Conjunction Data Messages (CDMs)**.

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Machine Learning & Decision Engine](#-machine-learning--decision-engine)
- [Model Benchmark Comparison](#-model-benchmark-comparison)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Option A: One-Command Quickstart](#option-a-one-command-quickstart)
  - [Option B: Manual Setup (Backend & Frontend)](#option-b-manual-setup-backend--frontend)
- [API & WebSocket Reference](#-api--websocket-reference)
- [Operational Decisions & Threshold Policy](#-operational-decisions--threshold-policy)
- [Comprehensive Beginner's Guide](#-comprehensive-beginners-guide)
- [License & Acknowledgments](#-license--acknowledgments)

---

## 🔭 Project Overview

Over 130 million pieces of space debris travel at orbital speeds (~7.5 km/s or 27,000 km/h) in Low Earth Orbit (LEO). At these hypervelocities, even a millimeter-sized fragment carries enough kinetic energy to destroy an active operational satellite.

Satellite operators receive thousands of alert messages called **Conjunction Data Messages (CDMs)** from radar tracking stations. However, operators face a critical dilemma:
- **Firing thrusters (maneuvering)** consumes irreplaceable propellant, cutting years off a satellite's operational life and costing millions of dollars.
- **Ignoring an alert** risks a catastrophic hypervelocity collision, triggering cascading space debris ("Kessler Syndrome").
- **Over 97% of raw conjunction alerts are false alarms** caused by initial radar sensor uncertainty that naturally drifts away before closest approach.

### The Solution
This platform bridges orbital mechanics and machine learning:
1. **Machine Learning Risk Prediction**: A gradient-boosted decision tree model (LightGBM) trained on 11,942 ESA conjunction events that predicts days before closest approach whether an encounter will actually become dangerous.
2. **Multi-Agent Streaming Pipeline**: 4 decoupled asynchronous Python agents simulating real-time telemetry ingestion, tracking trends, assessing risk, and generating autonomous plain-English maneuver decisions.
3. **Interactive 3D Mission Control Dashboard**: A space-grade HUD built with React, TypeScript, and Three.js featuring a 3D orbital constellation radar, live streaming telemetry grid, ML benchmark curves, and an interactive risk calculator.

---

## ✨ Key Features

- **🌐 3D Orbital Constellation Radar**: Interactive WebGL globe rendering Earth, active satellite orbits, and dynamic risk color-coded conjunction vectors (`Three.js` / `@react-three/fiber`).
- **⚡ Real-Time WebSocket Streaming**: Bi-directional asynchronous event stream with variable replay speeds (`0.5x` to `10.0x`), pause, and reset controls.
- **🤖 Autonomous Decision Agent**: Translates risk scores and historical trends into operational actions (`NO_ACTION`, `MONITOR`, `MANEUVER`) accompanied by natural-language rationales.
- **🧮 Interactive Live Risk Calculator**: Allows flight dynamics engineers to enter custom CDM sequences or test curated incident presets ("False Alarm Escalation", "Sudden High Risk Encounter") with live TreeSHAP feature driver breakdowns.
- **📊 Benchmark Evaluation**: Full comparative ROC AUC and Precision-Recall evaluation across Baseline Rules, Logistic Regression, Random Forest, and LightGBM models.
- **🧠 Reinforcement Learning & Simulation**: Tabular Q-Learning policy explorer and multi-satellite MESA collision avoidance simulation player.

---

## 🏗️ System Architecture

```
                       ┌─────────────────────────────────────────┐
                       │          Raw ESA CDM Datasets           │
                       │    (replay_demo_v3.json / all.csv)      │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │        Agent 1: Ingestion Agent       │
                        │   (Regulates clock & synthetic ticks) │
                        └───────────────────┬───────────────────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │        Agent 2: Tracking Agent        │
                        │    (Calculates deltas & Pc trends)    │
                        └───────────────────┬───────────────────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │          Agent 3: Risk Agent          │
                        │    (Feature engineering & ML score)   │
                        └───────────────────┬───────────────────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │        Agent 4: Maneuver Agent        │
                        │  (Threshold policy & natural rationale)│
                        └───────────────────┬───────────────────┘
                                            │
                   ┌────────────────────────┴────────────────────────┐
                   │                                                 │
                   ▼                                                 ▼
        ┌───────────────────────┐                        ┌───────────────────────┐
        │   WebSocket /stream   │                        │   FastAPI REST APIs   │
        │  (Live Push to Client)│                        │ (/predict, /metrics)  │
        └──────────┬────────────┘                        └───────────┬───────────┘
                   │                                                 │
                   └────────────────────────┬────────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │          React Mission Control          │
                       │  (Three.js 3D Radar + Telemetry Table)  │
                       └─────────────────────────────────────────┘
```

---

## 📁 Repository Structure

The project is structured into two complementary packages:

```
satellite/
├── satellite_ml_package 2/              # 🐍 PYTHON BACKEND & MACHINE LEARNING ENGINE
│   ├── backend/
│   │   ├── main.py                     # FastAPI application, CORS & WebSocket routing
│   │   ├── agents/
│   │   │   ├── ingestion.py            # Agent 1: Ingestion & replay clock
│   │   │   ├── tracking.py             # Agent 2: Step tracking, deltas & trend calculation
│   │   │   ├── risk.py                 # Agent 3: ML score evaluation & SHAP drivers
│   │   │   ├── maneuver.py             # Agent 4: Decision policy & human rationales
│   │   │   └── orchestrator.py         # Asyncio queue manager, EventStore & WebSocket push
│   │   ├── api/
│   │   │   ├── calculator.py           # REST endpoints for live LightGBM inference (/predict)
│   │   │   └── learning.py             # REST endpoints for Q-learning policy & simulation
│   │   ├── core/
│   │   │   ├── config.py               # Paths, replay speeds & environment settings
│   │   │   ├── models.py               # Pydantic v2 schemas for all network messages
│   │   │   └── logger.py               # Asynchronous stream logger (logs/stream.jsonl)
│   │   └── tests/
│   │       ├── conftest.py             # Pytest test fixtures
│   │       └── test_backend.py         # Comprehensive API & agent test suite
│   ├── ml/
│   │   ├── risk_lite.py                # Feature engineering & LightGBM inference engine
│   │   ├── risk_model_lite.joblib      # Serialized trained LightGBM model weights
│   │   └── presets.json                # Realistic incident scenario presets
│   ├── data/
│   │   ├── replay_demo_v3.json         # 19 curated showcase events for instant replay
│   │   ├── replay_all_v3.csv           # Full 2,167 conjunction events replay dataset
│   │   ├── metrics.json                # Benchmark metrics for all models (11,942 test events)
│   │   ├── policy.json                 # Calibrated operational thresholds
│   │   ├── learning.json               # Q-Learning training metrics and rewards
│   │   ├── learned_policy.json         # Trained 10x3 Q-table state-action policy
│   │   ├── sim_frames.json             # Animated multi-satellite MESA simulation frames
│   │   └── figs/                       # Benchmark curves and simulation GIFs
│   ├── logs/                           # Runtime JSONL stream logs
│   ├── requirements.txt                # Python package dependencies
│   ├── pytest.ini                      # Pytest runner configuration
│   └── README.md                       # Backend-specific documentation
│
├── satellite_ml_package/                # ⚛️ REACT + TYPESCRIPT FRONTEND (MISSION CONTROL)
│   ├── src/
│   │   ├── App.tsx                     # Main dashboard layout, sidebar navigation & controls
│   │   ├── api.ts                      # WebSocket client & REST API communication layer
│   │   ├── types.ts                    # TypeScript data models and network schemas
│   │   ├── main.tsx                    # React DOM mount point
│   │   ├── index.css                   # Custom dark HUD design system & styling tokens
│   │   └── components/
│   │       ├── ConstellationView.tsx   # Three.js 3D WebGL orbital radar
│   │       ├── ConjunctionTable.tsx    # Live WebSocket-driven telemetry grid
│   │       ├── ModelPerformance.tsx    # Benchmark comparisons & ROC/PR curves
│   │       ├── RiskCalculator.tsx      # Live interactive CDM risk evaluator & presets
│   │       └── LearningAgent.tsx       # Q-learning policy visualizer & simulation player
│   ├── dev-fullstack.sh                # One-command script to launch backend & frontend
│   ├── package.json                    # Node dependencies (React 18, Three.js, Recharts)
│   ├── vite.config.ts                  # Vite build & proxy configuration
│   ├── index.html                      # HTML5 template with Google Fonts
│   └── README.md                       # Frontend-specific documentation
│
└── README.md                           # 📖 Master repository documentation (this file)
```

---

## 🧠 Machine Learning & Decision Engine

### Physical Features
- `time_to_tca_hours`: Countdown in hours until closest orbital encounter.
- `miss_distance_m`: Estimated clearance distance between satellite and debris.
- `collision_probability`: Decimal probability calculated from sensor error clouds.
- `log10_pc`: Base-10 logarithm of collision probability (`-5.0` = 1 in 100,000; `-3.0` = 1 in 1,000).
- `relative_speed_ms`: Closing encounter velocity (7,000 to 14,000 m/s).
- `mahalanobis_distance`: Statistical distance normalized by radar uncertainty covariance.

### Temporal Feature Engineering
Because single radar snapshots are noisy, our pipeline computes historical trends across time steps:
- **Rate of change (slopes)**: `risk_slope`, `miss_distance_slope` over the last 3 and 5 updates.
- **Aggregations**: `risk_max`, `risk_mean`, `miss_distance_min`.
- **Span**: `n_cdm` update count and `span_days` elapsed observation window.

---

## 📊 Model Benchmark Comparison

Evaluated on **11,942 unseen ESA test conjunction events** (323 true positive high-risk encounters):

| Model | ROC AUC | PR AUC | Precision @ Target Recall | Description |
|---|:---:|:---:|:---:|---|
| **Baseline Rule ("Last Pc")** | 0.812 | 0.444 | ~12.5% | Simple threshold on raw radar probability |
| **Logistic Regression** | 0.947 | 0.327 | ~9.1% | Linear baseline model |
| **Random Forest** | 0.981 | 0.796 | ~64.2% | Ensemble of 100 bagged decision trees |
| **Full LightGBM** | **0.979** | **0.813** | **~67.8%** | Gradient boosted decision trees on full feature set |
| **Lite LightGBM (Production)** | **0.982** | **0.807** | **~66.5%** | Distilled 5-feature model for real-time web inference |

---

## 🚦 Operational Decisions & Threshold Policy

Rather than an arbitrary 0.5 probability cutoff, decision thresholds are calibrated based on operational risk tolerance (`data/policy.json`):

| Risk Score Range | Risk Level | Operational Action | Operational Meaning & Impact |
|:---:|:---:|:---:|---|
| `< 0.2003` | **LOW** | `NO_ACTION` | Safe encounter. Normal satellite payload operations continue. No fuel spent. |
| `0.2003 – 0.6575` | **MEDIUM** | `MONITOR` | Elevated uncertainty. Flight dynamics teams enter heightened readiness. Hold thrusters. |
| `>= 0.6575` | **HIGH** | `MANEUVER` | Imminent danger in decision window. Compute burn vectors and execute collision avoidance maneuver. |

*Safety Override*: Any high-risk alert occurring during `EARLY_WATCH` (> 48h to TCA) is automatically downgraded to `MONITOR` with an advisory log to prevent wasting fuel on early radar drift.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**

---

### Option A: One-Command Quickstart

The fastest way to launch the full platform:

```bash
# Navigate to satellite_ml_package and execute the fullstack launcher
cd "satellite_ml_package"
chmod +x dev-fullstack.sh
./dev-fullstack.sh
```

This starts:
- 🐍 FastAPI Backend at: `http://localhost:8000`
- ⚛️ React Mission Control at: `http://localhost:5173`

---

### Option B: Manual Setup (Backend & Frontend)

#### Step 1: Start the Backend (`satellite_ml_package 2`)
```bash
cd "satellite_ml_package 2"

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### Step 2: Start the Frontend (`satellite_ml_package`)
Open a new terminal window:
```bash
cd "satellite_ml_package"

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

#### Step 3: Access Mission Control
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🔌 API & WebSocket Reference

### WebSocket Streaming
- **URL**: `ws://localhost:8000/stream`
- **Envelope Format**:
  ```json
  {
    "schema_version": "1.0",
    "message_id": "msg-0042",
    "msg_type": "STATE_UPDATE | RISK_ALERT | MANEUVER_DECISION",
    "event_id": 1042,
    "emitted_at": "2026-10-12T20:30:00Z",
    "source_agent": "ingestion | tracking | risk | maneuver",
    "payload": { ... }
  }
  ```

### Key REST Endpoints
| Endpoint | Method | Description |
|---|:---:|---|
| `/health` | `GET` | System status and healthcheck |
| `/predict` | `POST` | Live LightGBM inference for custom CDM sequences |
| `/predict/presets` | `GET` | Returns realistic incident presets |
| `/predict/info` | `GET` | Returns model features, thresholds, and metadata |
| `/metrics` | `GET` | Returns comparative benchmark evaluations for all models |
| `/policy` | `GET` | Returns calibrated operational decision thresholds |
| `/learning` | `GET` | Returns Q-Learning training metrics and reward curves |
| `/learning/policy` | `GET` | Returns the 10x3 Q-Table state-action policy matrix |
| `/simulation/frames` | `GET` | Returns multi-satellite MESA collision simulation frames |

---

## 📚 Comprehensive Beginner's Guide

For an in-depth reference explaining every mathematical concept, feature calculation, agent workflow, and user journey in clear, beginner-friendly terms, refer to:
👉 **[`PROJECT_EXPLANATION.txt`](file:///Users/abhaychirayil/Desktop/satellite/PROJECT_EXPLANATION.txt)**

---

## 📄 License & Acknowledgments

- **Dataset**: European Space Agency (ESA) Space Debris Office – Collision Avoidance Challenge.
- **License**: Released under the [MIT License](https://opensource.org/licenses/MIT).
