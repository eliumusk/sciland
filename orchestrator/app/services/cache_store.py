import json
import os
import threading
import time
from typing import Any, Dict, Optional


class CacheStore:
    def __init__(self, file_path: str, ttl_seconds: int = 30):
        self.file_path = file_path
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._data: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        if not os.path.exists(self.file_path):
            self._flush()
            return
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
                if isinstance(raw, dict):
                    self._data = raw
        except Exception:
            self._data = {}
            self._flush()

    def _flush(self):
        temp_path = f"{self.file_path}.tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=True, indent=2)
            f.write("\n")
        os.replace(temp_path, self.file_path)

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            if time.time() - item.get("updated_at", 0) > self.ttl_seconds:
                return None
            return item.get("value")

    def set(self, key: str, value: Any):
        with self._lock:
            self._data[key] = {
                "updated_at": time.time(),
                "value": value,
            }
            self._flush()

    def clear(self, key: str):
        with self._lock:
            if key in self._data:
                self._data.pop(key, None)
                self._flush()
