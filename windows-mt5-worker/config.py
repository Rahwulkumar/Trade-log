from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv


load_dotenv()


@dataclass(slots=True)
class WorkerConfig:
    trading_journal_url: str
    worker_secret: str
    worker_id: str
    worker_host: str
    poll_interval_seconds: int
    initial_history_days: int
    sync_overlap_minutes: int
    request_timeout_seconds: int
    mt5_initialize_timeout_ms: int
    mt5_terminal_path: str | None
    mt5_portable: bool
    cursor_store_path: Path

    @classmethod
    def from_env(cls) -> "WorkerConfig":
        root = Path(__file__).resolve().parent
        worker_id = os.getenv("MT5_WORKER_ID", "windows-worker-1").strip() or "windows-worker-1"
        worker_host = os.getenv("MT5_WORKER_HOST", os.getenv("COMPUTERNAME", "unknown-host")).strip()

        return cls(
            trading_journal_url=os.getenv("TRADING_JOURNAL_URL", "").strip().rstrip("/"),
            worker_secret=os.getenv("MT5_WORKER_SECRET", "").strip(),
            worker_id=worker_id,
            worker_host=worker_host or "unknown-host",
            poll_interval_seconds=int(os.getenv("POLL_INTERVAL_SECONDS", "60")),
            initial_history_days=int(os.getenv("INITIAL_HISTORY_DAYS", "90")),
            sync_overlap_minutes=int(os.getenv("SYNC_OVERLAP_MINUTES", "5")),
            request_timeout_seconds=int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30")),
            mt5_initialize_timeout_ms=int(os.getenv("MT5_INITIALIZE_TIMEOUT_MS", "60000")),
            mt5_terminal_path=os.getenv("MT5_TERMINAL_PATH", "").strip() or None,
            mt5_portable=os.getenv("MT5_PORTABLE", "false").strip().lower() == "true",
            cursor_store_path=Path(
                os.getenv("MT5_CURSOR_STORE_PATH", str(root / "state" / "cursors.json"))
            ),
        )

    def validate(self) -> list[str]:
        missing: list[str] = []
        if not self.trading_journal_url:
            missing.append("TRADING_JOURNAL_URL")
        elif self.trading_journal_url == "https://your-app.example.com":
            missing.append("TRADING_JOURNAL_URL (replace example value)")
        else:
            parsed = urlparse(self.trading_journal_url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                missing.append("TRADING_JOURNAL_URL (must be a valid http/https URL)")
        if not self.worker_secret:
            missing.append("MT5_WORKER_SECRET")
        elif self.worker_secret == "replace_with_backend_worker_secret":
            missing.append("MT5_WORKER_SECRET (replace example value)")
        return missing
