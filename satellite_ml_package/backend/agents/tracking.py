"""
Tracking Agent
──────────────
Consumes CdmRow objects from the ingestion queue.
Keeps the last 5 rows per event, computes deltas and pc_trend,
emits STATE_UPDATE messages to the downstream queue.
"""
from __future__ import annotations

import asyncio
import logging
from collections import deque, defaultdict
from typing import Deque, Dict

from pydantic import ValidationError

from backend.core.models import (
    CdmRow,
    Deltas,
    StateUpdatePayload,
    StreamMessage,
)

logger = logging.getLogger(__name__)

_HISTORY_LEN = 5
_TREND_WINDOW = 3
_TREND_RISE_THRESHOLD = 0.2
_TREND_FALL_THRESHOLD = 0.2


def compute_trend_and_deltas(
    history: Deque[CdmRow],
) -> tuple[str, Deltas]:
    """
    Compute pc_trend and deltas from the last _TREND_WINDOW rows.

    pc_trend:
      "rising"  if log10_pc rose by >= 0.2 (more negative → less negative,
                 i.e., risk went *up*)
      "falling" if log10_pc fell by >= 0.2 (risk went *down*)
      "stable"  otherwise

    Note: log10_pc is negative (e.g. -5 is worse than -8).
    A "rise" in collision probability = log10_pc increases (less negative).
    """
    items = list(history)
    n = min(_TREND_WINDOW, len(items))
    window = items[-n:]  # oldest … newest

    deltas = Deltas()

    if len(window) >= 2:
        oldest = window[0]
        newest = window[-1]
        deltas = Deltas(
            log10_pc=round(newest.log10_pc - oldest.log10_pc, 6),
            miss_distance_m=round(newest.miss_distance_m - oldest.miss_distance_m, 2),
        )

    trend = "stable"
    if deltas.log10_pc is not None:
        if deltas.log10_pc >= _TREND_RISE_THRESHOLD:
            trend = "rising"
        elif deltas.log10_pc <= -_TREND_FALL_THRESHOLD:
            trend = "falling"

    return trend, deltas


async def tracking_agent(
    in_queue: asyncio.Queue,
    out_queue: asyncio.Queue,
    *,
    stop_event: asyncio.Event,
) -> None:
    """Read CdmRows, maintain per-event history, emit STATE_UPDATE messages."""
    histories: Dict[str, Deque[CdmRow]] = defaultdict(
        lambda: deque(maxlen=_HISTORY_LEN)
    )

    while not stop_event.is_set():
        try:
            item = await asyncio.wait_for(in_queue.get(), timeout=0.5)
        except asyncio.TimeoutError:
            continue

        if item is None:  # sentinel from ingestion
            await out_queue.put(None)
            logger.info("Tracking: received sentinel, forwarding.")
            break

        row: CdmRow = item
        histories[row.event_id].append(row)
        trend, deltas = compute_trend_and_deltas(histories[row.event_id])

        payload = StateUpdatePayload(
            step=row.step,
            n_steps=row.n_steps,
            time_to_tca_hours=row.time_to_tca_hours,
            miss_distance_m=row.miss_distance_m,
            relative_speed_ms=row.relative_speed_ms,
            log10_pc=row.log10_pc,
            collision_probability=row.collision_probability,
            pc_trend=trend,
            deltas=deltas,
        )
        try:
            msg = StreamMessage(
                msg_type="STATE_UPDATE",
                event_id=row.event_id,
                source_agent="tracking",
                payload=payload.model_dump(),
            )
        except ValidationError as exc:
            logger.warning("Tracking: invalid STATE_UPDATE: %s", exc)
            continue

        await out_queue.put((row, msg))

    logger.info("Tracking agent stopped.")
