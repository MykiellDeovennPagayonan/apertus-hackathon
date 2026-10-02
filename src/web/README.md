# Apertus Local Lab web app

Next.js App Router frontend and backend workspace. Initial simulations ported from the sibling `demo` project, retaining its paper-style design.

## Run

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000 for the landing page. Browse `/experiments` and choose a premade experiment; all twelve load immediately without inference. Use the simulation controls or ask Apertus for follow-up changes.

## Supported experiments

- Projectile motion: analytical trajectory, range graph, angle comparison, planetary gravity, velocity vectors, pause and slow motion.
- Truss bridge: load and position controls, member removal, span and triangulation changes. Response scores and support load shares are conceptual approximations.
- Living town: 3D orbit camera, scheduled citizens, day/night, speed, road closure with obstacle avoidance, market relocation and activity.

- Early mathematics: counting, arithmetic, equal groups with remainders, fraction bars, and fraction number lines.
- Ratios/percentages, rectangular area/perimeter, coordinate plotting with dragging, and seeded coin/die probability trials.

All twelve experiments have predefined initial recipes. Apertus plans follow-up changes through the server API. Shared catalog schemas validate parameters and operations. Trusted browser providers execute accepted plans; model content never becomes code. Initial recipe export is available from an open experiment.

## Structure

- `src/app`: Next.js routes, root layout and global styles; route entry points remain small.
- `src/app/_components`: landing UI and application UI shared across routes, with colocated styles.
- `src/app/_lib`: prompt matching used by simulation verification.
- `src/app/experiments/_components`: premade experiment catalog and simulation shell.
- `src/app/experiments/_lib`: titles, descriptions and initial recipes for all twelve premade experiments.
- `src/app/playground`: compatibility redirect to `/experiments`.
- `src/simulations/components`: the shared library, organized into nine component kinds. See its README for ownership and reuse rules.
- `src/simulations/pre-made`: explicit selections for the eight original experiments, with no implementations.
- `src/simulations/runtime`: validation, trusted providers, typed command dispatch, snapshots and the single active simulation clock.

## Verify

```sh
pnpm test
pnpm test:apertus
pnpm test:browser
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Tests check analytical motion, heuristic bridge response, town navigation, math, independent instances, atomic edits, stale revisions, accepted-configuration resets, typed datasets, binding compatibility, recipe round trips, and clock lifecycle. The browser suite runs a separate production build and mock inference endpoint, then exercises creation, targeted edits, reset, inspection, error rollback, recipe export, and dragging. Install a browser with `pnpm exec playwright install chromium`, or set `BROWSER_EXECUTABLE_PATH`; macOS Chrome is also detected. The 3D town requires WebGL.

`pnpm test:apertus:live` is a separate live-model evaluation covering every experiment and follow-up/clarification/unsupported cases. It records schema validity independently from final-state correctness. An optional argument specifies a JSON report destination. Ordinary tests do not require MLX or a running model.

## Apertus inference

Premade experiments load predefined recipes in the browser. The application sends
follow-up requests to the server-side `POST /api/apertus` route. Apertus returns a versioned `create`, `edit`, `clarify`, or `unsupported` plan.
Creation selects a registered composition template with bounded parameters.
Projectile recipes can additionally assemble 1–4 independently configured trusted
prefabs and select compatible views. Edits contain up to eight targeted operations,
plus session identity and the expected configuration revision. The browser stages
and validates the entire batch before committing any state. Simulation ticks do
not change the configuration revision. Invalid replacements preserve the active
experiment. Invalid model output gets at most one repair request.

Follow-ups include exposed instance identities, editable parameters, selected
outputs, views and model assumptions. Planner context is advisory; runtime state
is authoritative. Supported views include independent comparisons, results tables,
model-time measurements, inspectors and angle sweeps. Saved files describe the
accepted initial recipe; they do not resume an execution checkpoint.

All runner code is included in this repository under `../inference/`; no sibling
checkout or pre-existing virtual environment is required. Run these commands from
this directory (`src/web` in the parent workspace):

```sh
cp .env.example .env.local
pnpm install
make -C ../inference setup
make -C ../inference run
```

In a second terminal, from the same directory:

```sh
pnpm dev
```

Local inference requires macOS on Apple Silicon, Python 3.12, Metal access, and
Make. Each teammate gets their own `../inference/.venv`. The pinned MLX-LM runner
downloads `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` on first use; allow several GB
of disk and sufficient unified memory for model weights and context. Subsequent
runs reuse the Hugging Face cache. `make -C ../inference smoke` checks a running
model. `make -C ../inference planner-smoke` runs the live planner evaluation. Stop inference with Ctrl+C. The server binds only to loopback.

Set `APERTUS_PROVIDER=local` (default) to use MLX. `APERTUS_LOCAL_BASE_URL` includes
`/v1`; `APERTUS_LOCAL_MODEL` must match the runner's model. To override the runner,
use `make -C ../inference run MODEL=/path/to/weights PORT=8081` and update the web env.
Keep inference running separately from Next.js. A deployed Next.js server's
`127.0.0.1` points to that server, not a user's laptop.

For future hosted use, set `APERTUS_PROVIDER=huggingface`, `HF_TOKEN`, and
`APERTUS_HF_MODEL` to a model actually served by your selected provider. The
base URL defaults to `https://router.huggingface.co/v1`; an OpenAI-compatible
dedicated endpoint can be configured with `APERTUS_HF_BASE_URL`. A downloadable
MLX model is not necessarily available through hosted inference. Hosted mode
sends prompts and simulation snapshots to the configured provider. It has not
been verified against a live hosted Apertus deployment.

These variables are server-only: never prefix credentials with `NEXT_PUBLIC_`.
Restart Next.js after changing `.env.local`. Provider selection is explicit;
there is no automatic local-to-hosted fallback. Windows/Linux teammates can use
a compatible local inference server by setting the local URL/model, or configure
hosted inference; the included MLX runner targets Apple Silicon only.

Requests default to a 120-second timeout, 1024 output tokens, and one concurrent
inference request per Next.js process. Configure those limits through the example
env file. Some Apertus outputs include reasoning before final content; increase
`APERTUS_MAX_TOKENS` if generation stops before the JSON answer. Errors leave the
current simulation available, and leaving the experiments page aborts pending requests.
The endpoint is intended for a local prototype; public deployment needs your app's
normal authentication and per-user request limits. The process concurrency limit
is not a distributed rate limiter.

Verification: `pnpm test`, `pnpm test:apertus`, and `pnpm exec tsc --noEmit`.

## Deliberate capability limits

Free assembly currently supports ballistic projectile prefabs only. New executable
providers, nested reusable prefab/behavior authoring, spring dynamics and town
service queues remain future capabilities. Unknown providers, recursive/nested
recipe fields, incompatible view bindings and conflicting field ownership are
rejected. Probability trials are the implemented first new mechanism in the roadmap.
The dated live-model results are in
`../../docs/agent-only/implementation/003-APERTUS_LIVE_EVALUATION.json`.
