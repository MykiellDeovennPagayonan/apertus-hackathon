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

## Laya decision planner

The shared planner lives in `src/lib/planner`. `PLANNER_MODE=apertus` (default)
uses broad planning. `PLANNER_MODE=hybrid` asks Laya to select intent, actual
target, and allowed operation, then asks Apertus to interpret arguments for that
proposal. Both paths return the same validated Plan through `/api/apertus`.
There is no Laya-only execution mode: Laya selects choices rather than generating
values or executable plans.

From the project root, install and start the separate Laya environment:

```sh
make -C src/inference setup-laya
export LAYA_API_TOKEN='your-local-service-token'
make -C src/inference run-laya
```

Configure `src/web/.env.local` with `PLANNER_MODE=hybrid`,
`LAYA_BASE_URL=http://127.0.0.1:8000`, and the same `LAYA_API_TOKEN`, then restart
Next.js. Keep Apertus running on port 8080 for interpretation and broader fallback.
The Python process reads
shell environment variables; it does not read Next.js `.env.local`. For explicit
local-only unauthenticated use, set `LAYA_AUTH_DISABLED=true` on the Python process.
Never expose the service token through `NEXT_PUBLIC_` variables.

Laya downloads and warms `aac6fef/laya-multilingual-mlx` on first startup.
`make -C src/inference smoke-laya` reports loading/ready/error. The default runtime
uses MLX's default device and float16; `LAYA_DEVICE`, `LAYA_DTYPE`, `LAYA_MODEL`,
`LAYA_HOST`, and `LAYA_PORT` configure the service. Apple Silicon is the intended
local environment. The separate `.venv-laya` avoids changing the Apertus lock.
The Laya requirements pin direct dependencies, not a complete transitive lock.

The collaboration handles follow-up edits on active experiments. It has no regex
command grammar or language eligibility filter: original text, including typos
and number words, goes to the models. Dependent Laya questions receive accepted
parent decisions. Choices come from the catalog and exposed instance actions.
Rejected selections use compact Apertus edit planning scoped to the active
experiment. Creation uses the existing full planner. Both support all twelve
experiment families.

Apertus gets the proposed operation's argument schema and current context for
the focused task, rather than the full planning catalog. Its versioned result
is `arguments`, `clarify`, `unsupported`, or `conflict`. An arguments result
requires a `confirmedSelection` action/target inferred from the request; a
mismatch becomes conflict. It can challenge a confident Laya proposal.
Conflict invokes one broader planning pass with the
original request/context. Clarification and unsupported results return directly.
The application validates arguments and constructs action/target/session/revision
fields. Even argument-free controls use Apertus to check intent. Relative edits
use known configuration; missing quantities require clarification.

`LAYA_ACCEPTANCE_GATE=0.9` is an initial conservative setting, not a calibrated
accuracy claim. `LAYA_TIMEOUT_MS=3000` bounds selection; `PLANNER_TIMEOUT_MS=120000`
bounds the whole hybrid request, including interpretation, repair, and fallback.
Failed/malformed Laya responses trigger broader planning. Invalid Apertus output
gets one repair; transport errors or a failed repair propagate instead of
restarting planning. Both Apertus tasks share provider configuration and capacity.
Cancellation does not trigger fallback. `PLANNER_MAX_CONCURRENT_REQUESTS` limits
hybrid requests per Next.js process. Model calls run serially in the Python
service, and HTTP cancellation does not interrupt an active MLX call.

Run `pnpm test:planner` for deterministic integration checks and
`make -C src/inference test-laya` for service tests. With a warmed Laya service,
export its token in the shell and keep Apertus running, then run
`pnpm test:laya:live [report.json]`. This evaluates real collaboration, recording
selection decisions, focused/broad calls, final-state checks, and end-to-end
timing. Cases include typos, number words, relative edits, units, ambiguity,
negation, compound instructions, and a French request. There is no mock provider.
Deterministic integration checks do not establish model accuracy.

The October 3, 2026 live smoke run is saved in
`../../docs/agent-only/implementation/LAYA_LIVE_EVALUATION.json`. At the 0.9 gate,
1 of 5 supported edit cases produced an accepted direct plan. The other four
returned no plan, including a confidently wrong target blocked by the explicit
target check. All four intentionally ineligible requests returned no plan.
That report belongs to the superseded parser-gated implementation. It does not
measure this collaboration. See
`../../docs/agent-only/implementation/004-APERTUS_LAYA_COLLABORATION.md` for the
responsibility split and verification scope.

The implemented collaboration remains experimental: the recorded full live
run passed 3/11 cases, accepted no Laya selections at the 0.9 gate, and made four
incorrect mutations through broader fallback. The latest isolated focused
argument evaluation passed 1/8 cases. Reports and delivery notes are linked in
004. Passing deterministic checks does not make the current models reliable.
