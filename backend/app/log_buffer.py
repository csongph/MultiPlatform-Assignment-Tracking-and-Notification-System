"""
In-memory ring buffer of recent application log lines, so the Admin
Console's "Server Logs" tab (M16, GET /admin/server-logs) has something to
show without needing an external log aggregator. This is intentionally
lightweight for a project at this scale — logs live only as long as the
process is up and are lost on restart/across multiple worker processes.
"""

import logging
from collections import deque

MAX_LOG_LINES = 500

LOG_BUFFER: deque[str] = deque(maxlen=MAX_LOG_LINES)


class _BufferHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            LOG_BUFFER.append(self.format(record))
        except Exception:  # noqa: BLE001 - a broken log line must never crash logging
            pass


# uvicorn's own loggers ("uvicorn", "uvicorn.error", "uvicorn.access" - the
# ones that print the "GET /api/v1/..." request lines you see in the
# terminal) are configured with propagate=False by uvicorn's own logging
# setup, which runs *before* this module is imported. That means a handler
# attached only to the root logger never sees them - they never bubble up.
# Attach directly to each logger that matters instead.
_TARGET_LOGGER_NAMES = ("", "uvicorn", "uvicorn.error", "uvicorn.access", "app")


def install_log_buffer(level: int = logging.INFO) -> None:
    """Call once at app startup (see app/main.py)."""
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

    for name in _TARGET_LOGGER_NAMES:
        logger = logging.getLogger(name)

        if not any(isinstance(h, _BufferHandler) for h in logger.handlers):
            handler = _BufferHandler()
            handler.setLevel(level)
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        if logger.level == logging.NOTSET or logger.level > level:
            logger.setLevel(level)