import os
import numpy as np
import pandas as pd
import joblib

_B = joblib.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "risk_model.joblib"))
_MODEL, _COLS, _OBJ = _B["model"], _B["columns"], _B["obj_map"]
_THR, _CUTOFF = _B["threshold"], _B["cutoff"]
_THR_HI = _B.get("threshold_hi", _THR)
_DROP = ["event_id", "mission_id", "max_risk_scaling"]
_TREND = ["risk", "max_risk_estimate", "miss_distance", "mahalanobis_distance"]


def predict_risk(history):
    """history: list of dicts, one per CDM received so far for ONE event,
    using the raw dataset column names (time_to_tca in DAYS).
    Returns {"risk_score", "risk_level", "n_cdm_used"}."""
    h = pd.DataFrame(history)
    if h.empty or "time_to_tca" not in h.columns:
        return {"risk_score": None, "risk_level": "UNSCORED", "n_cdm_used": 0}

    # The model was trained to predict from CDMs at least _CUTOFF days before TCA
    h = h[h["time_to_tca"] >= _CUTOFF].sort_values("time_to_tca", ascending=False)
    if h.empty:
        return {"risk_score": None, "risk_level": "UNSCORED", "n_cdm_used": 0}

    h = h.copy()
    if "c_object_type" in h.columns:
        h["c_object_type"] = h["c_object_type"].map(_OBJ)

    feats = h.iloc[-1].drop(labels=[c for c in _DROP if c in h.columns]).to_dict()
    t = h["time_to_tca"].to_numpy(float)
    feats["n_cdm"] = len(h)
    feats["span_days"] = t[0] - t[-1]
    for col in _TREND:
        v = pd.to_numeric(h[col], errors="coerce").to_numpy(float)
        feats[f"{col}_max"] = np.nanmax(v) if np.isfinite(v).any() else np.nan
        feats[f"{col}_mean"] = np.nanmean(v) if np.isfinite(v).any() else np.nan
        for k in (3, 5):
            w = min(k, len(v))
            dt = t[-w] - t[-1]
            feats[f"{col}_slope{k}"] = (v[-1] - v[-w]) / dt if (w >= 2 and dt > 0) else 0.0

    row = pd.DataFrame([feats]).reindex(columns=_COLS).apply(pd.to_numeric, errors="coerce")
    score = float(_MODEL.predict_proba(row)[0, 1])
    level = "HIGH" if score >= _THR_HI else ("MEDIUM" if score >= _THR else "LOW")
    return {"risk_score": round(score, 4), "risk_level": level, "n_cdm_used": int(len(h))}
