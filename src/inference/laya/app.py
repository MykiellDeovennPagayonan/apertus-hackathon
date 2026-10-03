import logging
import secrets
import threading
import time
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from .config import read_config
from .runtime import ModelRuntime
from .schemas import DecisionRequest, RuntimeStatus

logger = logging.getLogger(__name__)

def create_app(config=None, runtime=None):
    config = config or read_config()
    runtime = runtime or ModelRuntime(config.model, config.device, config.dtype)

    @asynccontextmanager
    async def lifespan(app):
        config.validate()
        threading.Thread(target=runtime.load, name="laya-loader", daemon=True).start()
        yield

    app = FastAPI(title="Laya inference", lifespan=lifespan)
    app.state.runtime = runtime

    def require_token(request: Request):
        if config.auth_disabled:
            return
        scheme, _, token = request.headers.get("Authorization", "").partition(" ")
        if scheme.lower() != "bearer" or not config.token or not secrets.compare_digest(token, config.token):
            raise HTTPException(401, "Missing or invalid token", headers={"WWW-Authenticate": "Bearer"})

    @app.middleware("http")
    async def bound_body(request, call_next):
        if request.method == "POST":
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 64000:
                    return JSONResponse({"detail": "Request too large"}, status_code=413)
            request._body = bytes(body)
        return await call_next(request)

    @app.get("/api/status", response_model=RuntimeStatus)
    def status():
        return RuntimeStatus(state=runtime.state, model=config.model,
            auth_required=not config.auth_disabled, device=config.device or "default",
            dtype=config.dtype, load_ms=runtime.load_ms, warmup_ms=runtime.warmup_ms)

    @app.post("/api/decide", dependencies=[Depends(require_token)])
    def decide(request: DecisionRequest):
        if runtime.state != "ready":
            raise HTTPException(503, "Laya is not ready; check /api/status and server logs")
        started = time.perf_counter()
        try:
            result, inference_ms = runtime.predict(request.state,
                {key: q.model_dump(exclude_none=True) for key, q in request.questions.items()})
        except Exception as exc:
            logger.exception("Laya inference failed")
            raise HTTPException(500, "Laya inference failed") from exc
        return {"result": result, "model": config.model, "timing": {
            "inference_ms": round(inference_ms, 3),
            "server_ms": round((time.perf_counter() - started) * 1000, 3)}}
    return app

app = create_app()
