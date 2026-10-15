"""
Risk Agent
──────────
Passes through risk_score, risk_level, phase and top_drivers straight from
the file. Emits RISK_ALERT messages.
"""
from __future__ import annotations

import asyncio
import logging

from pydantic import ValidationError

from backend.core.models import (
    CdmRow,
    RiskAlertPayload,
    StreamMessage,
)

logger = logging.getLogger(__name__)


async def risk_agent(
    in_queue: asyncio.Queue,
    out_queue: asyncio.Queue,
    *,
    stop_event: asyncio.Event,
) -> None:
    """
    Receive (CdmRow, STATE_UPDATE StreamMessage) tuples from the tracking agent.
    Emit (CdmRow, STATE_UPDATE, RISK_ALERT) triples downstream.
    """
    while not stop_event.is_set():
        try:
            item = await asyncio.wait_for(in_queue.get(), timeout=0.5)
        except asyncio.TimeoutError:
            continue

        if item is None:
            await out_queue.put(None)
            logger.info("Risk agent: sentinel forwarded.")
            break

        row: CdmRow
        state_msg: StreamMessage
        row, state_msg = item

        payload = RiskAlertPayload(
            risk_score=row.risk_score,
            risk_level=row.risk_level,
            phase=row.phase,
            top_drivers=row.top_drivers,
            rule_points=row.rule_points,
            ml_score=row.ml_score,
        )
        try:
            msg = StreamMessage(
                msg_type="RISK_ALERT",
                event_id=row.event_id,
                source_agent="risk",
                payload=payload.model_dump(),
            )
        except ValidationError as exc:
            logger.warning("Risk agent: invalid RISK_ALERT: %s", exc)
            continue

        await out_queue.put((row, state_msg, msg))

    logger.info("Risk agent stopped.")
