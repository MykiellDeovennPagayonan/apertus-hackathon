.DEFAULT_GOAL := dev

PNPM ?= pnpm
WEB_DIR := src/web
WEB_PORT ?= 43100
BENCHMARK_URL ?= http://localhost:$(WEB_PORT)
APERTUS_PORT ?= 43101
LAYA_PORT ?= 43102

.PHONY: install dev run run-web run-realistic run-apertus run-laya stop stop-web stop-apertus stop-laya build start benchmark benchmark-model eval

install:
	$(PNPM) --dir $(WEB_DIR) install --frozen-lockfile

# Run against an already-running app; no install or build prerequisite.
benchmark:
	BENCHMARK_URL="$(BENCHMARK_URL)" npm --prefix src/playwright run benchmark

# Owns an isolated web process; inference services remain separately managed.
benchmark-model:
	node --env-file-if-exists=src/web/.env.local src/playwright/run-model.mjs "$(MODEL)"

eval:
	node src/eval/server.mjs

# `make`, `make run`, or `make run-web` installs dependencies and starts the
# development server.
run-web: install
	$(PNPM) --dir $(WEB_DIR) dev --port $(WEB_PORT)

dev: run-web

run: run-web

run-apertus:
	$(MAKE) -C src/inference run-apertus PORT=$(APERTUS_PORT)

run-laya:
	$(MAKE) -C src/inference run-laya LAYA_PORT=$(LAYA_PORT)

stop-web:
	@pids="$$( (lsof -t $(WEB_DIR)/.next/dev/lock 2>/dev/null; lsof -tiTCP:$(WEB_PORT) -sTCP:LISTEN 2>/dev/null) | sort -u)"; \
	if [ -n "$$pids" ]; then kill $$pids && echo "Stopped this project's web server (PID(s): $$pids)."; else echo "This project's web server is not running."; fi

stop-apertus:
	@pids="$$(lsof -tiTCP:$(APERTUS_PORT) -sTCP:LISTEN 2>/dev/null)"; \
	if [ -n "$$pids" ]; then kill $$pids && echo "Stopped Apertus on port $(APERTUS_PORT)."; else echo "Apertus is not running on port $(APERTUS_PORT)."; fi

stop-laya:
	@pids="$$(lsof -tiTCP:$(LAYA_PORT) -sTCP:LISTEN 2>/dev/null)"; \
	if [ -n "$$pids" ]; then kill $$pids && echo "Stopped Laya on port $(LAYA_PORT)."; else echo "Laya is not running on port $(LAYA_PORT)."; fi

stop: stop-web stop-apertus stop-laya

build: install
	$(PNPM) --dir $(WEB_DIR) build

# Build the production app with `make build` before running `make start`.
start:
	$(PNPM) --dir $(WEB_DIR) start --port $(WEB_PORT)

# Requires separately running local Apertus and Laya services.
run-realistic: install
	PLANNER_MODE=hybrid DECISION_PROVIDER=laya LLM_PROVIDER=apertus COMPOSITION_DECISION_POLICY=required-laya DECISION_TIMEOUT_MS=20000 $(PNPM) --dir $(WEB_DIR) dev --port $(WEB_PORT)
