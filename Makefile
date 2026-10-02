.DEFAULT_GOAL := dev

PNPM ?= pnpm
WEB_DIR := src/web

.PHONY: install dev run build start

install:
	$(PNPM) --dir $(WEB_DIR) install --frozen-lockfile

# `make` or `make run` installs dependencies and starts the development server.
dev: install
	$(PNPM) --dir $(WEB_DIR) dev

run: dev

build: install
	$(PNPM) --dir $(WEB_DIR) build

# Build the production app with `make build` before running `make start`.
start:
	$(PNPM) --dir $(WEB_DIR) start
