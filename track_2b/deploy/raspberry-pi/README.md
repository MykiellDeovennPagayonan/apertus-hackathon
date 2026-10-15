# Local Docker deployment and Raspberry Pi notes

The default submission stack builds for the Docker host CPU, with Linux ARM64 and AMD64 as intended targets. AMD64 execution is not yet verified. The Raspberry Pi target is a Pi 5 with 8 GB RAM, Raspberry Pi OS 64-bit, microSD, active cooling, and one active AI generation. This stack runs Next.js, Apertus v1.5 8B Q4_K_M through llama.cpp, and multilingual Laya through PyTorch CPU. Performance on the Pi must be measured before calling this deployment usable.

## Provision

Install Docker Engine/Desktop with the Compose plugin and GNU Make. No host Python or Node installation is needed for `make run`. On a Pi, use a 64-bit OS and a user authorized to access Docker.

From the **submission repository root**:

```sh
make run
```

Open **http://localhost:43100** on the Docker host. This provisions pinned weights in a Python container, builds the web/Apertus/Laya services, and waits for healthy services. Only loopback port 43100 is required. First startup downloads approximately 5.7 GB of weights plus images and compiles llama.cpp and the web app; leave space for build layers as well.

For the advanced commands throughout this guide, first enter `track_2b/` from the submission repository root:

```sh
cd track_2b
```

All subsequent paths and Compose commands are relative to `track_2b/`. The same `make run` and `make stop` commands also work there. Optional configuration lives in `deploy/raspberry-pi/.env`; copy `.env.example` there only when changing defaults. Preserve `deploy/raspberry-pi/models` and named volumes across updates.

Inspect configuration and services with:

```sh
docker compose -f deploy/raspberry-pi/compose.yaml config --quiet
docker compose -f deploy/raspberry-pi/compose.yaml ps
```

The first build and model downloads need internet access. Subsequent startup and inference use local artifacts. The provisioner pins repository revisions and file SHA-256 hashes, checks GGUF architecture/quantization/template metadata, and normalizes Laya's tokenizer configuration before mounting it read-only. It does not silently replace a missing chat template. Review the extracted `models/apertus/embedded-chat-template.jinja` when changing models.

The source model is a community text-only adaptation of Apertus v1.5. Its quantization differs from the existing MLX MXFP4 checkpoint. Neither exact output equivalence nor Pi speed is implied.

For a faster build, build ARM64 images on an ARM64 development machine or builder, then transfer them to the Pi with `docker save`/`docker load` and start Compose without `--build`. This avoids competing for the Pi's 8 GB during compilation. The source files remain necessary for bind mounts and provisioning.

## Phone access and HTTPS

Caddy is optional. The default localhost demo does not reserve ports 80 or 443. From `track_2b/`, copy the environment example if needed and configure the hostname:

```sh
cp -n deploy/raspberry-pi/.env.example deploy/raspberry-pi/.env
```

Edit `PI_HOSTNAME` in `.env` to a stable hostname that every phone can resolve to the Pi. `apertus.local` requires that hostname to be configured on the Pi and supported by the local network. A stable reserved LAN IP may also be used as the hostname value. A Compose variable does not configure DNS or rename the Pi.

After configuring the hostname, start the proxy (ports 80 and 443 must be available):

```sh
COMPOSE_PROFILES=https make run
```

Open `https://<PI_HOSTNAME>` on the phone. Caddy uses a local certificate authority; install and trust its public root certificate on every client device. Export it with:

```sh
docker compose -f deploy/raspberry-pi/compose.yaml cp proxy:/data/caddy/pki/authorities/local/root.crt /tmp/apertus-local-root.crt
```

Transfer that public certificate through your normal device-management method. iOS additionally requires enabling full trust for the installed root in Certificate Trust Settings ([Apple instructions](https://support.apple.com/en-us/102390)). Preserve the `caddy-data` volume so the CA remains stable. Never distribute the CA private key.

Verify `window.isSecureContext` and `Boolean(navigator.locks)` in the phone browser. Merely bypassing a certificate warning does not establish the trusted deployment required by local composition saves. The web port at `127.0.0.1:43100` is for Pi-local checks and benchmarking; phones use HTTPS.

## Offline behavior

Compose sets server-side `OFFLINE=true`; no build-time browser flag is needed. The server supplies the account-feature setting to the frontend at request time. Online deployments continue to default to `OFFLINE=false` when the variable is absent.

- Experiment, composition, and draft saves use each device's browser storage.
- Authentication, account libraries, community routes, and MongoDB access are disabled, even if database credentials are present.
- Cloud LLM/decision providers and public inference endpoint URLs are rejected.
- Inference services share an internal Docker network. Laya uses offline model loading.
- Prepared simulations remain available. Phones still need to reach the Pi; this is not a PWA cache implementation.
- Guest agent runs remain temporary process state and expire on web restart.

Browser saves are independent per phone and per origin. Keep the hostname/protocol/port stable. Download recipe JSON regularly; Pi model volumes do not back up phone data. Pi-side shared storage and cross-device synchronization are not implemented.

For hosted inference with browser-only saves, use `OFFLINE=false` and `ACCOUNT_FEATURES_ENABLED=false`. This disables login, community, publishing, cloud saves, and MongoDB access without restricting the configured inference provider. The account flag defaults to enabled online; `OFFLINE=true` always disables it. Repair memory remains controlled separately by `REPAIR_MEMORY_MODE`.

## Full-stack benchmark

With all three application services healthy and no other AI requests in progress:

```sh
python3 deploy/raspberry-pi/benchmark.py --runs 3
```

The benchmark refuses to run unless Apertus, Laya, and the web app are healthy and the web app reports offline mode. Compose requires actual Laya selection for composition. Requests run sequentially through the application's generation API, with a mobile viewport, and use the same generation protocol as the UI.

Evidence is saved under ignored `deploy/raspberry-pi/results/<UTC timestamp>/`:

- Full generated responses, success count, and end-to-end latency.
- Progress-event arrival times; these are approximate stage observations, not exact internal per-call timings.
- Laya startup/warmup timings and llama.cpp cumulative prompt/token-generation metrics before and after the run.
- Container CPU/memory snapshots, host memory and swap counters, thermal/throttling data when available, and final container states/image IDs.

Nonzero exit means at least one generation failed. Inspect its result before changing settings. An unsupported request does not count as a successful generation. The application's validators check accepted generation results; the benchmark does not prove browser rendering or learning quality.

Cold-load time is visible through Laya status and service startup logs; llama.cpp metrics are cumulative. No maximum-latency acceptance target is set. Do not use sustained swap as proof that the stack fits comfortably on 8 GB. Check for OOM exits, service restarts, and thermal throttling across repeated runs.

Complete these manual checks on a phone:

1. Open prepared 2D and 3D lessons, operate controls, and inspect rendering while an AI request runs.
2. Generate a composition; save, reopen, and export it.
3. Restart the stack; reopen the saved lesson in the same browser.
4. Disconnect internet while keeping local Wi-Fi/Pi access; repeat generation and saving.
5. Open a second phone; confirm its library is independent.

## Operation

```sh
docker compose -f deploy/raspberry-pi/compose.yaml logs --tail 100 web apertus laya
docker compose -f deploy/raspberry-pi/compose.yaml --profile https stop
docker compose -f deploy/raspberry-pi/compose.yaml up -d --wait --wait-timeout 600
```

To restart phone HTTPS as well, add `--profile https` before `up`. `make stop` stops both core services and the optional proxy.

Log rotation is bounded to reduce microSD writes. Stop/start preserves model mounts and named volumes. Avoid removing volumes when updating. Models, certificate state, and phone exports are different backup responsibilities.

Initial benchmark defaults are 8192 context tokens, three Apertus CPU threads, one Laya thread, one inference slot, and ten-minute generation deadlines. These are bounded starting settings, not verified performance values. Recheck the context capacity against actual planner inputs before reducing it; increasing it raises memory requirements. Do not change swap configuration automatically.

## Local verification

```sh
cd src/web
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Run `.venv-laya/bin/python -m pytest tests/test_laya_api.py` from `src/inference` for the wrapper tests. CPU weights require the Docker image: its wrapper is installed as `laya_service`, avoiding a name collision with upstream's `laya` library. The existing local MLX `python -m laya` entry point remains available.

Before the demo, manually check loading the app offline, interacting with a premade recipe, and save/reload on the target device.

## Earlier submission-copy verification

The following records checks performed on the separate submission copy before this repository was restructured. It is historical evidence, not a fresh Docker verification of this refactor. The model Dockerfile here retains its original `GGML_NATIVE=OFF` build; experimental streaming transport and ARM-specific compiler changes have not been imported.

On 15 October 2026, the submission's native ARM64 images built successfully and root-level `make run` provisioned the pinned weights and brought web, Apertus and Laya healthy on an Apple Silicon Docker host. The optional HTTPS profile started successfully; an HTTPS health request verified Caddy using its exported public CA certificate. The proxy was then stopped, leaving the three-service localhost stack.

A headless browser check of the production web image passed prepared projectile interaction, local library save, resume/reload of authored defaults, JSON export and the projects listing without browser errors. Four benchmark publication tests and eight evaluator tests passed. Rebuilding the seven-model statistics reproduced the existing JSON data byte-for-byte. Current documentation links resolve; original benchmark attachment links retain the historical paths explained in the [evidence guide](../../docs/agent-only/benchmark/README.md).

The real CPU generation smoke **failed** after 366 seconds for “Create a projectile experiment with launch speed and launch angle controls and a trajectory view.” The API returned a retryable “Cannot reach local llama.cpp” error while the model container remained healthy. The initial small model call took about 63 seconds; the next call was cancelled after roughly five minutes. The Docker VM reported 7.65 GiB of memory and was sharing resources with other workloads; this was a functional smoke check, not a controlled performance benchmark. The cause of the upstream failure has not been established. End-to-end AI generation is not passing on that tested setup and must be resolved/rechecked before treating this stack as judge-ready.

The full web contract runner is **not green**: it reaches `scripts/recipes/verify-contract.cjs:366` and reads `candidates.requiredCapabilities.includes(...)`, although `assemblyCandidates()` now returns only `ranked` and `cards`. Neither the application function nor that test was changed by this deployment/documentation cleanup. Database checks were skipped because no disposable repair-memory database was configured.

CPU AMD64 execution, Pi latency/memory/thermals, disconnected operation, and phone/browser certificate trust remain unverified. The recorded campaign used MLX on a Mac, rather than this Docker GGUF stack. Repeat the release flow on the intended judging machine; these local checks do not establish scientific accuracy or classroom suitability.
