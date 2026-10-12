import os
import numpy as np
import pandas as pd
import joblib

_DIR = os.path.dirname(os.path.abspath(__file__))
_B = None
BASE = ["risk", "miss_distance", "relative_speed", "mahalanobis_distance"]
TREND = ["risk", "miss_distance", "mahalanobis_distance"]


def _bundle():
    global _B
    if _B is None:
        _B = joblib.load(os.path.join(_DIR, "risk_model_lite.joblib"))
    return _B


def lite_feats(h):
    """h: DataFrame with time_to_tca (days), risk, miss_distance, relative_speed, mahalanobis_distance."""
    h = h.sort_values("time_to_tca", ascending=False)
    t = h["time_to_tca"].to_numpy(float)
    out = {"time_to_tca": t[-1], "n_cdm": float(len(h)), "span_days": t[0] - t[-1]}
    for c in BASE:
        v = pd.to_numeric(h[c], errors="coerce").to_numpy(float)
        out[c] = v[-1]
        if c in TREND:
            ok = np.isfinite(v)
            out[f"{c}_max"] = v[ok].max() if ok.any() else np.nan
            out[f"{c}_mean"] = v[ok].mean() if ok.any() else np.nan
            for k in (3, 5):
                w = min(k, len(v)); dt = t[-w] - t[-1]
                out[f"{c}_slope{k}"] = (v[-1] - v[-w]) / dt if (w >= 2 and dt > 0) else 0.0
    return out


def info():
    b = _bundle()
    return {"cutoff_days": b["cutoff"], "threshold": b["threshold"], "threshold_hi": b.get("threshold_hi", b["threshold"]), "ranges": b["ranges"]}


def _unscored(msg):
    return {"risk_score": None, "risk_level": "UNSCORED", "n_cdm_used": 0, "top_drivers": [],
            "warnings": [msg], "decision_if_final": None}


def predict_custom(rows):
    """rows: list of dicts with time_to_tca (days), miss_distance (m), relative_speed (m/s),
    and risk (log10 Pc) or collision_probability; mahalanobis_distance optional."""
    b = _bundle()
    h = pd.DataFrame(rows)
    for c in BASE + ["time_to_tca"]:
        if c not in h.columns:
            h[c] = np.nan
    if "collision_probability" in h.columns:
        pc = pd.to_numeric(h["collision_probability"], errors="coerce")
        h["risk"] = pd.to_numeric(h["risk"], errors="coerce").fillna(np.log10(pc.clip(lower=1e-30)))
    h["time_to_tca"] = pd.to_numeric(h["time_to_tca"], errors="coerce")
    h = h.dropna(subset=["time_to_tca"])
    use = h[h["time_to_tca"] >= b["cutoff"]]
    if use.empty:
        return _unscored(f"No CDM at least {b['cutoff']:g} days before closest approach, so the model cannot score this event.")
    if pd.to_numeric(use["risk"], errors="coerce").isna().all():
        return _unscored("Provide risk (log10 Pc) or collision_probability.")

    warnings = []
    if len(use) < len(h):
        warnings.append(f"{len(h) - len(use)} CDM(s) under {b['cutoff']:g} days before closest approach were ignored.")
    row = pd.DataFrame([lite_feats(use)]).reindex(columns=b["columns"]).astype(float)
    if not np.isfinite(row["mahalanobis_distance"].iloc[0]):
        warnings.append("mahalanobis_distance not given, so the score is less reliable.")
    for c, (lo, hi) in b["ranges"].items():
        v = row[c].iloc[0]
        if np.isfinite(v) and (v < lo or v > hi):
            warnings.append(f"{c}={v:.4g} is outside the typical training range ({lo:.4g} to {hi:.4g}); treat the score with caution.")

    score = float(b["model"].predict_proba(row)[0, 1])
    lo = b["threshold"]; hi = b.get("threshold_hi", lo)
    level = "HIGH" if score >= hi else ("MEDIUM" if score >= lo else "LOW")
    contrib = b["model"].booster_.predict(row, pred_contrib=True)[0][:-1]
    cols = list(row.columns)
    drivers = []
    for i in np.argsort(-np.abs(contrib))[:3]:
        v = row.iloc[0, i]
        drivers.append({"feature": cols[i], "value": float(v) if np.isfinite(v) else None,
                        "contribution": round(float(contrib[i]), 3)})
    decision = {"HIGH": "MANEUVER", "MEDIUM": "MONITOR"}.get(level, "NO_ACTION")
    return {"risk_score": round(score, 4), "risk_level": level, "n_cdm_used": int(len(use)),
            "top_drivers": drivers, "warnings": warnings, "decision_if_final": decision}
