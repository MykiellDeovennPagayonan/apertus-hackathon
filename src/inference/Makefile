.DEFAULT_GOAL := help
PYTHON ?= python3.12
MODEL ?= m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4
PORT ?= 8080

.PHONY: help setup run smoke planner-smoke
help:
	@printf '%s\n' 'make setup  Install local inference (Apple Silicon, Python 3.12)' 'make run    Serve Apertus on loopback port 8080' 'make smoke  Check a running model'
setup:
	@test "$$(uname -s)" = Darwin && test "$$(uname -m)" = arm64 || { printf '%s\n' 'MLX requires an Apple Silicon Mac. Use hosted inference on other devices.'; exit 1; }
	@test -x .venv/bin/python || $(PYTHON) -m venv .venv
	.venv/bin/python -m pip install -r requirements.txt
run:
	@test -x .venv/bin/python || { printf '%s\n' 'Run make setup first.'; exit 1; }
	.venv/bin/python -m mlx_lm server --model "$(MODEL)" --host 127.0.0.1 --port "$(PORT)" --max-tokens 1024 --temp 0.2 --top-p 0.9
smoke:
	curl --fail-with-body --silent --show-error --max-time 120 "http://127.0.0.1:$(PORT)/v1/chat/completions" -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Say hello in one sentence."}],"max_tokens":512,"stream":false}'

# Requires this inference server; unit tests use a separate deterministic provider.
planner-smoke:
	cd ../web && pnpm test:apertus:live
