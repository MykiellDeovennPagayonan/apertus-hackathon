import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    model: str
    device: str | None
    dtype: str
    token: str | None
    auth_disabled: bool

    def validate(self):
        if self.device not in {None, "cpu", "gpu"}:
            raise RuntimeError("LAYA_DEVICE must be cpu or gpu")
        if self.dtype not in {"float16", "float32", "bfloat16"}:
            raise RuntimeError("Invalid LAYA_DTYPE")
        if not self.auth_disabled and not (self.token and self.token.strip()):
            raise RuntimeError("LAYA_API_TOKEN is required unless LAYA_AUTH_DISABLED=true")

def read_config():
    return Config(os.getenv("LAYA_MODEL", "aac6fef/laya-multilingual-mlx"),
                  os.getenv("LAYA_DEVICE") or None, os.getenv("LAYA_DTYPE", "float16"),
                  os.getenv("LAYA_API_TOKEN"), os.getenv("LAYA_AUTH_DISABLED") == "true")
