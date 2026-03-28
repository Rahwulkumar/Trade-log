from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

try:
    import MetaTrader5 as mt5
except ImportError as exc:  # pragma: no cover - depends on local Windows runtime
    mt5 = None
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


class Mt5RuntimeError(RuntimeError):
    pass


class Mt5Client:
    def __init__(self, terminal_path: str | None, portable: bool, timeout_ms: int) -> None:
        self._terminal_path = terminal_path
        self._portable = portable
        self._timeout_ms = timeout_ms

    def discover_current_session(self) -> Any | None:
        if mt5 is None:
            raise Mt5RuntimeError(
                f"MetaTrader5 package is not available: {IMPORT_ERROR}"
            )

        initialized = self._initialize()
        if not initialized:
            error = mt5.last_error()
            raise Mt5RuntimeError(
                f"MT5 initialize() without credentials failed: {error}"
            )

        account_info = mt5.account_info()
        if account_info is None:
            return None

        return account_info

    def connect(self, login: str, password: str, server: str) -> None:
        if mt5 is None:
            raise Mt5RuntimeError(
                f"MetaTrader5 package is not available: {IMPORT_ERROR}"
            )

        initialized = self._initialize(
            login=login,
            password=password,
            server=server,
        )
        if not initialized:
            direct_error = mt5.last_error()

            # Fallback for terminals that refuse credentialed initialize but can still
            # initialize first and then accept an explicit login call.
            initialized = self._initialize()
            if not initialized:
                raise Mt5RuntimeError(
                    self._format_auth_error(
                        phase="initialize",
                        login=login,
                        server=server,
                        error=direct_error,
                    )
                )

            authorized = mt5.login(
                login=int(login),
                password=password,
                server=server,
                timeout=self._timeout_ms,
            )
            if not authorized:
                login_error = mt5.last_error()
                self.shutdown()
                raise Mt5RuntimeError(
                    self._format_auth_error(
                        phase="login",
                        login=login,
                        server=server,
                        error=login_error,
                    )
                )

    def shutdown(self) -> None:
        if mt5 is not None:
            mt5.shutdown()

    def get_account_info(self) -> Any:
        account_info = mt5.account_info()
        if account_info is None:
            raise Mt5RuntimeError(f"MT5 account_info failed: {mt5.last_error()}")
        return account_info

    def get_positions(self) -> list[Any]:
        positions = mt5.positions_get()
        if positions is None:
            raise Mt5RuntimeError(f"MT5 positions_get failed: {mt5.last_error()}")
        return list(positions)

    def get_history_deals(self, start: datetime, end: datetime) -> list[Any]:
        deals = mt5.history_deals_get(start, end)
        if deals is None:
            raise Mt5RuntimeError(f"MT5 history_deals_get failed: {mt5.last_error()}")
        return list(deals)

    def get_candles(
        self,
        symbol: str,
        timeframe: str,
        start: datetime,
        end: datetime,
    ) -> list[Any]:
        timeframe_map = {
            "1m": mt5.TIMEFRAME_M1,
            "5m": mt5.TIMEFRAME_M5,
            "15m": mt5.TIMEFRAME_M15,
            "30m": mt5.TIMEFRAME_M30,
            "1h": mt5.TIMEFRAME_H1,
            "4h": mt5.TIMEFRAME_H4,
            "1d": mt5.TIMEFRAME_D1,
        }

        period = timeframe_map.get(timeframe.lower())
        if period is None:
            raise Mt5RuntimeError(f"Unsupported MT5 chart timeframe: {timeframe}")

        rates = mt5.copy_rates_range(symbol, period, start, end)
        if rates is None:
            raise Mt5RuntimeError(
                f"MT5 copy_rates_range failed for {symbol} {timeframe}: {mt5.last_error()}"
            )
        return list(rates)

    def get_total_deal_count(self, initial_history_days: int) -> int:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=max(initial_history_days, 1))
        return len(self.get_history_deals(start, end))

    def get_contract_size(self, symbol: str) -> float | None:
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            return None

        contract_size = getattr(symbol_info, "trade_contract_size", None)
        if contract_size is None:
            return None

        return float(contract_size)

    @staticmethod
    def deal_sort_key(deal: Any) -> tuple[int, int]:
        time_msc = int(getattr(deal, "time_msc", 0) or 0)
        if time_msc == 0:
            time_msc = int(getattr(deal, "time", 0) or 0) * 1000
        ticket = int(getattr(deal, "ticket", 0) or 0)
        return (time_msc, ticket)

    @staticmethod
    def filter_incremental_deals(
        deals: Iterable[Any],
        cursor_time_msc: int | None,
        cursor_ticket: int | None,
    ) -> list[Any]:
        if cursor_time_msc is None or cursor_ticket is None:
            return list(deals)

        filtered: list[Any] = []
        for deal in deals:
            time_msc, ticket = Mt5Client.deal_sort_key(deal)
            if time_msc > cursor_time_msc or (
                time_msc == cursor_time_msc and ticket > cursor_ticket
            ):
                filtered.append(deal)
        return filtered

    def _initialize(
        self,
        login: str | None = None,
        password: str | None = None,
        server: str | None = None,
    ) -> bool:
        kwargs: dict[str, Any] = {
            "path": self._terminal_path,
            "timeout": self._timeout_ms,
            "portable": self._portable,
        }

        if login is not None:
            kwargs["login"] = int(login)
        if password:
            kwargs["password"] = password
        if server:
            kwargs["server"] = server

        return bool(mt5.initialize(**kwargs))

    def _format_auth_error(
        self,
        phase: str,
        login: str,
        server: str,
        error: Any,
    ) -> str:
        guidance = ""
        code = error[0] if isinstance(error, tuple) and len(error) > 0 else None
        message = error[1] if isinstance(error, tuple) and len(error) > 1 else str(error)

        if code == -6 or "Authorization failed" in str(message):
            guidance = (
                f" The MT5 terminal at {self._terminal_path or '<default terminal path>'} "
                f"could not authorize login {login} on server {server}. "
                f"Use the broker-specific MT5 terminal if FundingPips provides one, or open "
                f"this terminal manually and log into {server} once so the broker server "
                "definition and account authorization are stored locally."
            )

        return f"MT5 {phase} failed: {error}.{guidance}"
