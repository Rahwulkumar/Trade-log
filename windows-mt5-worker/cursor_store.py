from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional

from models import DealCursor


class CursorStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def load(self, terminal_id: str) -> Optional[DealCursor]:
        data = self._load_all()
        payload = data.get(terminal_id)
        if not isinstance(payload, dict):
            return None
        return DealCursor.from_payload(payload)

    def save(self, terminal_id: str, cursor: DealCursor) -> None:
        data = self._load_all()
        data[terminal_id] = cursor.to_payload()
        self._path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def clear(self, terminal_id: str) -> None:
        data = self._load_all()
        if terminal_id in data:
            del data[terminal_id]
            self._path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def _load_all(self) -> Dict[str, dict]:
        if not self._path.exists():
            return {}
        raw = self._path.read_text(encoding="utf-8").strip()
        if not raw:
            return {}
        return json.loads(raw)
