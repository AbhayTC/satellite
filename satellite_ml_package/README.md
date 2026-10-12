# 🛰️ Autonomous Satellite Collision Risk Prediction & Mission Control Platform

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black.svg)](https://threejs.org/)
[![LightGBM](https://img.shields.io/badge/Model-LightGBM-brightgreen.svg)](https://lightgbm.readthedocs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An end-to-end aerospace machine learning and multi-agent mission control system designed to predict orbital conjunction risks, filter out false alarms, and recommend collision avoidance maneuvers using **European Space Agency (ESA) Conjunction Data Messages (CDMs)**.

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Machine Learning & Decision Engine](#-machine-learning--decision-engine)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [One-Command Quickstart](#one-command-quickstart)
  - [Manual Setup](#manual-setup)
- [API Reference](#-api-reference)
- [Operational Decisions & Thresholds](#-operational-decisions--thresholds)
- [Screenshots & Visuals](#-screenshots--visuals)
- [License](#-license)

---

## 🔭 Project Overview

Over 130 million pieces of space debris travel at orbital velocities (~7.5 km/s or 27,000 km/h) in Low Earth Orbit (LEO). Satellite operators receive thousands of alert messages called **Conjunction Data Messages (CDMs)** from radar stations. 

However, **over 97% of raw conjunction alerts are false alarms** caused by initial sensor noise and orbital drift. Unnecessary avoidance maneuvers exhaust finite satellite fuel, shortening mission lifetimes and costing millions of dollars. Conversely, failing to maneuver can trigger a catastrophic hypervelocity collision.

This platform provides:
1. **Machine Learning Risk Prediction**: A LightGBM classification engine trained on over 11,900 ESA conjunction events to accurately predict final encounter risk days before the event.
2. **Multi-Agent Asynchronous Pipeline**: 4 decoupled async agents simulating live ingestion, tracking orbital deltas, risk assessment, and autonomous maneuver decisions.
3. **Interactive 3D Mission Control Dashboard**: A space-grade HUD built with React and Three.js featuring a 3D orbital radar, live streaming telemetry grid, model benchmarks, and a live risk calculator.

---

## ✨ Key Features

- **🌐 3D Orbital Constellation Radar**: Interactive WebGL globe rendering active satellites and risk color-coded conjunction vectors.
- **⚡ Real-Time WebSocket Streaming**: Bi-directional event stream with variable replay speeds (`0.5x` to `10.0x`), pause, and reset controls.
- **🤖 Autonomous Decision Agent**: Translates risk scores and trends into plain-English operational rationales (`NO_ACTION`, `MONITOR`, `MANEUVER`).
- **🧮 Interactive Risk Calculator**: Allows flight dynamics engineers to input custom CDM histories or load realistic incident presets and receive live model inferences with SHAP feature driver breakdowns.
- **📊 Benchmark Evaluation**: Comparative ROC AUC and PR AUC curves across Baseline Rules, Logistic Regression, Random Forest, and LightGBM models.
- **🧠 Reinforcement Learning & Simulation**: Q-Learning policy explorer and multi-satellite MESA simulation visualizer.

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

## 🧠 Machine Learning & Decision Engine

### Evaluated Models on Test Set (11,942 Events, 323 High-Risk Positives)

| Model | ROC AUC | PR AUC | Precision | Recall | F1 Score | Accuracy |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Lite LightGBM (5 Inputs)** | **0.9821** | **0.8066** | **58.2%** | **90.1%** | **0.7072** | **97.98%** |
| **Full LightGBM** | 0.9792 | 0.8126 | 59.8% | 90.1% | 0.7185 | 98.09% |
| **Random Forest** | 0.9812 | 0.7961 | 59.9% | 90.1% | 0.7194 | 98.10% |
| **Baseline (Last Risk Value)** | 0.9748 | 0.4442 | 52.5% | 90.1% | 0.6636 | 97.53% |
| **Logistic Regression** | 0.9480 | 0.3266 | 19.1% | 90.1% | 0.3156 | 89.43% |

### Feature Engineering
The model transforms time-series CDM radar updates into predictive physical indicators:
- **Baseline Physical Features**: `time_to_tca`, `risk` ($\log_{10} P_c$), `miss_distance`, `relative_speed`, `mahalanobis_distance`.
- **Temporal Derivatives & History**: Rate of risk change (`risk_slope3`, `risk_slope5`), `span_days`, `n_cdm`, historical maximums and averages.
- **Explainability**: Outputs the top 3 SHAP feature contributions explaining *why* the score escalated.

---

## 📁 Repository Structure

```
.
├── dev-fullstack.sh               # One-click dev script: boots FastAPI & Vite together
├── PROJECT_EXPLANATION.txt        # Comprehensive beginner's reference and design bible
│
├── backend/                       # Python FastAPI Backend
│   ├── main.py                    # App entry point, CORS, WebSockets, Lifespan
│   ├── agents/
│   │   ├── ingestion.py           # Agent 1: Replay clock & data reader
│   │   ├── tracking.py            # Agent 2: Step tracking, deltas, and trends
│   │   ├── risk.py                # Agent 3: Alert payload construction
│   │   ├── maneuver.py            # Agent 4: Decision logic & rationale generator
│   │   └── orchestrator.py        # Asyncio queue manager & EventStore cache
│   ├── api/
│   │   ├── calculator.py          # POST /predict, presets, and model info
│   │   └── learning.py            # Q-learning policy & MESA frame endpoints
│   ├── core/
│   │   ├── config.py              # Configuration & file path resolution
│   │   ├── models.py              # Pydantic v2 schemas for all network messages
│   │   └── logger.py              # Asynchronous JSONL event stream logger
│   └── tests/
│       └── test_backend.py        # Pytest backend validation suite
│
├── ml/                            # Machine Learning Artifacts
│   ├── risk_lite.py               # Feature derivation & LightGBM inference engine
│   ├── risk_model_lite.joblib     # Pre-trained model weights & threshold calibration
│   └── presets.json               # Scenario presets for live risk calculation
│
├── data/                          # Datasets & Simulation Caches
│   ├── replay_demo_v3.json        # 19 curated showcase conjunction events
│   ├── replay_all_v3.csv          # 2,167 full-scale event replay dataset
│   ├── metrics.json               # Evaluation metrics across all ML baselines
│   ├── policy.json                # Calibrated decision boundary thresholds
│   ├── learned_policy.json        # Reinforcement Learning state-action Q-table
│   └── sim_frames.json            # Step-by-step MESA constellation simulation frames
│
├── src/                           # React 18 TypeScript Frontend
│   ├── App.tsx                    # Main HUD layout, sidebar, pipeline transport controls
│   ├── api.ts                     # WebSocket client & typed REST API service
│   ├── types.ts                   # TypeScript interfaces for all telemetry schemas
│   └── components/
│       ├── ConstellationView.tsx  # Three.js 3D WebGL orbital radar
│       ├── ConjunctionTable.tsx   # Live updating telemetry and event grid
│       ├── ModelPerformance.tsx  # Benchmark metrics, ROC curves, confusion matrices
│       ├── RiskCalculator.tsx     # Custom CDM scenario evaluator & preset loader
│       └── LearningAgent.tsx      # Q-learning table inspector & MESA frame player
│
├── package.json                   # Frontend dependencies (React, Vite, Three.js)
├── requirements.txt               # Backend dependencies (FastAPI, LightGBM, Pandas)
└── vite.config.ts                 # Vite development build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Python**: Version `3.11` or higher
- **Node.js**: Version `18.0` or higher (`npm` included)

### One-Command Quickstart
Run the included all-in-one launcher script:
```bash
chmod +x dev-fullstack.sh
./dev-fullstack.sh
```
This automatically starts:
- 🚀 **FastAPI Backend**: `http://localhost:8000`
- 💻 **React Frontend**: `http://localhost:5173`
- 📑 **Swagger API Docs**: `http://localhost:8000/docs`

---

### Manual Setup

#### 1. Backend Setup
```bash
# Navigate to backend folder
pip install -r requirements.txt

# Launch FastAPI development server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `WS` | `/stream` | Real-time WebSocket event stream for active conjunctions |
| `GET` | `/health` | Health check endpoint and replay status monitor |
| `GET` | `/events` | Snapshot of latest states for all tracked conjunctions |
| `POST` | `/replay/start?speed=2.0` | Starts or resumes conjunction telemetry replay |
| `POST` | `/replay/stop` | Pauses playback |
| `POST` | `/replay/reset` | Resets the event cache and restarts replay from step 0 |
| `POST` | `/predict` | Evaluates a custom sequence of CDMs using the LightGBM model |
| `GET` | `/predict/presets` | Retrieves pre-configured realistic conjunction scenarios |
| `GET` | `/metrics` | Returns ROC AUC, PR AUC, and confusion matrices for all models |
| `GET` | `/learning` | Returns Q-learning training convergence metrics |
| `GET` | `/simulation/frames` | Retrieves frames for the multi-satellite MESA simulation |

---

## ⚖️ Operational Decisions & Thresholds

| Risk Level | Score Range | Operational Action | Recommended Operator Protocol |
| :--- | :---: | :---: | :--- |
| **LOW** | `score < 0.2003` | **`NO_ACTION`** | Standard mission operations. No burn required. |
| **MEDIUM** | `0.2003 ≤ score < 0.6575` | **`MONITOR`** | Heightened alertness. Request priority radar tracking. |
| **HIGH** | `score ≥ 0.6575` | **`MANEUVER`** | Commit avoidance thruster burn to modify orbit. |

---

## 📄 License
This project is open-source and distributed under the [MIT License](LICENSE).
