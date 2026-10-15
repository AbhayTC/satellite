# Satellite Collision-Risk Pipeline and Mission Control

A multi-agent pipeline that reads ESA Conjunction Data Messages (CDMs), scores collision risk with a **transparent rule-based engine**, plans a schematic avoidance maneuver and an alert route with **Dijkstra's algorithm**, and shows everything in a live dashboard. A LightGBM model is kept **only as a benchmark** to compare against the rules.

Dataset: ESA Collision Avoidance Challenge (Kaggle: `shadmanrohan/collisionavoidancechallenge`).

> **Project status.** The notebook has produced the rule engine, planner, `rules.json` and the v4 replay files. Wiring the new fields (`rule_points`, `maneuver_plan`, `alert_route`, `ml_score`) into the FastAPI backend and React frontend is in progress. Files marked **(new)** below are the notebook outputs that the backend and frontend must pick up.

---

## 1. The problem

Operators receive many CDMs, and most early alarms fade before closest approach. Maneuvering costs fuel; ignoring a real threat risks a collision. In the training data only **323 of 11,942 scorable events (2.7%)** end up high-risk, so a model that always says "safe" is 97.3% accurate. **Accuracy is therefore not used as the headline metric.** We report recall, precision, PR-AUC and balanced accuracy.

**Label.** An event is high-risk if its final CDM has log10 Pc ≥ -6. Only CDMs at least 2 days before closest approach are used as inputs (the decision-point rule).

---

## 2. Approach

### 2.1 Rule-based risk engine (main approach)
A points system, no machine learning (`rule_engine.py`, **new**):

| Rule | Points |
|---|---|
| Latest log10 Pc | 1 point per 0.5 decade above -8 (max 8) |
| Highest log10 Pc so far ≥ -6 | +2 |
| Rising trend over the last 3 CDMs | 1 point per 0.3 decades/day (max 2) |

Total is 0 to 12. **Only the two tier thresholds are calibrated** (`rules.json`): **review at ≥ 3 points, maneuver at ≥ 6 points.** Every decision shows the points each rule contributed.

### 2.2 Dijkstra, used twice (`planner.py`, **new**)
1. **Maneuver planning.** Minimum-cost burn schedule on a time-expanded graph. It is *schematic*: a 1-D offset along the CDM miss vector, not orbital mechanics. Assumed parameters: keep-out distance 2,000 m, 6-hour steps, 250 m grid, at most 1,000 m change per step, fuel proxy in arbitrary units.
2. **Alert routing.** Minimum-latency route from a satellite to a ground station through an *illustrative* network: 12 satellites on one ring at 500 km, 3 ground stations, neighbour and cross-links.

Both were checked: our Dijkstra matches SciPy on 50 random graphs, and the planner matches a plain dynamic-programming solution on 28 cases.

### 2.3 ML benchmark (comparison only)
LightGBM on 118 features, with Random Forest, Logistic Regression and a "latest risk only" rule as other baselines.

### 2.4 Extension: learning agent (MESA)
A contextual bandit (epsilon-greedy over a reward table) in a MESA simulation. **Rewards are assumed, not measured.** It learns from 7,187 events (126 high-risk) and is tested on held-out missions: 4,755 events (197 high-risk). The data has 19 missions in total. It is *not* Q-learning, and it is not part of the main decision path.

---

## 3. Results (what was measured)

All numbers below come from **5-fold cross-validation grouped by mission** on the 11,942 scorable training events. They are **not** results on unseen test data. The 2,167 test events have no labels, so no test accuracy exists.

### 3.1 Benchmark (threshold set to 90% recall)

| Model | ROC-AUC | PR-AUC | Precision at 90% recall | Balanced accuracy |
|---|---|---|---|---|
| Rule: latest risk only | 0.975 | 0.444 | 0.525 | 0.939 |
| Logistic regression | 0.948 | 0.327 | 0.191 | 0.898 |
| Random forest (300 trees) | 0.981 | 0.796 | 0.599 | 0.942 |
| LightGBM (118 features) | 0.979 | 0.813 | 0.598 | 0.942 |

LightGBM confusion matrix at this threshold: 11,423 TN, 196 FP, 32 FN, 291 TP. A smaller 5-input LightGBM model used by the calculator reaches ROC-AUC 0.982 and PR-AUC 0.807.

### 3.2 Rule engine vs ML at the same recall (cross-validated)

Rule thresholds are chosen on training folds and applied to held-out missions.

| Recall reached | Points ≥ | Rule precision | Latest-risk-only | LightGBM | Missed |
|---|---|---|---|---|---|
| 0.929 | 6 | 0.514 | 0.527 | 0.481 | 23 |
| 0.944 | 3 | 0.306 | 0.421 | 0.420 | 18 |
| 0.978 | 2 | 0.094 | 0.118 | 0.092 | 7 |

Honest reading: the rule engine edges out LightGBM at 0.929 recall, ties at 0.978, is clearly worse at 0.944, and is slightly below "latest risk only" in every row. Its advantages are transparency and simplicity, not a better score. Because points are integers, there is no threshold between recall 0.929 (≥ 6) and 0.582 (≥ 7), so the maneuver tier lands at about 93% recall.

### 3.3 Final tiers (calibrated on all 11,942 events, so in-sample)

| Tier | Points | Recall | Precision | Flagged | Missed |
|---|---|---|---|---|---|
| Review (MONITOR) | ≥ 3 | 0.960 | 0.251 | 1,237 | 13 |
| Maneuver | ≥ 6 | 0.929 | 0.514 | 584 | 23 |

The review tier cuts false negatives, but at a real precision cost. In cross-validation it reaches recall 0.944 (18 missed) while flagging 996 events. Of the 13 events it misses in-sample, 5 have a latest risk at the floor (≤ -12), so nothing is visible before the cutoff.

### 3.4 Decisions on the 2,167 unlabelled test events

| Decision | Rule engine | ML benchmark |
|---|---|---|
| MANEUVER | 183 | 72 |
| MONITOR | 111 | 68 |
| NO_ACTION | 1,873 | 2,027 |

Both flag 139 events. The rule engine flags more (294 vs 140). Without labels we cannot say which is right.

### 3.5 Planner and routing (on the 584 maneuver-tier training events)
- Burn needed: 235. Already above the keep-out distance: 349. Infeasible: 0.
- Where no burn is needed, the high Pc comes from position uncertainty, so the plan says **refine tracking first**.
- Fuel proxy: median 1.16, max 1.89 (arbitrary units). Median 2 burns per plan.
- Routing over one orbit for one satellite: reachable 96/96 times, latency median 31.2 ms, max 70.8 ms; waiting for a direct ground pass takes up to 24.8 min.

---

## 4. Decision policy

| Rule-engine level | Points | Action |
|---|---|---|
| LOW | < 3 | `NO_ACTION` |
| MEDIUM | 3 to 5 | `MONITOR` |
| HIGH | ≥ 6 | `MANEUVER`, with a plan: **burn** or **refine tracking first** |

**Phase rule.** Before the decision point, a MEDIUM or HIGH score can only raise a watch (`MONITOR`). Only the decision point (the last CDM at least 2 days before closest approach) can issue `MANEUVER`.

The ML score is carried alongside as `ml_score` for comparison only. The ML thresholds 0.1174 (review) and 0.6335 (maneuver) apply to the benchmark. The calculator's lite model uses different thresholds (0.2003 and 0.6575).

---

## 5. Architecture

```
Replay files (v4)  ->  Ingestion  ->  Tracking  ->  Risk (rule points + ml_score)  ->  Maneuver / alert agent
                                                                                              |
                                          FastAPI: WebSocket /stream + REST  ->  React Mission Control
```

Four asynchronous agents: ingestion (replay clock), tracking (deltas and trends), risk (rule points, drivers, benchmark score), maneuver (decision, plan, alert route). The live calculator scores custom inputs with the 5-input LightGBM model.

---

## 6. Repository structure

```
satellite/
├── satellite_ml_package 2/            # Backend and ML
│   ├── backend/                       # FastAPI, agents, API routes, tests
│   ├── ml/
│   │   ├── rule_engine.py             # (new) points system
│   │   ├── planner.py                 # (new) Dijkstra maneuver planner and alert router
│   │   ├── rules.json                 # (new) thresholds, CV table, sweep
│   │   ├── risk_model.py / .joblib    # LightGBM benchmark
│   │   ├── risk_lite.py / .joblib     # 5-input calculator model
│   │   └── presets.json
│   └── data/
│       ├── replay_demo_v4.json        # (new) 19 demo events
│       ├── replay_all_v4.csv          # (new) 2,167 events with rule_points, maneuver_plan, alert_route, ml_score
│       ├── metrics.json, policy.json, learning.json, learned_policy.json, sim_frames.json
│       └── figs/                      # figures 1 to 14
├── satellite_ml_package/              # React + TypeScript frontend
└── README.md
```

Figures 12 (data overview), 13 (maneuver plan) and 14 (alert routing) are new.

---

## 7. Run it

Prerequisites: Python 3.11+, Node.js 18+.

```
# Windows: double-click start-windows.bat, or run .\start-windows.ps1

# Manual
cd "satellite_ml_package 2"
python3 -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

cd "satellite_ml_package"
npm install && npm run dev                            # http://localhost:5173
```

### API
- WebSocket: `ws://localhost:8000/stream`
- REST: `/health`, `/predict`, `/predict/presets`, `/predict/info`, `/metrics`, `/policy`, `/learning` (contextual-bandit metrics), `/learning/policy`, `/simulation/frames`

---

## 8. Limitations

- All accuracy figures are cross-validated on training events; test labels do not exist.
- Tier thresholds are fitted on all training events, so tier recall and precision in 3.3 are in-sample (only two numbers are fitted).
- The maneuver planner is a schematic cost model with an assumed 2,000 m keep-out distance and an arbitrary fuel unit, not orbital mechanics.
- The alert network is illustrative. In the replay, the source satellite and time of each route are assigned from the event id, not taken from data.
- The MESA agent uses assumed rewards.
- The rule engine does not beat "latest risk only" at equal recall (section 3.2).

---

## 9. Acknowledgments

Dataset: European Space Agency Space Debris Office, Collision Avoidance Challenge. Licence: MIT.
