"""
Ingestion Agent
───────────────
Loads the replay file (source from config), cleans nulls, replays rows sorted
by time_to_tca_hours descending so multiple events are active simultaneously.
Publishes validated CdmRow objects to an asyncio.Queue.
"""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import List

import pandas as pd
from pydantic import ValidationError

from backend.core.config import (
    REPLAY_ALL_FILE,
    REPLAY_DEMO_FILE,
    REPLAY_SOURCE,
    REPLAY_SPEED,
)
from backend.core.models import CdmRow

logger = logging.getLogger(__name__)

# Fields required to be non-null for a row to pass ingestion
_REQUIRED = [
    "event_id", "step", "n_steps", "time_to_tca_hours",
    "miss_distance_m", "relative_speed_ms", "log10_pc",
    "collision_probability", "risk_score", "risk_level",
    "is_decision_point", "phase", "decision",
]


def _load_demo(path: Path) -> pd.DataFrame:
    with path.open(encoding="utf-8") as fh:
        rows = json.load(fh)
    df = pd.DataFrame(rows)
    return df


def _load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"event_id": str})
    return df


def load_replay(source: str | None = None) -> tuple[pd.DataFrame, int, int]:
    """
    Load and clean replay data.

    Returns:
        (clean_df, total_rows, reject_count)
    """
    src = (source or REPLAY_SOURCE).lower()
    if src == "demo":
        raw = _load_demo(REPLAY_DEMO_FILE)
        logger.info("Loaded demo replay: %d rows", len(raw))
    else:
        raw = _load_csv(REPLAY_ALL_FILE)
        logger.info("Loaded full replay: %d rows", len(raw))

    total = len(raw)

    # Ensure event_id is string
    raw["event_id"] = raw["event_id"].astype(str)

    # Drop rows where any required column is null
    clean = raw.dropna(subset=_REQUIRED).copy()
    reject_count = total - len(clean)
    if reject_count:
        logger.warning("Ingestion: dropped %d null rows (of %d)", reject_count, total)

    # Sort by time_to_tca_hours descending so the most-distant-in-time CDMs
    # are emitted first, allowing several events to be active simultaneously.
    # Within a group, order by event_id then step.
    clean.sort_values(
        ["time_to_tca_hours", "event_id", "step"],
        ascending=[False, True, True],
        inplace=True,
    )
    clean.reset_index(drop=True, inplace=True)
    return clean, total, reject_count


def _parse_row(row: dict) -> CdmRow | None:
    """Validate a raw dict as CdmRow; return None and log on failure."""
    try:
        return CdmRow(**row)
    except ValidationError as exc:
        logger.warning("Ingestion reject (validation): %s | row=%s", exc, row)
        return None


async def ingestion_agent(
    queue: asyncio.Queue,
    source: str | None = None,
    speed: float | None = None,
    *,
    stop_event: asyncio.Event,
) -> None:
    """
    Replay CDM rows into *queue*.

    speed multiplier: 1.0 = 1 row per second (wall clock).
    Stops cleanly when stop_event is set.
    """
    df, total, rejects = load_replay(source)
    tick = 1.0 / (speed or REPLAY_SPEED)

    logger.info(
        "Ingestion starting: %d clean rows (of %d, %d rejected), tick=%.2fs",
        len(df), total, rejects, tick,
    )

    for _, raw in df.iterrows():
        if stop_event.is_set():
            break
        row = _parse_row(raw.to_dict())
        if row is not None:
            await queue.put(row)
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=tick)
        except asyncio.TimeoutError:
            pass

    # Sentinel
    await queue.put(None)
    logger.info("Ingestion complete.")
