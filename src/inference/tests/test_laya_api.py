import pytest
from fastapi.testclient import TestClient
from laya.app import create_app
from laya.config import Config
from laya.runtime import ModelRuntime

@pytest.fixture
def service():
    config = Config("test-model", None, "float16")
    runtime = ModelRuntime(config.model, config.device, config.dtype)
    runtime.state = "ready"
    runtime.predict = lambda state, questions: ({"answers": {"action": {"choice": "pause"}}}, 1.25)
    return TestClient(create_app(config, runtime)), runtime

payload = {"state": {"request": "pause"}, "questions": {"action": {
    "type": "choice", "instructions": "Choose", "criteria": {"pause": "Pause", "unclear": "Unclear"}}}}
def test_open_response(service):
    client, _ = service
    response = client.post("/api/decide", json=payload)
    assert response.status_code == 200
    assert response.json()["result"]["answers"]["action"]["choice"] == "pause"
    assert response.json()["timing"]["inference_ms"] == 1.25
    assert response.json()["model"] == "test-model"

@pytest.mark.parametrize("state", ["loading", "error"])
def test_readiness(service, state):
    client, runtime = service
    runtime.state = state
    runtime.error = "secret provider information"
    status = client.get("/api/status").json()
    assert status["state"] == state
    assert status["auth_required"] is False
    response = client.post("/api/decide", json=payload)
    assert response.status_code == 503
    assert "secret" not in response.text

def test_validation_and_bounds(service):
    client, _ = service
    assert client.post("/api/decide", json={"state": "x", "questions": {}}).status_code == 422
    bad = {"state": "x", "questions": {"q": {"type": "choice", "instructions": "Choose", "criteria": ["one"]}}}
    assert client.post("/api/decide", json=bad).status_code == 422
    assert client.post("/api/decide", content=b"x" * 64001).status_code == 413

def test_failure_is_sanitized(service):
    client, runtime = service
    def fail(*args):
        raise RuntimeError("secret")
    runtime.predict = fail
    response = client.post("/api/decide", json=payload)
    assert response.status_code == 500
    assert "secret" not in response.text

def test_config_validation():
    config = Config("test", None, "float16")
    config.validate()
    runtime = ModelRuntime("test", None, "float16")
    client = TestClient(create_app(config, runtime))
    assert client.post("/api/decide", json=payload).status_code == 503
    with pytest.raises(RuntimeError):
        Config("test", "invalid", "float16").validate()
