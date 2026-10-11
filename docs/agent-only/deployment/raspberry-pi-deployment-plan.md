# Raspberry Pi deployment plan

Date: 2026-10-11
Status: implementation added; local web and service checks passed. Inference-container validation and the actual Pi benchmark remain pending.

Implementation and operating instructions: [deployment README](../../../deploy/raspberry-pi/README.md).

Local verification completed: production Next.js build, offline production browser regression, provider/decision fixtures, project contracts, TypeScript checks, and eight Laya API/runtime tests. The ARM64 web container also built and its standalone server/static assets passed a smoke check. The candidate GGUF header was inspected for Apertus architecture, Q4_K_M metadata, and its embedded deliberation toggle; Laya files were downloaded and verified against the pinned manifest. Full inference-container validation was interrupted, and Docker was unavailable when work resumed. No Pi performance measurements or live CPU Laya equivalence claims have been made.

The sections below retain the original plan and baseline inspection; current implementation details are in the deployment README. SSH connection details are still needed to deploy and benchmark on the Pi.

## Confirmed decisions

| Item | Decision |
| --- | --- |
| Hardware | Raspberry Pi 5, 8 GB RAM |
| OS | Raspberry Pi OS, 64-bit |
| Access | SSH from the development workspace |
| Apertus runtime | Benchmark llama.cpp first |
| Apertus checkpoint | Community Apertus v1.5 8B text-only Q4_K_M GGUF is acceptable after source and chat-template verification |
| Benchmark scope | Entire stack immediately: Apertus, Laya, and Next.js running together |
| Storage hardware | microSD |
| Cooling | Active cooling |
| Workload | One active generation; measure latency before choosing an acceptance limit |
| Intended packaging | Docker Compose on Linux ARM64 |

The selected benchmark is full-stack. An Apertus-only measurement may be used to diagnose a failure, but it does not replace the full-stack result.

## Information still needed

- SSH hostname or IP address, username, and available authentication method. Use existing SSH keys or an SSH agent; do not record passwords or private keys in this document.
- Available microSD capacity and free space.
- Confirmation of offline storage behavior: the user proposed `OFFLINE=true` and browser local storage, but has not explicitly selected between per-device storage and Pi-side shared storage.
- Number of connected phones expected. One active generation is confirmed; multiple browsing clients may still be supported.

No SSH connection, installation, model download, or deployment has been performed as part of this documentation task.

## Current repository behavior

The mobile experience is currently the Next.js browser application in `src/web`, rather than a separate native mobile package. The Pi would serve its frontend and API, while each phone renders the simulations.

- `src/inference/serve_apertus.py` starts the current MLX-LM Apertus server.
- The default Apertus model is `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`.
- `src/inference/laya/runtime.py` imports `laya_mlx`; its default checkpoint is `aac6fef/laya-multilingual-mlx`.
- The Laya FastAPI wrapper exposes `/api/status` and `/api/decide`.
- Apertus configuration currently accepts only `mlx` and `ollama` as local runtime identifiers. llama.cpp requires an explicit configuration/transport integration; it should not be mislabeled as MLX.
- Signed-out experiment and composition saves already use browser `localStorage`.
- Account saves, authentication, and community persistence use MongoDB.
- Guest agent runs use process memory and disappear when the web service restarts.
- No Docker deployment files or explicit offline-mode implementation were found during inspection.

## Inference choices and verification

### Apertus

Candidate: [`Colby/apertus-v1.5-8b-text-Q4_K_M-GGUF`](https://huggingface.co/Colby/apertus-v1.5-8b-text-Q4_K_M-GGUF).

Its model card identifies a text-only conversion from `andreasmartin/apertus-v1.5-8b-text`, derived from `swiss-ai/Apertus-v1.5-8B`. The listed GGUF size is 5.06 GB. This is a candidate, not a device-validated artifact.

Before adoption:

1. Inspect the source model, tokenizer, text-only conversion, and embedded chat template.
2. Compare their provenance with the currently configured MLX model. A shared family name does not establish identical weights or formatting.
3. Pin the GGUF repository revision, filename, and checksum.
4. Pin the llama.cpp revision or image digest and verify Apertus architecture support in that build.
5. Check system/user message handling, generation termination, any reasoning markers, JSON responses, and the application's structured-output capability probe.

The current MLX file uses MXFP4; the candidate uses Q4_K_M. Both are approximately 4-bit formats, but are different quantizations. Output equivalence and generation quality must be evaluated rather than assumed. Do not requantize the existing MXFP4 model as the preferred conversion path; if a new GGUF is needed, use the appropriate source weights.

llama.cpp provides local inference and an OpenAI-compatible HTTP server. Add a `llamacpp` runtime option, implement the required request/response behavior, and preserve the existing provider validation and concurrency limits. Check transport details against the pinned server version.

### Laya

The proposed Pi backend is upstream Laya on CPU, retaining the existing FastAPI contract. The user chose to benchmark the entire stack; the exact Laya backend has not been independently finalized.

Verify Linux ARM64 dependencies before selecting versions. Use a CPU-compatible source checkpoint such as `convaiinnovations/laya-multilingual`, not the MLX-specific checkpoint by assumption. Upstream documentation supports CPU execution and uses fp32 on CPU.

Preserve choice, score, and `noul` behavior, result structure, confidence handling, input bounds, serialized inference, warmup, and readiness reporting. Compare representative requests against the current MLX service, especially near planner selection thresholds. Load only the required checkpoint to limit memory use.

### MLX platform clarification

MLX now documents Linux CPU support. It is not strictly Mac-only, but the repository's pinned inference stack and MXFP4 checkpoint have not been validated on Raspberry Pi ARM64. Linux CPU support does not provide Apple Metal acceleration. The agreed next direction is llama.cpp benchmarking rather than assuming the existing MLX stack works unchanged.

## Proposed deployment topology

```text
Phone/tablet browser
        | local Wi-Fi, trusted HTTPS
        v
Raspberry Pi 5 (8 GB)
  proxy    -> web:3000
  web      -> apertus:43101/v1
  web      -> laya:43102

Docker volumes/bind mounts:
  Apertus GGUF and pinned model metadata
  Laya checkpoint/cache

Proposed experiment storage:
  each phone's browser storage
```

Expose the application through the proxy. Keep inference services on the private Compose network. Service hostnames replace `127.0.0.1` for container-to-container requests; services must listen on their container network interface.

Build native `linux/arm64` images. Use a multi-stage Next.js standalone build and copy its required static/public assets. Read the repository's installed Next.js guides before making those changes, as required by `src/web/AGENTS.md`.

Pin dependencies and image versions. Exclude `.env.local`, secrets, virtual environments, downloaded models, and development build output from image contexts. Mount model files separately so application rebuilds do not duplicate large artifacts.

Use readiness checks that establish model loading has completed, restart policies, bounded logs, and graceful shutdown. Process startup alone is insufficient to declare inference ready.

## Proposed offline mode

`OFFLINE=true` should mean the deployment needs neither internet access nor a database during normal use. Phones still need a network connection to the Pi for server-side AI and uncached application resources.

This interpretation and per-device storage remain proposed pending confirmation.

Expected behavior:

- Require local inference endpoints; reject cloud-provider configuration and cloud fallback.
- Disable account sign-in, registration, account storage, and community publishing/browsing backed by MongoDB.
- Prevent database access at server boundaries, even if database credentials happen to be present.
- Reuse local experiment, composition, and draft storage; retain import/export.
- Supply frontend capabilities from one server-owned runtime configuration rather than two independent offline flags.
- Avoid unnecessary authentication polling and misleading account/community controls.
- Keep prepared lessons available locally.
- Explicitly describe guest agent runs as temporary; saving an experiment does not persist its live agent run.
- Preload all weights, tokenizer files, and frontend assets during provisioning. Verify normal operation with internet access unavailable.

`localStorage` lives on the client device, not in a Pi Docker volume. Phones have separate libraries; browser-data deletion removes saves. Storage is scoped to origin, so retain a stable hostname, protocol, and port. Preserve export as a portable backup path. IndexedDB is a later option if library sizes justify it.

The existing composition-save path requires `navigator.locks`. Web Locks require a secure context, so ordinary HTTP access to the Pi's LAN IP can break saves. Provide HTTPS trusted by the phones or implement and validate a suitable alternative. PWA caching is separate work; `OFFLINE=true` alone does not make the app work when the Pi is unreachable.

## Full-stack benchmark

Run on the actual Pi with Apertus, Laya, and Next.js resident together. Do not claim feasibility based solely on the 5.06 GB model file fitting in 8 GB RAM: context cache, Laya, runtime allocations, the OS, and Next.js also consume memory.

1. Record OS/architecture, RAM, free storage, cooling, model hashes, runtime versions, context capacity, thread settings, and power setup.
2. Launch all services and measure cold startup, checkpoint loading, warmup, and idle memory.
3. Use one active generation and a bounded context verified against actual planner input sizes plus output reserve. Account for other inference callers so agent requests cannot silently exceed the benchmark workload.
4. Exercise representative existing requests: prepared-lesson changes, component composition involving Laya, builder authoring, multi-stage generation, and validation/repair cases.
5. Record end-to-end time, per-stage time, Laya latency, prompt processing, token generation, output validity, repair count, and errors. Measure through the app, not only a raw model prompt.
6. Observe aggregate host/container memory, swap activity, CPU use, temperature, throttling, and OOM events over repeated requests.
7. Verify phone rendering and local save/reopen/export behavior while inference runs.
8. Verify startup/restart with cached models and no internet. Browser saves should survive service restart; process-memory agent runs are expected to expire.

Do not use sustained swap as evidence that the deployment fits comfortably. On microSD, monitor disk pressure and writes; bound logs and avoid unnecessary repeated model downloads. Build images elsewhere when practical so build-time memory does not compete with inference.

No latency threshold has been selected. Report measured timings and successful-request rates first, then agree an acceptance target. If the full stack fails to fit or becomes impractically slow, report that evidence before changing the agreed model, quantization, or topology.

## Planned implementation artifacts

- ARM64 web Dockerfile and `.dockerignore`.
- Laya CPU runtime adapter, separately pinned dependencies, and Dockerfile.
- Pinned llama.cpp service configuration with model mount and readiness check.
- Compose file and trusted local HTTPS configuration or validated storage alternative.
- Example environment file with no real credentials.
- Explicit offline capability configuration and database/auth/community guards.
- llama.cpp provider support and meaningful transport/structured-generation checks.
- Repeatable full-stack benchmark commands and a results report.
- Provisioning, model download/checksum, startup, shutdown, backup, and recovery instructions.

Illustrative environment after implementation; this is not runnable with the current code:

```dotenv
OFFLINE=true
LLM_PROVIDER=apertus
APERTUS_PROVIDER=local
APERTUS_LOCAL_RUNTIME=llamacpp
APERTUS_LOCAL_BASE_URL=http://apertus:43101/v1
APERTUS_LOCAL_MODEL=apertus-v1.5-8b-text
APERTUS_MAX_CONCURRENT_REQUESTS=1
PLANNER_MAX_CONCURRENT_REQUESTS=1
DECISION_PROVIDER=laya
LAYA_BASE_URL=http://laya:43102
```

The model identifier must match the server alias. Timeouts, context size, thread allocation, and Laya CPU configuration must be chosen from verification and benchmark evidence. MongoDB is omitted from the proposed offline stack.

## Sources

- [MLX Linux CPU installation](https://ml-explore.github.io/mlx/build/html/install.html)
- [Current Apertus MLX MXFP4 model](https://huggingface.co/m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4)
- [Candidate Apertus v1.5 Q4_K_M GGUF](https://huggingface.co/Colby/apertus-v1.5-8b-text-Q4_K_M-GGUF)
- [llama.cpp runtime and HTTP server](https://github.com/ggml-org/llama.cpp)
- [Upstream Laya CPU runtime](https://github.com/NandhaKishorM/laya)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Web Locks secure-context requirements](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)

Upstream links were inspected during the deployment discussion. They establish candidate capabilities, not successful execution on this Pi.
