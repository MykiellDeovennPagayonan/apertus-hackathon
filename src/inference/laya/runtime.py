from __future__ import annotations
import logging
import threading
import time
from typing import Any, Literal

class ModelRuntime:
    def __init__(self, model_id: str, device: str | None, dtype: str, backend: str = "mlx", threads: int = 1):
        self.model_id = model_id
        self.device = device
        self.dtype = dtype
        self.backend = backend
        self.threads = threads
        self.agent = None
        self.state: Literal["loading", "ready", "error"] = "loading"
        self.load_ms: float | None = None
        self.warmup_ms: float | None = None
        self.error: str | None = None
        self._lock = threading.Lock()

    def load(self) -> None:
        started = time.perf_counter()
        try:
            if self.backend == "torch":
                import torch
                import laya as cpu_laya

                # Docker installs this wrapper as laya_service so upstream laya is unshadowed.
                if not hasattr(cpu_laya, "load"):
                    raise RuntimeError("Launch the CPU wrapper as laya_service using its Docker image; the local laya package shadows upstream Laya")
                torch.set_num_threads(self.threads)
                torch.set_num_interop_threads(1)
                self.agent = cpu_laya.load(self.model_id, device="cpu", backend="eager")
            else:
                import laya_mlx as mlx_laya

                load_options = {"dtype": self.dtype}
                if self.device:
                    load_options["device"] = self.device
                self.agent = mlx_laya.load(self.model_id, **load_options)
            self.load_ms = (time.perf_counter() - started) * 1000
            warmup_started = time.perf_counter()
            self.agent.predict(
                "Warm up the local inference runtime.",
                {
                    "ready": {
                        "type": "noul",
                        "instructions": "Is the runtime ready?",
                    }
                },
            )
            self.warmup_ms = (time.perf_counter() - warmup_started) * 1000
            self.state = "ready"
        except Exception as exc:
            logging.getLogger(__name__).exception("Laya model loading failed")
            self.error = f"{type(exc).__name__}: {exc}"
            self.state = "error"

    def predict(self, state: Any, questions: dict[str, Any]) -> tuple[dict[str, Any], float]:
        if self.state != "ready" or self.agent is None:
            raise RuntimeError(self.error or "The model is still loading")
        with self._lock:
            started = time.perf_counter()
            result = self.agent.predict(state, questions)
            inference_ms = (time.perf_counter() - started) * 1000
        return result, inference_ms
