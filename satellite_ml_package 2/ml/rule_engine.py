"""Transparent rule-based conjunction risk engine. No machine learning: a points system with fixed, explainable rules."""
import json, math, os
import numpy as np

# Rule 1: latest log10 Pc earns 1 point per 0.5 decade above -8 (max 8).
# Rule 2: if the highest log10 Pc seen so far is >= -6, add 2 points (a high peak is never forgotten).
# Rule 3: if log10 Pc is rising, add up to 2 points (1 point per 0.3 decades per day over the last 3 CDMs).
PARAMS = dict(level_floor=-8.0, level_step=0.5, level_max=8, peak_threshold=-6.0, peak_bonus=2, trend_unit=0.3, trend_max=2)
MAX_POINTS = PARAMS["level_max"] + PARAMS["peak_bonus"] + PARAMS["trend_max"]      # 12
THRESHOLDS = {"review": 5, "maneuver": 8}                                           # overwritten by rules.json
CUTOFF_DAYS = 2.0


def load_thresholds(path=None):
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "rules.json")
    if os.path.exists(path):
        THRESHOLDS.update(json.load(open(path))["thresholds"])
    return dict(THRESHOLDS)


def points_array(L, M, S, p=PARAMS):
    """Vectorised rules. L = latest log10 Pc, M = highest log10 Pc so far, S = trend (log10 Pc per day).
    Returns (total, level_points, peak_points, trend_points) as integer arrays."""
    L = np.nan_to_num(np.asarray(L, float), nan=-30.0)
    M = np.nan_to_num(np.asarray(M, float), nan=-30.0)
    S = np.nan_to_num(np.asarray(S, float), nan=0.0)
    lvl = np.clip(np.floor((L - p["level_floor"]) / p["level_step"]), 0, p["level_max"])
    peak = np.where(M >= p["peak_threshold"], p["peak_bonus"], 0)
    trend = np.clip(np.floor(S / p["trend_unit"]), 0, p["trend_max"])
    return (lvl + peak + trend).astype(int), lvl.astype(int), peak.astype(int), trend.astype(int)


def level_of(points, th=None):
    th = th or THRESHOLDS
    return "HIGH" if points >= th["maneuver"] else ("MEDIUM" if points >= th["review"] else "LOW")


def drivers(L, M, S, lvl, peak, trend):
    rows = [dict(feature="risk", label="Latest log10 Pc", value=round(float(L), 3), contribution=int(lvl)),
            dict(feature="risk_max", label="Highest log10 Pc so far (2 points if >= -6)", value=round(float(M), 3), contribution=int(peak)),
            dict(feature="risk_slope3", label="Risk trend, log10 Pc per day (last 3 CDMs)", value=round(float(S), 3), contribution=int(trend))]
    return sorted(rows, key=lambda r: -r["contribution"])


def history_features(t_days, risk):
    """t_days: days to closest approach (any order); risk: log10 Pc. Returns (L, M, S) for the latest CDM."""
    order = np.argsort(-np.asarray(t_days, float))
    t, v = np.asarray(t_days, float)[order], np.asarray(risk, float)[order]
    w = min(3, len(v))
    dt = t[-w] - t[-1]
    S = (v[-1] - v[-w]) / dt if (w >= 2 and dt > 0) else 0.0
    return float(v[-1]), float(np.nanmax(v)), float(S)


def assess(history):
    """history: list of dicts with time_to_tca (days) and risk (log10 Pc) or collision_probability.
    Only CDMs at least CUTOFF_DAYS before closest approach are used (the decision-point rule)."""
    rows = []
    for r in history:
        risk = r.get("risk")
        if risk is None and r.get("collision_probability"):
            risk = math.log10(max(float(r["collision_probability"]), 1e-30))
        if r.get("time_to_tca") is not None and risk is not None:
            rows.append((float(r["time_to_tca"]), float(risk)))
    use = [x for x in rows if x[0] >= CUTOFF_DAYS]
    if not use:
        return dict(points=None, max_points=MAX_POINTS, risk_score=None, risk_level="UNSCORED", n_cdm_used=0, drivers=[],
                    warnings=[f"No CDM at least {CUTOFF_DAYS:g} days before closest approach, so the rules cannot be applied."], decision_if_final=None)
    L, M, S = history_features([x[0] for x in use], [x[1] for x in use])
    tot, lvl, peak, trend = (int(a[0]) for a in points_array([L], [M], [S]))
    level = level_of(tot)
    warnings = []
    if len(use) < len(rows):
        warnings.append(f"{len(rows) - len(use)} CDM(s) under {CUTOFF_DAYS:g} days before closest approach were ignored.")
    return dict(points=tot, max_points=MAX_POINTS, risk_score=round(tot / MAX_POINTS, 4), risk_level=level, n_cdm_used=len(use),
                drivers=drivers(L, M, S, lvl, peak, trend), warnings=warnings,
                decision_if_final={"HIGH": "MANEUVER", "MEDIUM": "MONITOR"}.get(level, "NO_ACTION"))
