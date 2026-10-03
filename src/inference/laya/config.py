import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    model: str
    device: str | None
    dtype: str

    def validate(self):
        if self.device not in {None, "cpu", "gpu"}:
            raise RuntimeError("LAYA_DEVICE must be cpu or gpu")
        if self.dtype not in {"float16", "float32", "bfloat16"}:
            raise RuntimeError("Invalid LAYA_DTYPE")

def read_config():
    return Config(os.getenv("LAYA_MODEL", "aac6fef/laya-multilingual-mlx"),
                  os.getenv("LAYA_DEVICE") or None, os.getenv("LAYA_DTYPE", "float16"))
