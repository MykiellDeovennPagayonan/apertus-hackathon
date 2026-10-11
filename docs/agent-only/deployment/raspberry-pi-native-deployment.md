# Raspberry Pi deployment without Docker

Date: 2026-10-11
Status: instructions based on the current working tree; not yet deployed or benchmarked on a Pi.

Target: Raspberry Pi 5, 8 GB RAM, active cooling, microSD, Raspberry Pi OS Lite 64-bit. Run Apertus with llama.cpp on CPU, Laya with PyTorch on CPU, and the production Next.js server directly on Linux. systemd manages the processes; Caddy provides HTTPS for phones.

This is an alternative to the [Docker deployment](../../../deploy/raspberry-pi/README.md). It reuses its pinned models, Python dependencies, and application configuration.

## What to expect

Removing Docker simplifies this deployment, but does not provide the Mac's GPU acceleration. Our Mac test used Apple Metal: one 113-input-token / 128-output-token request took 12.02 seconds with MLX and 13.67 seconds with native llama.cpp. Different quantizations were used. Those timings do not predict Pi performance or full application latency.

The earlier Docker test used CPU inference, several sequential application calls, and experienced swapping. We did not isolate Docker overhead. A native Pi build can target its actual CPU instead of the existing generic container build; any speed improvement must be measured.

The 5.06 GB Apertus model plus Laya, context cache, Next.js, and the OS may still pressure 8 GB RAM. Start with one generation at a time and measure the whole application before deciding it fits.

## 1. Prepare the Pi and copy the application

Run provisioning commands on the Pi unless a block explicitly says otherwise. This guide assumes Python 3.11 or 3.12; the container used Python 3.12. Do not install the Mac MLX requirements on the Pi. If the OS has Python 3.13 or newer, provide Python 3.12 separately and use that executable for the virtual environment below: the pinned NumPy 1.26.4 dependency does not support Python 3.13.

```sh
uname -m                         # must report aarch64
python3 --version                # use 3.11 or 3.12 for the pinned CPU dependencies
free -h
df -h /
sudo apt-get update
sudo apt-get install -y build-essential cmake git curl ca-certificates \
  python3-venv python3-pip rsync ripgrep jq sysstat xz-utils
sudo install -d -o "$USER" -g "$(id -gn)" /srv/apertus
```

Reserve space beyond the approximately 5.7 GB of model files for Python/PyTorch, Node dependencies, source, and build output. Build before launching inference so compilation does not compete with the models for memory.

Copy the **current working tree**, including the uncommitted deployment changes. Cloning the last commit alone may omit the llama.cpp integration and offline mode. For example, run this from the repository root **on the Mac**, replacing the SSH destination:

```sh
rsync -av \
  --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='.venv*' --exclude='__pycache__' \
  --exclude='.env*' --exclude='.aws' --exclude='.codex' --exclude='.agents' \
  --exclude='deploy/raspberry-pi/results' \
  ./ pi@PI_ADDRESS:/srv/apertus/
```

This also copies the existing models, if present, avoiding another download. Do not copy the Mac's virtual environments or compiled binaries. Keep a record of the source revision and uncommitted changes used for deployment.

## 2. Install Node and build the web server

Use the same Node release as the existing web image, with the Linux ARM64 archive. These commands install it under `/usr/local/lib`, without replacing the OS Node package:

```sh
mkdir -p /tmp/apertus-node
cd /tmp/apertus-node
curl -fLO https://nodejs.org/dist/v22.21.0/node-v22.21.0-linux-arm64.tar.xz
curl -fLO https://nodejs.org/dist/v22.21.0/SHASUMS256.txt
rg ' node-v22\.21\.0-linux-arm64\.tar\.xz$' SHASUMS256.txt > node.sha256
sha256sum --check node.sha256
# Continue only after the checksum succeeds.
sudo tar -xJf node-v22.21.0-linux-arm64.tar.xz -C /usr/local/lib
export PATH=/usr/local/lib/node-v22.21.0-linux-arm64/bin:$PATH
node --version
sudo /usr/local/lib/node-v22.21.0-linux-arm64/bin/node \
  /usr/local/lib/node-v22.21.0-linux-arm64/lib/node_modules/npm/bin/npm-cli.js \
  install --global pnpm@10.14.0

cd /srv/apertus/src/web
pnpm install --frozen-lockfile
OFFLINE=true NEXT_TELEMETRY_DISABLED=1 pnpm build
mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/
cp -a public .next/standalone/
```

The repository already enables standalone output. Its `server.js` needs the copied static and public assets, as described in the [Next.js standalone documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output). Use a clean deployment tree without development `.env.local` files; runtime settings are supplied below.

## 3. Build llama.cpp on the Pi

Pin the same revision as the current deployment. Build on the Pi so `GGML_NATIVE=ON` targets its CPU. Do not transfer a Mac binary or a native build compiled for a different ARM CPU.

```sh
sudo install -d -o "$USER" -g "$(id -gn)" /srv/apertus-native
cd /srv/apertus-native
git init llama.cpp
cd llama.cpp
git remote add origin https://github.com/ggml-org/llama.cpp.git
git fetch --depth=1 origin 62a6f74bab748b1755f4cd8dfc0871caf865c6c8
git checkout --detach FETCH_HEAD
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
  -DGGML_NATIVE=ON -DGGML_OPENMP=ON \
  -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF \
  -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_SERVER=ON \
  -DLLAMA_BUILD_UI=OFF -DLLAMA_USE_PREBUILT_UI=OFF \
  -DBUILD_SHARED_LIBS=OFF
cmake --build build --target llama-server -j 2
build/bin/llama-server --version
```

The existing Dockerfile disables native CPU targeting and OpenMP; this build enables both. Record the compiler and CPU feature detection shown by CMake. General build reference: [llama.cpp build instructions](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md). Keep GPU offloading disabled for this CPU deployment; Pi GPU acceleration is outside this guide.

## 4. Prepare models and Laya

Verify copied models first. If any are missing, run the provisioner without `--verify-only` while internet is available; it downloads pinned artifacts and verifies their hashes.

```sh
cd /srv/apertus
python3 deploy/raspberry-pi/provision_models.py --verify-only
# Only if models are missing or invalid:
# python3 deploy/raspberry-pi/provision_models.py

python3 -m venv /srv/apertus-native/laya-venv
/srv/apertus-native/laya-venv/bin/python -m pip install \
  -r /srv/apertus/src/inference/requirements-laya-cpu.txt
/srv/apertus-native/laya-venv/bin/python -m pip check
mkdir -p /srv/apertus-native/laya_service /srv/apertus-native/cache
cp -a /srv/apertus/src/inference/laya/. /srv/apertus-native/laya_service/
```

The HTTP wrapper and upstream CPU library are both originally named `laya`. Copying the wrapper as `laya_service`, and launching it from `/srv/apertus-native`, prevents it from shadowing the upstream library. Do not run `python -m laya` from `src/inference` for the CPU backend. The current `__main__.py` supports the renamed package.

The requirements pin the upstream Laya source revision and CPU dependency versions. The ARM64 installation must succeed before proceeding; do not silently substitute MLX or change dependency versions to hide a wheel compatibility failure.

## 5. Create runtime configuration

Create a service account and give it access to the deployment files:

```sh
sudo useradd --system --user-group --home-dir /srv/apertus-native \
  --no-create-home --shell /usr/sbin/nologin apertus
sudo chown -R apertus:apertus /srv/apertus /srv/apertus-native
sudo install -d -m 0755 /etc/apertus
sudo tee /etc/apertus/web.env > /dev/null <<'EOF'
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
HOSTNAME=127.0.0.1
PORT=43100
OFFLINE=true
LLM_PROVIDER=apertus
APERTUS_PROVIDER=local
APERTUS_LOCAL_RUNTIME=llamacpp
APERTUS_LOCAL_BASE_URL=http://127.0.0.1:43101/v1
APERTUS_LOCAL_MODEL=apertus-v1.5-8b-text
APERTUS_CONTEXT_TOKENS=8192
APERTUS_STRUCTURED_OUTPUT=auto
APERTUS_TIMEOUT_MS=600000
APERTUS_MAX_TOKENS=1024
APERTUS_MAX_CONCURRENT_REQUESTS=1
PLANNER_TIMEOUT_MS=600000
PLANNER_MAX_CONCURRENT_REQUESTS=1
PLANNER_MODE=hybrid
COMPOSITION_DECISION_POLICY=required-laya
DECISION_PROVIDER=laya
LAYA_BASE_URL=http://127.0.0.1:43102
DECISION_TIMEOUT_MS=30000
NEXTAUTH_URL=https://apertus.local
EOF
sudo tee /etc/apertus/laya.env > /dev/null <<'EOF'
PYTHONUNBUFFERED=1
USE_TF=0
HF_HUB_OFFLINE=1
TRANSFORMERS_OFFLINE=1
HF_HOME=/srv/apertus-native/cache
LAYA_BACKEND=torch
LAYA_DEVICE=cpu
LAYA_DTYPE=float32
LAYA_MODEL=/srv/apertus/deploy/raspberry-pi/models/laya
LAYA_HOST=127.0.0.1
LAYA_PORT=43102
LAYA_THREADS=1
OMP_NUM_THREADS=1
MKL_NUM_THREADS=1
EOF
```

Use your actual stable hostname in `NEXTAUTH_URL` and Caddy below. Keep context at 8192 initially, matching the application configuration's minimum. Reducing only the llama.cpp context can break requests that the web application expects to fit. These concurrency settings serialize calls within their respective paths; for the initial benchmark, use only one client generation and no simultaneous agent workloads.

## 6. Manage the three processes with systemd

Create these units:

```sh
sudo tee /etc/systemd/system/apertus-llama.service > /dev/null <<'EOF'
[Unit]
Description=Apertus llama.cpp CPU server
After=network.target

[Service]
User=apertus
Group=apertus
WorkingDirectory=/srv/apertus-native
ExecStart=/srv/apertus-native/llama.cpp/build/bin/llama-server --model /srv/apertus/deploy/raspberry-pi/models/apertus/apertus-v1.5-8b-text-q4_k_m.gguf --alias apertus-v1.5-8b-text --host 127.0.0.1 --port 43101 --ctx-size 8192 --threads 3 --threads-batch 3 --parallel 1 --n-gpu-layers 0 --jinja --metrics
Restart=on-failure
RestartSec=10
TimeoutStopSec=30
CPUAccounting=true
MemoryAccounting=true

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/apertus-laya.service > /dev/null <<'EOF'
[Unit]
Description=Laya CPU decision server
After=network.target

[Service]
User=apertus
Group=apertus
WorkingDirectory=/srv/apertus-native
EnvironmentFile=/etc/apertus/laya.env
ExecStart=/srv/apertus-native/laya-venv/bin/python -m laya_service
Restart=on-failure
RestartSec=10
TimeoutStopSec=30
CPUAccounting=true
MemoryAccounting=true

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/apertus-web.service > /dev/null <<'EOF'
[Unit]
Description=Apertus production web application
Wants=apertus-llama.service apertus-laya.service
After=network.target apertus-llama.service apertus-laya.service

[Service]
User=apertus
Group=apertus
WorkingDirectory=/srv/apertus/src/web/.next/standalone
EnvironmentFile=/etc/apertus/web.env
ExecStart=/usr/local/lib/node-v22.21.0-linux-arm64/bin/node server.js
Restart=on-failure
RestartSec=10
TimeoutStopSec=30
CPUAccounting=true
MemoryAccounting=true

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl start apertus-llama apertus-laya
```

Wait for both models to load and Laya to finish warmup:

```sh
curl --fail http://127.0.0.1:43101/health
curl --fail http://127.0.0.1:43102/api/status | jq -e '.state == "ready"'
sudo journalctl -u apertus-llama -u apertus-laya -n 40 --no-pager
```

If either readiness check fails, inspect its logs and retry after loading completes. Laya's status route can return HTTP 200 while still loading, so check `state`. systemd `After=` orders process startup; it does not wait for model readiness.

Once both are ready:

```sh
sudo systemctl start apertus-web
curl --fail http://127.0.0.1:43100/api/health
```

The web health response should contain `offline: true`; it reports web readiness, not inference readiness. Keep all three ports bound to loopback.

## 7. Provide trusted HTTPS for phones

Install native Caddy using its [official Debian/Raspbian package instructions](https://caddyserver.com/docs/install#debian-ubuntu-raspbian). Configure the Pi hostname or LAN DNS so phones resolve `apertus.local` to the Pi; setting an environment variable does not configure DNS. A stable reserved LAN IP can be used instead, consistently in all URLs.

On a dedicated Pi, configure `/etc/caddy/Caddyfile` as follows. If it already hosts other applications, add this site instead of replacing their configuration:

```caddyfile
apertus.local {
    tls internal
    reverse_proxy 127.0.0.1:43100
}
```

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl start caddy
sudo systemctl reload caddy
```

Install and trust Caddy's public root certificate on every phone. With the official systemd package, it is normally at `/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt`; confirm the service's data directory if it is elsewhere. Preserve that directory across updates and copy only the public certificate. See [Caddy local HTTPS](https://caddyserver.com/docs/automatic-https#local-https) and [Apple certificate trust instructions](https://support.apple.com/en-us/102390).

Open `https://apertus.local` on a phone. Confirm a trusted secure context and that composition save/reopen works: the application uses `navigator.locks`, which needs a secure context. Plain HTTP to the Pi LAN IP is insufficient for this flow.

Offline mode disables accounts, community/database features, and cloud inference. Saves remain in each phone's browser storage, scoped to the hostname/protocol/port. Export recipes for backup. Phones still need a network connection to the Pi.

## 8. Run one application test and measure resource use

Start all services and wait for readiness before measuring. Stop any previous deployment of this application so models are not loaded twice. Finish downloads and builds first; keep active cooling running.

In separate Pi SSH terminals, observe:

```sh
# CPU and per-process resident memory, every second:
pidstat -u -r -p "$(systemctl show -p MainPID --value apertus-llama),$(systemctl show -p MainPID --value apertus-laya),$(systemctl show -p MainPID --value apertus-web)" 1
```

```sh
# Host memory, swap activity, and CPU; ignore the first summary row:
vmstat 1
```

Record baseline `free -h` and `vcgencmd get_throttled`. On one phone, submit **one normal application generation**, time it from submission to completed result, and confirm the result renders and saves. This includes sequential calls and Laya work that a short raw model prompt misses. Do not run the Docker-oriented `deploy/raspberry-pi/benchmark.py` for this native setup.

Immediately afterward, capture:

```sh
free -h
vcgencmd measure_temp
vcgencmd get_throttled
sudo systemctl show apertus-llama apertus-laya apertus-web \
  -p Id -p MemoryCurrent -p MemoryPeak -p CPUUsageNSec
sudo journalctl -u apertus-llama -u apertus-laya -u apertus-web \
  --since '10 minutes ago' --no-pager
sudo journalctl -k --since '10 minutes ago' --no-pager | rg -i 'oom|out of memory|killed process'
```

`MemoryPeak` availability depends on the OS/systemd version. Resident memory and service accounting are useful observations, but mapped model pages may also appear as reclaimable file cache. Interpret them alongside host available memory, swap activity, and latency. Do not add per-service peaks taken at different times and label that a simultaneous total. In `pidstat`, CPU usage near 300% means approximately three CPU cores under its default reporting.

Report the completed/failed result, total application seconds, prompt/decode timings from llama.cpp logs, memory baseline and observed peak, swap activity, temperature, and throttling before/after. Historical throttle flags can remain set from earlier activity, so distinguish them from current throttling. Sustained swap or OOM means this configuration does not fit comfortably; the Mac GPU timings cannot establish Pi feasibility.

Stop the monitor commands with Ctrl-C. For a one-time trial, stop the stack after recording results:

```sh
sudo systemctl stop caddy apertus-web apertus-laya apertus-llama
```

## 9. Enable boot startup and maintain the deployment

After the trial succeeds, enable startup:

```sh
sudo systemctl enable apertus-llama apertus-laya apertus-web caddy
sudo systemctl start apertus-llama apertus-laya apertus-web caddy
```

Model loading may still be in progress when the web process starts after boot; wait for the two inference readiness checks before generating. To keep the stack stopped across reboot, use `systemctl disable --now` for these four services.

For updates, stop the application services, transfer the new working tree, rebuild the production web output and recopy its assets, refresh `laya_service` from `src/inference/laya`, then restore `apertus` ownership and restart. Run builds as your deployment user with appropriate directory ownership, rather than as root or the restricted service account. Reverify model hashes if model files change; preserve existing models and Caddy's CA data. Do not build while measuring inference.

This guide does not change the model, quantization, or context to make an unmeasured performance claim. If the 8B stack is too slow or swaps on the Pi, use that result to choose a smaller model, a different quantization, or remote inference as a separate decision.
