from __future__ import annotations

from typing import Any

import requests
from requests import Response

from config import WorkerConfig
from models import WorkerAssignment


class TradingJournalApiError(RuntimeError):
    pass


class TradingJournalApiClient:
    def __init__(self, config: WorkerConfig) -> None:
        self._config = config
        self._session = requests.Session()
        self._session.headers.update(
            {
                "x-worker-secret": config.worker_secret,
                "x-worker-id": config.worker_id,
                "x-worker-host": config.worker_host,
                "content-type": "application/json",
                "user-agent": f"trading-journal-windows-worker/{config.worker_id}",
            }
        )

    def fetch_assignments(self) -> list[WorkerAssignment]:
        payload = self._request(
            "GET",
            "/api/internal/mt5-worker/assignments",
        )
        if not isinstance(payload, list):
            raise RuntimeError("Assignments response was not a list")
        return [WorkerAssignment.from_payload(item) for item in payload]

    def post_heartbeat(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post("/api/internal/mt5-worker/heartbeat", payload)

    def post_positions(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post("/api/internal/mt5-worker/positions", payload)

    def post_trades(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post("/api/internal/mt5-worker/trades", payload)

    def post_candles(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post("/api/internal/mt5-worker/candles", payload)

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        data = self._request("POST", path, payload)
        if not isinstance(data, dict):
            raise RuntimeError(f"Unexpected response from {path}")
        return data

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self._config.trading_journal_url}{path}"

        try:
            response = self._session.request(
                method,
                url,
                json=payload,
                timeout=self._config.request_timeout_seconds,
            )
        except requests.RequestException as error:
            raise TradingJournalApiError(
                f"{method} {path} failed: {error}"
            ) from error

        if not response.ok:
            raise TradingJournalApiError(self._format_error_response(method, path, response))

        try:
            return response.json()
        except ValueError as error:
            raise TradingJournalApiError(
                f"{method} {path} returned non-JSON response: {self._response_excerpt(response)}"
            ) from error

    @staticmethod
    def _response_excerpt(response: Response) -> str:
        text = response.text.strip()
        if not text:
            return "<empty>"
        return text[:400]

    def _format_error_response(
        self,
        method: str,
        path: str,
        response: Response,
    ) -> str:
        return (
            f"{method} {path} failed with status {response.status_code}: "
            f"{self._response_excerpt(response)}"
        )
