from __future__ import annotations

import argparse
import logging
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DEPENDENCY_IMPORT_ERROR: ModuleNotFoundError | None = None

try:
    from api_client import TradingJournalApiClient
    from config import WorkerConfig
    from cursor_store import CursorStore
    from models import DealCursor, WorkerAssignment, WorkerChartJob
    from mt5_client import IMPORT_ERROR, Mt5Client, Mt5RuntimeError
except ModuleNotFoundError as error:
    DEPENDENCY_IMPORT_ERROR = error
    TradingJournalApiClient = None  # type: ignore[assignment]
    WorkerConfig = None  # type: ignore[assignment]
    CursorStore = None  # type: ignore[assignment]
    DealCursor = None  # type: ignore[assignment]
    WorkerAssignment = None  # type: ignore[assignment]
    WorkerChartJob = None  # type: ignore[assignment]
    IMPORT_ERROR = error
    Mt5Client = None  # type: ignore[assignment]
    Mt5RuntimeError = RuntimeError  # type: ignore[assignment]


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("windows_mt5_worker")

BUY_TYPE = 0
SELL_TYPE = 1


def format_mt5_time(value: Any) -> str:
    timestamp = int(value or 0)
    if timestamp <= 0:
        return datetime.now(timezone.utc).strftime("%Y.%m.%d %H:%M:%S")
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y.%m.%d %H:%M:%S")


def parse_iso_timestamp(value: str) -> datetime:
    normalized = value.strip().replace(" ", "T")
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def normalize_positions(assignment: WorkerAssignment, positions: list[Any]) -> dict[str, Any]:
    normalized: list[dict[str, Any]] = []
    for position in positions:
        position_type = "BUY" if int(getattr(position, "type", BUY_TYPE)) == BUY_TYPE else "SELL"
        normalized.append(
            {
                "ticket": str(getattr(position, "ticket", "")),
                "positionId": str(
                    getattr(position, "identifier", getattr(position, "ticket", ""))
                ),
                "symbol": str(getattr(position, "symbol", "")),
                "type": position_type,
                "volume": float(getattr(position, "volume", 0.0)),
                "openPrice": float(getattr(position, "price_open", 0.0)),
                "currentPrice": float(getattr(position, "price_current", 0.0)),
                "profit": float(getattr(position, "profit", 0.0)),
                "openTime": format_mt5_time(getattr(position, "time", 0)),
                "stopLoss": float(getattr(position, "sl", 0.0)),
                "takeProfit": float(getattr(position, "tp", 0.0)),
                "commission": float(getattr(position, "commission", 0.0)),
                "swap": float(getattr(position, "swap", 0.0)),
                "comment": str(getattr(position, "comment", "") or ""),
            }
        )

    return {
        "terminalId": assignment.terminal_id,
        "positions": normalized,
    }


def normalize_deals(
    deals: list[Any],
    contract_size_lookup,
) -> tuple[list[dict[str, Any]], DealCursor | None]:
    normalized: list[dict[str, Any]] = []
    cursor: DealCursor | None = None

    for deal in deals:
        deal_type = int(getattr(deal, "type", -1))
        if deal_type not in (BUY_TYPE, SELL_TYPE):
            continue

        contract_size = contract_size_lookup(str(getattr(deal, "symbol", "")))
        normalized.append(
            {
                "ticket": str(getattr(deal, "ticket", "")),
                "symbol": str(getattr(deal, "symbol", "")),
                "type": "BUY" if deal_type == BUY_TYPE else "SELL",
                "volume": float(getattr(deal, "volume", 0.0)),
                "openPrice": float(getattr(deal, "price", 0.0)),
                "commission": float(getattr(deal, "commission", 0.0)),
                "swap": float(getattr(deal, "swap", 0.0)),
                "profit": float(getattr(deal, "profit", 0.0)),
                "openTime": format_mt5_time(getattr(deal, "time", 0)),
                "comment": str(getattr(deal, "comment", "") or ""),
                "positionId": str(getattr(deal, "position_id", "") or ""),
                "magic": int(getattr(deal, "magic", 0) or 0),
                "entryType": int(getattr(deal, "entry", 0) or 0),
                "reason": int(getattr(deal, "reason", 0) or 0),
                "stopLoss": float(getattr(deal, "sl", 0.0)),
                "takeProfit": float(getattr(deal, "tp", 0.0)),
                **({"contractSize": contract_size} if contract_size is not None else {}),
            }
        )
        time_msc = int(getattr(deal, "time_msc", 0) or 0)
        if time_msc == 0:
            time_msc = int(getattr(deal, "time", 0) or 0) * 1000
        cursor = DealCursor(
            last_deal_time_msc=time_msc,
            last_deal_ticket=int(getattr(deal, "ticket", 0) or 0),
        )

    return normalized, cursor


def normalize_candles(
    assignment: WorkerAssignment,
    job: WorkerChartJob,
    candles: list[Any],
) -> dict[str, Any]:
    normalized: list[dict[str, Any]] = []

    for candle in candles:
        normalized.append(
            {
                "time": int(candle["time"]),
                "open": float(candle["open"]),
                "high": float(candle["high"]),
                "low": float(candle["low"]),
                "close": float(candle["close"]),
            }
        )

    return {
        "terminalId": assignment.terminal_id,
        "tradeId": job.trade_id,
        "commandId": job.command_id,
        "symbol": job.symbol,
        "timeframe": job.timeframe,
        "candles": normalized,
    }


class WindowsMt5Worker:
    def __init__(self, config: WorkerConfig) -> None:
        self._config = config
        self._api = TradingJournalApiClient(config)
        self._cursors = CursorStore(config.cursor_store_path)
        self._contract_size_cache: dict[str, float | None] = {}
        self._mt5 = Mt5Client(
            terminal_path=config.mt5_terminal_path,
            portable=config.mt5_portable,
            timeout_ms=config.mt5_initialize_timeout_ms,
        )

    def run_forever(self) -> None:
        while True:
            try:
                self.run_once()
            except Exception:
                logger.exception("Worker sync cycle failed")
            time.sleep(self._config.poll_interval_seconds)

    def run_once(self) -> None:
        assignments = self._api.fetch_assignments()
        running_assignments = [
            assignment for assignment in assignments if assignment.desired_state == "RUNNING"
        ]

        if not running_assignments:
            logger.info("No RUNNING assignments returned by backend")
            return

        if len(running_assignments) > 1:
            logger.warning(
                "Received %s RUNNING assignments. This worker processes only the first assignment for now.",
                len(running_assignments),
            )

        assignment = running_assignments[0]
        self._sync_assignment(assignment)

    def run_check(self) -> None:
        if self._config.mt5_terminal_path:
            terminal_path = Path(self._config.mt5_terminal_path)
            if not terminal_path.exists():
                raise RuntimeError(
                    f"Configured MT5 terminal path does not exist: {terminal_path}"
                )
            logger.info("MT5 terminal path found at %s", terminal_path)
        else:
            logger.warning(
                "MT5_TERMINAL_PATH is not set. The MetaTrader5 package will use its default terminal discovery."
            )

        if IMPORT_ERROR is not None:
            raise RuntimeError(
                f"MetaTrader5 package is not available: {IMPORT_ERROR}"
            )

        assignments = self._api.fetch_assignments()
        logger.info("Worker preflight succeeded")
        logger.info("Assignments returned by backend: %s", len(assignments))

        if assignments:
            current = assignments[0]
            logger.info(
                "First assignment terminal=%s desiredState=%s login=%s server=%s",
                current.terminal_id,
                current.desired_state,
                current.login,
                current.server,
            )

    def _sync_assignment(self, assignment: WorkerAssignment) -> None:
        logger.info(
            "Syncing terminal=%s login=%s server=%s",
            assignment.terminal_id,
            assignment.login,
            assignment.server,
        )

        try:
            self._mt5.connect(
                login=assignment.login,
                password=assignment.password,
                server=assignment.server,
            )

            account_info = self._mt5.get_account_info()
            positions = self._mt5.get_positions()
            existing_cursor = self._cursors.load(assignment.terminal_id)
            total_deals = self._mt5.get_total_deal_count(
                self._config.initial_history_days
            )
            new_deals, next_cursor = self._load_incremental_deals(
                assignment, existing_cursor
            )

            history_reason = "startup" if existing_cursor is None else "no_change"
            if new_deals:
                history_reason = "new_deal"

            actual_login = str(
                getattr(account_info, "login", "") or assignment.login
            )
            actual_server = str(
                getattr(account_info, "server", "") or assignment.server
            )

            heartbeat_payload = {
                "terminalId": assignment.terminal_id,
                "accountInfo": {
                    "balance": float(getattr(account_info, "balance", 0.0)),
                    "equity": float(getattr(account_info, "equity", 0.0)),
                    "margin": float(getattr(account_info, "margin", 0.0)),
                    "freeMargin": float(getattr(account_info, "margin_free", 0.0)),
                },
                "sessionInfo": {
                    "login": actual_login,
                    "server": actual_server,
                    "accountName": str(getattr(account_info, "name", "") or ""),
                    "company": str(getattr(account_info, "company", "") or ""),
                    "currency": str(getattr(account_info, "currency", "") or ""),
                },
                "syncState": {
                    "totalDeals": total_deals,
                    "openPositions": len(positions),
                    "lastHistorySyncAt": datetime.now(timezone.utc).strftime("%Y.%m.%d %H:%M:%S"),
                    "lastHistorySyncReason": history_reason,
                },
            }
            self._api.post_heartbeat(heartbeat_payload)
            self._api.post_positions(normalize_positions(assignment, positions))

            if new_deals and next_cursor is not None:
                self._api.post_trades(
                    {
                        "terminalId": assignment.terminal_id,
                        "trades": new_deals,
                        "syncCursor": next_cursor.to_sync_cursor(),
                    }
                )
                self._cursors.save(assignment.terminal_id, next_cursor)
                logger.info("Uploaded %s new MT5 deals", len(new_deals))
            else:
                logger.info("No new MT5 deals for terminal=%s", assignment.terminal_id)

            for job in assignment.chart_jobs:
                self._sync_chart_job(assignment, job)
        except (Mt5RuntimeError, OSError, RuntimeError) as error:
            logger.error("Worker sync failed for terminal=%s: %s", assignment.terminal_id, error)
            raise
        finally:
            self._mt5.shutdown()

    def _lookup_contract_size(self, symbol: str) -> float | None:
        if symbol not in self._contract_size_cache:
            self._contract_size_cache[symbol] = self._mt5.get_contract_size(symbol)
        return self._contract_size_cache[symbol]

    def _load_incremental_deals(
        self,
        assignment: WorkerAssignment,
        cursor: DealCursor | None,
    ) -> tuple[list[dict[str, Any]], DealCursor | None]:
        now = datetime.now(timezone.utc)

        if cursor is None:
            start = now - timedelta(days=self._config.initial_history_days)
            cursor_time_msc = None
            cursor_ticket = None
        else:
            start = datetime.fromtimestamp(
                max(cursor.last_deal_time_msc - self._config.sync_overlap_minutes * 60_000, 0)
                / 1000,
                tz=timezone.utc,
            )
            cursor_time_msc = cursor.last_deal_time_msc
            cursor_ticket = cursor.last_deal_ticket

        deals = self._mt5.get_history_deals(start, now)
        deals.sort(key=self._mt5.deal_sort_key)
        incremental_deals = self._mt5.filter_incremental_deals(
            deals, cursor_time_msc, cursor_ticket
        )
        normalized, next_cursor = normalize_deals(
            incremental_deals,
            self._lookup_contract_size,
        )
        return normalized, next_cursor

    def _sync_chart_job(
        self,
        assignment: WorkerAssignment,
        job: WorkerChartJob,
    ) -> None:
        try:
            logger.info(
                "Fetching MT5 candles for trade=%s symbol=%s timeframe=%s",
                job.trade_id,
                job.symbol,
                job.timeframe,
            )

            candles = self._mt5.get_candles(
                job.symbol,
                job.timeframe,
                parse_iso_timestamp(job.start_time),
                parse_iso_timestamp(job.end_time),
            )

            self._api.post_candles(normalize_candles(assignment, job, candles))
            logger.info(
                "Uploaded %s MT5 candles for trade=%s",
                len(candles),
                job.trade_id,
            )
        except (Mt5RuntimeError, OSError, RuntimeError) as error:
            logger.warning(
                "MT5 candle fetch failed for trade=%s: %s",
                job.trade_id,
                error,
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Windows MT5 Python worker")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single sync cycle and exit",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Run deployment preflight checks and exit",
    )
    return parser.parse_args()


def main() -> int:
    if DEPENDENCY_IMPORT_ERROR is not None:
        logger.error(
            "Worker dependencies are not installed: %s. Run .\\bootstrap.ps1 and ensure pip can install requirements.",
            DEPENDENCY_IMPORT_ERROR,
        )
        return 1

    if sys.version_info >= (3, 12):
        logger.warning(
            "Python %s detected. MetaTrader5 IPC is more reliable on Python 3.11 x64. "
            "If this machine shows persistent IPC timeouts, install Python 3.11 and rebuild the worker venv.",
            sys.version.split()[0],
        )

    args = parse_args()
    config = WorkerConfig.from_env()
    missing = config.validate()
    if missing:
        logger.error("Missing required environment variables: %s", ", ".join(missing))
        return 1

    worker = WindowsMt5Worker(config)
    try:
        if args.check:
            worker.run_check()
        elif args.once:
            worker.run_once()
        else:
            worker.run_forever()
    except Exception:
        logger.exception("Windows MT5 worker exited with an error")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
