from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

from config import WorkerConfig
from mt5_client import IMPORT_ERROR, Mt5Client, Mt5RuntimeError


def to_payload(account_info) -> dict[str, object]:
    return {
        "detectedAt": datetime.now(timezone.utc).isoformat(),
        "login": str(getattr(account_info, "login", "") or ""),
        "server": str(getattr(account_info, "server", "") or ""),
        "accountName": str(getattr(account_info, "name", "") or ""),
        "company": str(getattr(account_info, "company", "") or ""),
        "currency": str(getattr(account_info, "currency", "") or ""),
        "balance": float(getattr(account_info, "balance", 0.0) or 0.0),
        "equity": float(getattr(account_info, "equity", 0.0) or 0.0),
        "margin": float(getattr(account_info, "margin", 0.0) or 0.0),
        "freeMargin": float(getattr(account_info, "margin_free", 0.0) or 0.0),
    }


def main() -> int:
    if IMPORT_ERROR is not None:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": f"MetaTrader5 package import failed: {IMPORT_ERROR}",
                },
                indent=2,
            )
        )
        return 1

    config = WorkerConfig.from_env()
    client = Mt5Client(
        terminal_path=config.mt5_terminal_path,
        portable=config.mt5_portable,
        timeout_ms=config.mt5_initialize_timeout_ms,
    )

    try:
        account_info = client.discover_current_session()
        if account_info is None:
            print(
                json.dumps(
                    {
                        "success": True,
                        "sessionFound": False,
                        "message": "MT5 initialized, but account_info() returned no active session.",
                    },
                    indent=2,
                )
            )
            return 0

        print(
            json.dumps(
                {
                    "success": True,
                    "sessionFound": True,
                    "sessionInfo": to_payload(account_info),
                    "note": "This output reflects what mt5.initialize() without credentials re-attached to.",
                },
                indent=2,
            )
        )
        return 0
    except Mt5RuntimeError as error:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": str(error),
                },
                indent=2,
            )
        )
        return 1
    finally:
        client.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
