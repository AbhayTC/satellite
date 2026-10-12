"""Shared JSONL stream logger."""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()


async def append_jsonl(path: Path, obj: dict) -> None:
    """Append a JSON object as a single line to a JSONL file (async-safe)."""
    line = json.dumps(obj, ensure_ascii=False) + "\n"
    async with _lock:
        try:
            with path.open("a", encoding="utf-8") as fh:
                fh.write(line)
        except OSError as exc:
            logger.error("JSONL write failed: %s", exc)
