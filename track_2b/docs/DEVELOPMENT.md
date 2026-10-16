# Development guide

pAperSim assembles editable educational simulations from registered components. Apertus interprets the request and proposes supported choices; application code validates the resulting recipe and runs its mechanics. Model output is not unrestricted JavaScript executed in the browser.

## Run the submission

From the repository root, with Docker Engine/Desktop, Compose and GNU Make installed:

```sh
make run
```

Open **http://localhost:43100** on the Docker host. The command downloads pinned models, builds the production web and inference images, and waits for healthy services. No host Node.js, Python environment, database, or API credentials are required. Initial setup needs internet access and approximately 5.7 GB for weights, plus space for images and build layers.

The default stack has two services: web and Apertus through llama.cpp. Laya through PyTorch CPU is available through an optional profile. Images build for the Docker host's architecture. Linux ARM64 and AMD64 are the intended CPU targets; ARM64 builds require ARMv8.2 FP16 and dot-product support. The verification status and hybrid-mode instructions are recorded in the [deployment guide](../deploy/raspberry-pi/README.md). Phone HTTPS is optional.

```sh
make stop
```

Stop preserves model files and Docker volumes. Guest saves live in the browser, independently of those volumes. Export important lessons as JSON before clearing browser data or changing the application's origin.

The submission sets `OFFLINE=true`: accounts, MongoDB access, community publishing, hosted inference and repair memory are disabled. This does not install a browser offline cache; the browser still needs access to the running web server. See the [deployment guide](../deploy/raspberry-pi/README.md) for phone access, operation and live checks.

## Host development

Commands in this section run from `track_2b/`. Install Node.js 22 and pnpm 10.14.0. Copy `src/web/.env.example` to `src/web/.env.local` and configure the providers you intend to run; keep credentials out of Git.

```sh
make dev
```

This installs the web dependencies and starts the development web server on port 43100. Inference is separate. On an Apple Silicon Mac, the existing MLX helpers can run local Apertus and Laya in separate terminals:

```sh
make -C src/inference setup
make -C src/inference setup-laya
make run-apertus
# In another terminal:
make run-laya
```

Use `make stop-dev` to stop the host web/inference processes on the configured ports. `make stop` controls the Docker submission stack. Avoid running both web stacks on port 43100 at once. Host production development uses `make build` followed by `make start`.

To keep the web app in Docker while using host/LAN inference (llama.cpp, Ollama, or MLX), or Hugging Face, configure `deploy/raspberry-pi/.env` and use `make run-external`. It skips model provisioning and bundled inference startup. See [provider configuration](../deploy/raspberry-pi/README.md#choose-hostlan-inference-or-hugging-face). The MLX helper accepts `BIND_HOST` for Docker-reachable binding; its default remains loopback.

See the [web configuration guide](../src/web/README.md) and [inference setup](../src/inference/Makefile) for provider-specific settings. Optional online account storage and community publication require separate MongoDB/authentication configuration. They are not part of `make run`.

## Source map

| Location under `src/web/src/` | Responsibility |
| --- | --- |
| `app/` | Next.js pages, HTTP routes, account/library/community UI |
| `simulations/registry/` | Stable component identities, contracts, discovery and recipe registration |
| `simulations/pre-made/` | Prepared recipe JSON and assets |
| `simulations/creation-and-editing/` | Intent interpretation, inference, composition, validation, authoring, runtime and lesson rendering |
| `simulations/builder/` | Manual connections editor, preview, history and persistence |
| `simulations/domains/` | Domain contributions |
| `simulations/legacy/` | Preserved scenes, equations, adapters and saved-document compatibility |
| `lib/` | Server-side authentication, database, projects, agents and optional repair memory |

Read the [component architecture](COMPONENT_ARCHITECTURE.md), [pipeline walkthrough](agent-only/features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md), [component contracts](agent-only/COMPONENT_CONTRACTS.md), and [creation rules](agent-only/rules/CREATION-PIPELINE-RULES.md) before changing shared behavior. Folder names such as `legacy` do not mean the code is unused: saved documents and registered recipes still depend on these implementations.

## Verification

From `track_2b/src/web`, after installing dependencies:

```sh
pnpm test
node scripts/recipes/verify-llamacpp-transport.cjs
pnpm exec tsc --noEmit
pnpm build
```

The existing contract runner checks recipe loading, runtime behavior, serialization, rejected inputs, persistence contracts and repair-memory behavior. Real database checks require the explicitly configured disposable test database described in the [repair-memory runbook](../deploy/repair-memory/README.md).

The full runner currently fails at `scripts/recipes/verify-contract.cjs:366`: the assertion expects `requiredCapabilities`, while activity retrieval returns `ranked` and `cards`. This failure was reproduced before restructuring; the cleanup preserves both the application behavior and the assertion. Resolve that contract separately from documentation changes.

After adding or removing prepared recipes, run `pnpm recipes:generate`; use `pnpm recipes:generate -- --check` to check freshness. For Python wrapper checks, run `make -C src/inference test-laya` from `track_2b/` after setting up that environment.

For the release, use the actual Docker app to generate a lesson, operate its controls, save, reload, reopen and export it. Also check one manual builder edit and a prepared 3D lesson. Passing contract tests does not prove request fidelity, scientific accuracy, browser rendering or target-hardware performance.

## Benchmarks and evidence

- [Benchmark runner](../src/playwright/README.md): fixed forty-prompt model runs and publication.
- [Evaluation gallery](../src/eval/README.md): screenshots, human voting and measurements.
- [Recorded data](../data/README.md): frozen campaign manifests, measurements and human exports.
- [Technical report](../technical_report.md): submission claims, results and limitations.

Keep `docs/agent-only/benchmark/`: the runner reads its prompt list and the statistics collector reads its reports and catalog inventory. Historical implementation diaries, loose captures, speculative simulation designs and duplicate report authoring files are omitted from this submission. They are not required to build or run the application.

## Limits and optional services

AI composition is limited to registered capabilities. Render success alone does not establish that a lesson satisfies its request or models the science correctly. Many domain models are simplified teaching demonstrations rather than forecasts.

Guest saves are browser-local; guest agent runs are temporary process state. Account/community flows require online services and their own verification. Raspberry Pi latency, memory, thermals and classroom suitability remain unmeasured.

[Repair memory](../deploy/repair-memory/README.md) is optional and defaults to off. Its PostgreSQL, embedding service, migrations and operator processing are separate from the submission stack. Do not describe it as an enabled background-learning service or infer a quality improvement from its implementation alone.
