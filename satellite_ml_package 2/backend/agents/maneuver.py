"""
Maneuver Agent
──────────────
Uses the file's decision field.  Decision logic:
  DECISION + MANEUVER  → score above maneuver threshold
  DECISION + MONITOR   → operator-review band
  DECISION + NO_ACTION → below review threshold
  EARLY_WATCH + MONITOR → tentative watch that may clear later
  EARLY_WATCH + NO_ACTION → no action yet

MANEUVER only ever appears on DECISION rows (invariant enforced by the data;
we log a warning if it isn't).

Builds a plain-English rationale from:
  risk_level, phase, pc_trend, time_to_tca_hours, top_driver labels.

Emits MANEUVER_DECISION messages.
"""
from __future__ import annotations

import asyncio
import logging
from typing import List, Optional

from pydantic import ValidationError

from backend.core.models import (
    CdmRow,
    ManeuverDecisionPayload,
    StreamMessage,
    TopDriver,
)

logger = logging.getLogger(__name__)


def _build_rationale(
    row: CdmRow,
    pc_trend: str,
    top_drivers: Optional[List[TopDriver]],
) -> str:
    hours = row.time_to_tca_hours
    h_str = f"{hours:.1f} h" if hours >= 1 else f"{hours * 60:.0f} min"

    phase_desc = {
        "EARLY_WATCH": "early-watch phase",
        "DECISION":    "decision phase",
    }.get(row.phase, row.phase)

    decision_desc = {
        "MANEUVER":  "a maneuver is recommended",
        "MONITOR":   "continued monitoring is recommended",
        "NO_ACTION": "no action is required at this time",
    }.get(row.decision, row.decision)

    trend_desc = {
        "rising":  "collision probability is trending upward",
        "falling": "collision probability is trending downward",
        "stable":  "collision probability is stable",
    }.get(pc_trend, "trend unknown")

    parts = [
        f"Event {row.event_id}: In the {phase_desc} with {h_str} to closest approach,",
        f"risk level is {row.risk_level} and {trend_desc}.",
        f"Assessment: {decision_desc}.",
    ]

    if top_drivers:
        driver_labels = [d.label for d in top_drivers[:3]]
        parts.append(
            "Key drivers: " + "; ".join(driver_labels) + "."
        )

    return " ".join(parts)


async def maneuver_agent(
    in_queue: asyncio.Queue,
    out_queue: asyncio.Queue,
    *,
    stop_event: asyncio.Event,
) -> None:
    """
    Consume (CdmRow, STATE_UPDATE, RISK_ALERT) triples.
    Emit all three messages PLUS a MANEUVER_DECISION to out_queue.
    """
    while not stop_event.is_set():
        try:
            item = await asyncio.wait_for(in_queue.get(), timeout=0.5)
        except asyncio.TimeoutError:
            continue

        if item is None:
            await out_queue.put(None)
            logger.info("Maneuver agent: sentinel forwarded.")
            break

        row: CdmRow
        state_msg: StreamMessage
        risk_msg: StreamMessage
        row, state_msg, risk_msg = item

        # Invariant check
        if row.decision == "MANEUVER" and row.phase != "DECISION":
            logger.warning(
                "Event %s step %d: MANEUVER on non-DECISION row (phase=%s). "
                "Downgrading to MONITOR.",
                row.event_id, row.step, row.phase,
            )
            decision = "MONITOR"
        else:
            decision = row.decision

        # Retrieve pc_trend from the already-built state payload
        pc_trend: str = state_msg.payload.get("pc_trend", "stable")
        top_drivers = row.top_drivers

        rationale = _build_rationale(row, pc_trend, top_drivers)

        payload = ManeuverDecisionPayload(
            decision=decision,
            phase=row.phase,
            rationale=rationale,
            suggested_delta_v_ms=None,
        )
        try:
            msg = StreamMessage(
                msg_type="MANEUVER_DECISION",
                event_id=row.event_id,
                source_agent="maneuver",
                payload=payload.model_dump(),
            )
        except ValidationError as exc:
            logger.warning("Maneuver agent: invalid MANEUVER_DECISION: %s", exc)
            continue

        await out_queue.put((state_msg, risk_msg, msg))

    logger.info("Maneuver agent stopped.")
