"""Bridge synchronous Celery tasks to their asynchronous job implementations."""

import asyncio
from collections.abc import Coroutine
from typing import Any


def run_async(coroutine: Coroutine[Any, Any, Any]) -> Any:
    """Run one task; worker.database uses NullPool to avoid cross-loop reuse."""
    return asyncio.run(coroutine)
