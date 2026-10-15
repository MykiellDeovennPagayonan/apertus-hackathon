"""Loopback-only, pinned MiniLM embeddings for local repair-memory development."""

import argparse
from pathlib import Path
from typing import Literal

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from tokenizers import Tokenizer
import uvicorn

MODEL = "sentence-transformers/all-MiniLM-L6-v2"
REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41/onnx-f32-meanpool-v1"
ROOT = Path(__file__).resolve().parent / "models"


class EmbeddingInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: Literal["sentence-transformers/all-MiniLM-L6-v2"]
    input: str = Field(min_length=1, max_length=2400)
    encoding_format: Literal["float"] = "float"


def load_encoder():
    tokenizer = Tokenizer.from_file(str(ROOT / "tokenizer.json"))
    tokenizer.enable_truncation(max_length=256)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(
        str(ROOT / "onnx/model.onnx"), options, providers=["CPUExecutionProvider"]
    )

    def encode(text):
        tokens = tokenizer.encode(text)
        inputs = {
            "input_ids": np.array([tokens.ids], dtype=np.int64),
            "attention_mask": np.array([tokens.attention_mask], dtype=np.int64),
            "token_type_ids": np.array([tokens.type_ids], dtype=np.int64),
        }
        output = session.run(None, {i.name: inputs[i.name] for i in session.get_inputs()})[0]
        mask = inputs["attention_mask"][..., None]
        vector = (output * mask).sum(axis=1)[0] / mask.sum()
        norm = np.linalg.norm(vector)
        if vector.shape != (384,) or not np.isfinite(vector).all() or norm <= 0:
            raise ValueError("Invalid model output")
        return vector / norm

    return encode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encode = load_encoder()
    if args.check:
        first = encode("Return numeric values as JSON numbers.")
        similar = encode("Use JSON numbers instead of numeric strings.")
        unrelated = encode("A cat is sleeping on a sofa.")
        assert len(first) == 384 and np.isclose(np.linalg.norm(first), 1)
        assert np.allclose(first, encode("Return numeric values as JSON numbers."))
        assert float(first @ similar) > float(first @ unrelated)
        print("384-dimensional normalized embeddings: determinism and similarity passed.")
        return
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def bound_request(request: Request, call_next):
        if len(await request.body()) > 16384:
            from fastapi.responses import JSONResponse
            return JSONResponse({"error": "Request too large"}, status_code=413)
        return await call_next(request)

    @app.get("/health")
    def health():
        return {"model": MODEL, "revision": REVISION, "dimensions": 384}

    @app.post("/v1/embeddings")
    def embeddings(payload: EmbeddingInput):
        try:
            vector = encode(payload.input)
        except ValueError as error:
            raise HTTPException(503, "Invalid model output") from error
        return {"model": MODEL, "data": [{"index": 0, "embedding": vector.tolist()}]}

    uvicorn.run(app, host="127.0.0.1", port=43104, log_level="warning")


if __name__ == "__main__":
    main()
