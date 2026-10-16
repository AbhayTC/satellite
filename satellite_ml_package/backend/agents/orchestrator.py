"""
Replay orchestrator
───────────────────
Manages the agent pipeline lifecycle and the shared in-memory event store.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, Optional

from backend.core.config import STREAM_LOG_FILE
from backend.core.logger import append_jsonl
from backend.core.models import StreamMessage
from backend.agents.ingestion import ingestion_agent
from backend.agents.tracking import tracking_agent
from backend.agents.risk import risk_agent
from backend.agents.maneuver import maneuver_agent

logger = logging.getLogger(__name__)


class EventStore:
    """In-memory cache of the latest messages per event_id."""

    def __init__(self) -> None:
        self._state: Dict[str, dict]  = {}
        self._risk:  Dict[str, dict]  = {}
        self._decision: Dict[str, dict] = {}
        self._history: Dict[str, list] = {}

    def update(
        self,
        state_msg: StreamMessage,
        risk_msg: StreamMessage,
        decision_msg: StreamMessage,
    ) -> None:
        eid = state_msg.event_id
        sd = state_msg.model_dump()
        rd = risk_msg.model_dump()
        dd = decision_msg.model_dump()
        self._state[eid]    = sd
        self._risk[eid]     = rd
        self._decision[eid] = dd
        self._history.setdefault(eid, []).append(sd)
        self._history[eid].append(rd)
        self._history[eid].append(dd)

    def latest_per_event(self) -> list:
        result = []
        for eid in self._state:
            entry: dict = {"event_id": eid}
            if eid in self._state:
                entry["state"]    = self._state[eid]
            if eid in self._risk:
                entry["risk"]     = self._risk[eid]
            if eid in self._decision:
                entry["decision"] = self._decision[eid]
            result.append(entry)
        return result

    def history(self, event_id: str) -> list:
        return self._history.get(str(event_id), [])

    def clear(self) -> None:
        self._state.clear()
        self._risk.clear()
        self._decision.clear()
        self._history.clear()


class ReplayOrchestrator:
    """Manages start / stop / reset of the four-agent pipeline."""

    def __init__(self, ws_broadcast) -> None:
        self._broadcast = ws_broadcast  # coroutine: broadcast(dict) -> None
        self.store = EventStore()
        self._running = False
        self._stop_event: Optional[asyncio.Event] = None
        self._tasks: list = []

    @property
    def is_running(self) -> bool:
        return self._running

    async def start(self, source: Optional[str] = None, speed: Optional[float] = None) -> None:
        if self._running:
            logger.warning("Replay already running.")
            return
        self._stop_event = asyncio.Event()
        q_ingest   = asyncio.Queue(maxsize=200)
        q_tracking = asyncio.Queue(maxsize=200)
        q_risk     = asyncio.Queue(maxsize=200)
        q_maneuver = asyncio.Queue(maxsize=200)

        stop = self._stop_event

        async def _run_ingestion():
            await ingestion_agent(q_ingest, source=source, speed=speed, stop_event=stop)

        async def _run_tracking():
            await tracking_agent(q_ingest, q_tracking, stop_event=stop)

        async def _run_risk():
            await risk_agent(q_tracking, q_risk, stop_event=stop)

        async def _run_maneuver():
            await maneuver_agent(q_risk, q_maneuver, stop_event=stop)

        async def _run_sink():
            """Read from the final queue, update store, broadcast over WS, log."""
            while True:
                try:
                    item = await asyncio.wait_for(q_maneuver.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    if stop.is_set():
                        break
                    continue
                if item is None:
                    break
                state_msg, risk_msg, decision_msg = item
                self.store.update(state_msg, risk_msg, decision_msg)
                for msg in (state_msg, risk_msg, decision_msg):
                    payload = msg.model_dump()
                    await self._broadcast(payload)
                    await append_jsonl(STREAM_LOG_FILE, payload)
            self._running = False
            logger.info("Replay pipeline finished.")

        self._tasks = [
            asyncio.create_task(_run_ingestion()),
            asyncio.create_task(_run_tracking()),
            asyncio.create_task(_run_risk()),
            asyncio.create_task(_run_maneuver()),
            asyncio.create_task(_run_sink()),
        ]
        self._running = True
        logger.info("Replay pipeline started.")

    async def stop(self) -> None:
        if self._stop_event:
            self._stop_event.set()
        for t in self._tasks:
            t.cancel()
        self._tasks.clear()
        self._running = False
        logger.info("Replay pipeline stopped.")

    async def reset(self, source: Optional[str] = None, speed: Optional[float] = None) -> None:
        await self.stop()
        self.store.clear()
        try:
            reset_msg = StreamMessage(
                msg_type="PIPELINE_RESET",
                event_id="0",
                source_agent="ingestion",
                payload={"status": "reset"},
            )
            await self._broadcast(reset_msg.model_dump())
        except Exception as exc:
            logger.warning("Failed to broadcast reset message: %s", exc)
        await self.start(source=source, speed=speed)
