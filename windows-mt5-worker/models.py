from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Optional


@dataclass(slots=True)
class WorkerAssignment:
    terminal_id: str
    mt5_account_id: str
    user_id: str
    desired_state: str
    account_name: str
    server: str
    login: str
    password: str
    last_heartbeat: Optional[str]
    last_sync_at: Optional[str]
    worker_id: Optional[str]
    worker_host: Optional[str]

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> "WorkerAssignment":
        return cls(
            terminal_id=str(payload["terminalId"]),
            mt5_account_id=str(payload["mt5AccountId"]),
            user_id=str(payload["userId"]),
            desired_state=str(payload["desiredState"]),
            account_name=str(payload["accountName"]),
            server=str(payload["server"]),
            login=str(payload["login"]),
            password=str(payload["password"]),
            last_heartbeat=payload.get("lastHeartbeat"),
            last_sync_at=payload.get("lastSyncAt"),
            worker_id=payload.get("workerId"),
            worker_host=payload.get("workerHost"),
        )


@dataclass(slots=True)
class DealCursor:
    last_deal_time_msc: int
    last_deal_ticket: int

    def to_payload(self) -> dict[str, int]:
        return {
            "lastDealTimeMsc": self.last_deal_time_msc,
            "lastDealTicket": self.last_deal_ticket,
        }

    def to_sync_cursor(self) -> str:
        return f"{self.last_deal_time_msc}:{self.last_deal_ticket}"

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> "DealCursor":
        return cls(
            last_deal_time_msc=int(payload["lastDealTimeMsc"]),
            last_deal_ticket=int(payload["lastDealTicket"]),
        )
