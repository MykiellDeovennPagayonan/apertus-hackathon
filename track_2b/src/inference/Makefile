.DEFAULT_GOAL := help
PYTHON ?= python3.12
MODEL ?= m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4
PORT ?= 43101

.PHONY: help setup run run-apertus setup-laya run-laya smoke-laya test-laya smoke planner-smoke
help:
	@printf '%s\n' 'make setup  Install local inference (Apple Silicon, Python 3.12)' 'make run    Serve Apertus on loopback port 43101' 'make smoke  Check a running model' 'make setup-laya  Install Laya in .venv-laya' 'make run-laya  Serve open local Laya on loopback port 43102' 'make smoke-laya  Check Laya readiness' 'make test-laya  Run service tests'
setup:
	@test "$$(uname -s)" = Darwin && test "$$(uname -m)" = arm64 || { printf '%s\n' 'MLX requires an Apple Silicon Mac. Use hosted inference on other devices.'; exit 1; }
	@test -x .venv/bin/python || $(PYTHON) -m venv .venv
	.venv/bin/python -m pip install -r requirements.txt
run:
	@test -x .venv/bin/python || { printf '%s\n' 'Run make setup first.'; exit 1; }
	.venv/bin/python serve_apertus.py --model "$(MODEL)" --host 127.0.0.1 --port "$(PORT)" --max-tokens 1024 --temp 0.2 --top-p 0.9
smoke:
	curl --fail-with-body --silent --show-error --max-time 120 "http://127.0.0.1:$(PORT)/v1/chat/completions" -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Say hello in one sentence."}],"max_tokens":512,"stream":false}'

# Requires this inference server; unit tests use a separate deterministic provider.
planner-smoke:
	cd ../web && GENERATION_RUNS=1 pnpm test:generation:live

run-apertus: run

LAYA_PORT ?= 43102
setup-laya:
	@test -x .venv-laya/bin/python || $(PYTHON) -m venv .venv-laya
	.venv-laya/bin/python -m pip install -r requirements-laya-dev.txt
run-laya:
	@test -x .venv-laya/bin/python || { printf '%s\n' 'Run make setup-laya first.'; exit 1; }
	LAYA_PORT=$(LAYA_PORT) .venv-laya/bin/python -m laya
smoke-laya:
	curl --fail-with-body --silent --show-error --max-time 5 "http://127.0.0.1:$(LAYA_PORT)/api/status"
test-laya:
	.venv-laya/bin/python -m pytest tests -q
