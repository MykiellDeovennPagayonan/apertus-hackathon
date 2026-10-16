# Local Docker deployment and Raspberry Pi notes

The default submission stack builds for the Docker host CPU, with Linux ARM64 and AMD64 as intended targets. The Raspberry Pi target is a Pi 5 with 8 GB RAM, Raspberry Pi OS 64-bit, microSD, active cooling, and one active AI generation. The default stack runs Next.js and Apertus v1.5 8B Q4_K_M through llama.cpp. Multilingual Laya through PyTorch CPU is optional.

## Provision

Install Docker Engine/Desktop with the Compose plugin and GNU Make. No host Python or Node installation is needed for `make run`. On a Pi, use a 64-bit OS and a user authorized to access Docker.

From the **submission repository root**:

```sh
make run
```

Open **http://localhost:43100** on the Docker host. This provisions pinned weights in a Python container, builds the web/Apertus services, and waits for healthy services. Only loopback port 43100 is required. First startup downloads approximately 5.7 GB of weights, including the optional Laya artifacts, plus images and compiles llama.cpp and the web app; leave space for build layers as well.

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

The bundled model is a community text-only adaptation of Apertus v1.5 in GGUF Q4_K_M format. The native MLX helper uses an MXFP4 checkpoint.

ARM64 builds enable ARMv8.2 FP16 and dot-product instructions, supported by the Pi 5's Cortex-A76 and the tested Apple Silicon host. They are not intended for older ARM CPUs lacking these features. The server uses repacked weights without memory mapping, 512-token prompt batches, Q8 K/V caches, and the CPUs available to the container. Saved prompt-state caching is disabled to keep memory use bounded. Set `APERTUS_THREADS` to a positive count to limit CPU use. The model weights and 8192-token context remain unchanged.

Laya provides optional selection advice. It is excluded from the default stack to leave memory for Apertus; authoring uses the existing `apertus` planner mode. To enable the hybrid configuration:

```sh
COMPOSE_PROFILES=laya PLANNER_MODE=hybrid COMPOSITION_DECISION_POLICY=required-laya make run
```

Allow additional memory when enabling the hybrid configuration. To combine it with phone HTTPS, use `COMPOSE_PROFILES=laya,https`. `make stop` stops all project profiles. Run it before switching profiles or rebuilding on a memory-constrained host so previously enabled services do not remain resident during the update.

For a faster build, build ARM64 images on an ARM64 development machine or builder, then transfer them to the Pi with `docker save`/`docker load` and start Compose without `--build`. This avoids competing for the Pi's 8 GB during compilation. The source files remain necessary for bind mounts and provisioning.

## Choose host/LAN inference or Hugging Face

`make run` remains the self-contained CPU deployment. `make run-external` runs the same Docker web app against a separately managed inference endpoint, without downloading weights, building inference images, or waiting for the bundled Apertus server. It requires Docker Compose 2.24.4 or later. Run `make stop` first when switching an existing deployment; this preserves model files and volumes. No automatic provider fallback occurs.

From `track_2b/`, copy `.env.example` to `deploy/raspberry-pi/.env` if needed, then set these values for a local server:

```dotenv
OFFLINE=true
APERTUS_PROVIDER=local
APERTUS_LOCAL_RUNTIME=llamacpp
APERTUS_LOCAL_BASE_URL=http://host.docker.internal:43101/v1
LLM_NAME=apertus-v1.5-8b-text
APERTUS_CONTEXT_TOKENS=8192
```

`LLM_NAME` is required and must match the exact model ID/alias on your server. Set the context capacity to the server's actual configuration, or leave `APERTUS_CONTEXT_TOKENS` blank to omit the application context bound. Leave `LLM_BASE_URL` unset unless deliberately overriding the selected provider's URL.

Choose the runtime appropriate to your environment:

| Local runtime | Environment | Configuration |
| --- | --- | --- |
| llama.cpp | Linux, Windows, macOS; hardware acceleration depends on your server build | `APERTUS_LOCAL_RUNTIME=llamacpp`; use the server alias and its `/v1` URL |
| Ollama | Linux, Windows, macOS | `APERTUS_LOCAL_RUNTIME=ollama`; URL `http://host.docker.internal:11434/v1`; use the installed model name |
| MLX | Apple Silicon macOS | `APERTUS_LOCAL_RUNTIME=mlx`; use the MLX model ID and server `/v1` URL |

Install and start the inference runtime separately, with an Apertus model. For llama.cpp, for example, use a build suitable for your GPU/CPU and start `llama-server -m /path/to/model.gguf --alias apertus-v1.5-8b-text --host 0.0.0.0 --port 43101 --ctx-size 8192`. GPU offload must be configured on that server; the web container neither limits nor enables it. See the [llama.cpp server guide](https://github.com/ggml-org/llama.cpp/tree/master/tools/server) and [Ollama OpenAI-compatible API](https://docs.ollama.com/api/openai-compatibility).

The existing Mac helper can serve MLX using `make run-apertus BIND_HOST=0.0.0.0` after `make -C src/inference setup`. Its default loopback binding is retained for ordinary host development. Set the web configuration's runtime to `mlx` and `LLM_NAME=m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` when using that helper.

`host.docker.internal` points from the web container to the Docker host; the override supplies the Linux host-gateway mapping too. A host server may need to listen on a Docker-reachable interface rather than only loopback. Bind only on a trusted network and restrict access with your firewall; `0.0.0.0` also listens on LAN interfaces. For a different LAN machine, replace the hostname with its private IP or `.local` name. See [Docker host networking guidance](https://docs.docker.com/compose/how-tos/networking/).

Start the web deployment:

```sh
make run-external
```

On Windows without Make, use the equivalent command from `track_2b/`:

```sh
docker compose -f deploy/raspberry-pi/compose.yaml -f deploy/raspberry-pi/compose.external.yaml up --build --detach --wait --wait-timeout 600
```

To choose Hugging Face instead, edit the same `.env` and rerun `make run-external`:

```dotenv
OFFLINE=false
APERTUS_PROVIDER=huggingface
APERTUS_HF_BASE_URL=https://router.huggingface.co/v1
LLM_NAME=your-served-apertus-model-id
HF_TOKEN=your-private-token
APERTUS_CONTEXT_TOKENS=
```

Use a model actually available from your Hugging Face provider or dedicated endpoint. Keep the token out of Git. This mode permits hosted inference while retaining browser-only saves and disabling accounts/community. `OFFLINE=true` explicitly rejects Hugging Face. These settings apply to text inference; optional Laya remains separately managed through the existing `laya` profile. Web readiness does not prove the external model is reachable: verify its `/v1/models` endpoint from the web container and generate a lesson after switching.

`make stop` stops this Docker deployment, but does not stop inference processes you started separately. The full-stack benchmark below requires bundled Apertus and is not an external-provider benchmark.

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

With the web and Apertus services healthy and no other AI requests in progress:

```sh
python3 deploy/raspberry-pi/benchmark.py --runs 3
```

The benchmark refuses to run unless Apertus and the web app are healthy and the web app reports offline mode. When Laya is running, it also requires a healthy Laya service and records its startup information. Requests run sequentially through the application's generation API, with a mobile viewport, and use the same generation protocol as the UI.

Evidence is saved under ignored `deploy/raspberry-pi/results/<UTC timestamp>/`:

- Full generated responses, success count, and end-to-end latency.
- Progress-event arrival times; these are approximate stage observations, not exact internal per-call timings.
- Laya startup/warmup timings and llama.cpp cumulative prompt/token-generation metrics before and after the run.
- Container CPU/memory snapshots, host memory and swap counters, thermal/throttling data when available, and final container states/image IDs.

The benchmark records each generation outcome and applies the application's validators to accepted results. Review the saved report alongside the browser checks below.

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

Defaults are 8192 context tokens, automatic Apertus CPU thread selection, one inference slot, a twenty-minute overall planner deadline, and ten minutes per model stage. The overall deadline allows sequential CPU authoring stages to finish; it is not a latency target. Optional Laya uses one thread. Recheck the context capacity against actual planner inputs before reducing it; increasing it raises memory requirements. Do not change swap configuration automatically.

## Local verification

```sh
cd src/web
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Run `.venv-laya/bin/python -m pytest tests/test_laya_api.py` from `src/inference` for the wrapper tests. CPU weights require the Docker image: its wrapper is installed as `laya_service`, avoiding a name collision with upstream's `laya` library. The existing local MLX `python -m laya` entry point remains available.

Before the demo, manually check loading the app offline, interacting with a premade recipe, and save/reload on the target device.

## Verified local inference

The production Docker web image was built and tested against a separately managed MLX inference server on an Apple M5 with 24 GiB RAM. MLX used the Mac GPU and loaded the Apertus model from the local cache. The web container reached the host server through `host.docker.internal`, with offline mode enabled and account features disabled.

The generation API successfully created a projectile simulation containing launch-speed and angle controls and a trajectory view. This check exercised the Docker web app and native local inference together, with no bundled inference container or hosted provider involved.

This live check used MLX on Apple Silicon. The setup instructions above also describe configuring llama.cpp, Ollama, and Hugging Face endpoints for your environment.
