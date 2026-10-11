import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    model: str
    device: str | None
    dtype: str
    backend: str = "mlx"
    threads: int = 1

    def validate(self):
        if self.backend not in {"mlx", "torch"}:
            raise RuntimeError("LAYA_BACKEND must be mlx or torch")
        if not 1 <= self.threads <= 4:
            raise RuntimeError("LAYA_THREADS must be from 1 to 4")
        if self.backend == "torch" and (self.device != "cpu" or self.dtype != "float32"):
            raise RuntimeError("The Laya torch backend requires cpu and float32")
        if self.device not in {None, "cpu", "gpu"}:
            raise RuntimeError("LAYA_DEVICE must be cpu or gpu")
        if self.dtype not in {"float16", "float32", "bfloat16"}:
            raise RuntimeError("Invalid LAYA_DTYPE")

def read_config():
    backend = os.getenv("LAYA_BACKEND", "mlx")
    cpu = backend == "torch"
    return Config(os.getenv("LAYA_MODEL", "convaiinnovations/laya-multilingual" if cpu else "aac6fef/laya-multilingual-mlx"),
                  os.getenv("LAYA_DEVICE", "cpu" if cpu else "") or None,
                  os.getenv("LAYA_DTYPE", "float32" if cpu else "float16"),
                  backend, int(os.getenv("LAYA_THREADS", "1")))
