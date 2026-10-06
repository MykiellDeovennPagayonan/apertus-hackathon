import os
import uvicorn

if __name__ == "__main__":
    uvicorn.run("laya.app:app", host=os.getenv("LAYA_HOST", "127.0.0.1"),
                port=int(os.getenv("LAYA_PORT", "8000")))
