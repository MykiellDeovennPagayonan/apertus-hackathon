# Apertus Playground — Product Spec (Organized Draft)

**Status:** Draft v0.1, 2026-10-03. Organizes the founding ideas into one structure.
**Relates to:** [Component Architecture](COMPONENT_ARCHITECTURE.md) (agreed component model), [Overview](agent-only/OVERVIEW.md) (original vision), [Component Contracts](agent-only/COMPONENT_CONTRACTS.md).

> Items marked **[BUILT]**, **[PARTIAL]**, **[NEW]** reflect the repo as of this date.

---

## 0. Vision in one page

A **community-grown library of interactive components** and a **simulation engine** that runs them, built for **learning by doing**. Users play, break, and rebuild things in a sandbox. Apertus (8B) and the fast model Jev help in three ways: it composes experiments from components, it explains what is happening, and it helps make new components.

```text
                    ┌──────────────────────────────┐
                    │   Community Component Library │  (§6, §9)
                    └───────┬──────────────┬────────┘
                 reads/uses │              │ publishes
        ┌───────────────────▼───┐      ┌───▼─────────────────┐
        │  Simulation Engine(s)  │◄────┤  Component Maker +   │  (§7, §8)
        │  (§2, §3, §5, §10)     │     │  agentic assistant   │
        └───────────┬────────────┘     └───────────▲─────────┘
                    │ context, state, events       │
        ┌───────────▼────────────────────────────┴──┐
        │   Jev (System 1) + Apertus (System 2) +      │  (§1, §4)
        │   domain LoRA specialists                    │
        └──────────────────────────────────────────────┘
```

**Governing principles** (carried over from existing docs, plus new ones):
1. *Never ask the model to do what a deterministic component does better.* Apertus composes and explains. Engines compute.
2. Composition over code generation. AI emits validated specs, never arbitrary code (at least by default; see §6.6 for sandboxing).
3. Everything inspectable: state, assumptions, and why something happened.
4. **[NEW]** Play first, explanation second. The user's hands are on the thing within seconds.
5. **[NEW]** Honest fidelity. Every model states what it is (exact, approximate, heuristic, toy) so learners do not mistake a toy for physics. The bridge demo is already labeled heuristic. Make this a platform-wide rule.
6. **[NEW]** Local-first and open. It must run on a small device (Raspberry Pi/LAN, Apple Silicon via MLX) with hosted fallback.

---

## 1. Specialized models (Apertus-8B + LoRA / QLoRA)

**Goal:** One base model (Apertus-8B) with small swappable adapters per knowledge domain (physics, chemistry, math, economics, biology, ...) plus per-task adapters (planner, explainer, component author).

### 1.1 What the adapters do
| Adapter kind | Teaches the model | Output |
|---|---|---|
| **Domain** (physics, chem, math, ...) | Vocabulary, common misconceptions, which components and parameters fit | Better plans and explanations in that domain |
| **Planner** | Natural language → valid simulation spec | Spec/DSL JSON (constrained) |
| **Explainer / tutor** | Explain current simulation state at a learner's level | Short text, hints, "what if" prompts |
| **Component author** | Write manifests, descriptions, and parameter schemas (§7) | Component drafts |

Domain and task adapters are separate axes. A "chemistry planner" is chemistry domain knowledge plus the planner skill. Prefer **one planner adapter** that learns domains from the component descriptions retrieved at runtime. Use domain adapters mostly for explanation and vocabulary. This avoids N×M adapters.

### 1.2 Serving
- Base model stays loaded. Adapters load by request (`adapter_id` in the request). The current local runner (`mlx_lm server`) supports an adapter path. Verify hot-swap behavior before relying on it. Otherwise run one server per active adapter, or merge for deployment.
- **[PARTIAL]** `src/inference` serves the base model and `src/web/src/lib/apertus` talks to it (local or HF router). **[NEW]** Add an `adapter` field to the Apertus client config and an adapter registry (id, domain, base-model hash, eval score, license).
- Fallback chain: adapter → base model with domain-specific prompt and retrieval → rule-based answer.

### 1.3 Training pipeline (how to train)
1. **Data sources (in order of value):**
   - Synthetic pairs generated from the component library: `(user request, component manifests retrieved) → (valid spec)`. Validators from the runtime filter these automatically, so the data is verified for free.
   - Logged real sessions (opt-in, anonymized): prompt, accepted/edited spec, user edits as corrections.
   - Curated domain texts (open textbooks, OER; check licenses) for explainer/domain adapters.
   - Community-contributed examples attached to published components (§6, §9).
2. **Method:** QLoRA (4-bit base, rank 8–32) on Apple Silicon via `mlx_lm.lora`, or on a CUDA GPU via PEFT/TRL (or Unsloth). Start small: a few thousand examples per adapter.
3. **Evaluation (gate before publish):** validity rate (spec passes validator), semantic match (human or judge model, rubric-based), regression on base-model abilities, latency and tokens. The existing `evaluate-apertus-live` script is the seed of this harness **[PARTIAL]**.
4. **Packaging:** adapter + model card (data provenance, eval numbers, intended use, license) + version, stored in the model registry.
5. **Loop:** Failed specs and user corrections feed the next training set.

**Risks:** an 8B model plus a small dataset overfits easily. Keep a held-out set. Check Apertus' license and training-data terms for derivatives. Don't train on children's data without consent.

---

## 2. General-purpose simulation engine ("context engine")

**Goal:** A small engine that can be called anywhere context is needed: not only in a full sandbox, but as an embedded mini-simulation inside an explanation, a quiz, or a chat reply.

### 2.1 Design
- **Engine = runtime + systems + world** (already the agreed model: entities with traits, systems operating on them, views/visuals for display). **[PARTIAL]** Session runtimes exist per domain (`projectileSession`, `townSession`, `bridgeSession`, `mathSession`, `elementarySession`) and a shared `catalog`, `validation`, `commands`, `resolver`.
- **[NEW] Unify sessions** behind one `Engine` interface: `load(spec) → World`, `step(dt)`, `apply(command)`, `snapshot()`, `observe(query)`, `serialize()`. Domain sessions become configurations of the same engine, not separate code paths.
- **Multiple engines are allowed**, behind one interface, because no single solver fits everything:
  | Engine kind | Fits |
  |---|---|
  | Analytic / closed-form | Projectile, simple math, kinematics |
  | Discrete-step / rigid body | Collisions, mechanics (§3, §10) |
  | Agent-based | Town, economy, epidemics, ecosystems |
  | Constraint / structural | Trusses, circuits |
  | Symbolic / quantity | Math boards, fractions, unit conversion |
  | Particle / field | Gases, diffusion, fluids (approximate) |
- **Headless mode:** runs without a renderer (for tests, evaluation, AI "what happens if" probes, and batch parameter sweeps; `sweeps.ts` exists **[BUILT]**).
- **Embeddable:** a "context card" is a tiny composition (3–5 components) the AI can drop into any answer.
- **Deterministic and replayable:** seeded RNG, fixed timestep, serializable state. Needed for sharing, grading, and bug reports.

### 2.2 Context API (what the AI and UI can ask)
`describe(entity)`, `explain(change)`, `diff(before, after)`, `what_if(command)`, `measure(probe)`. These return structured data that Apertus then phrases. The model never invents simulation results; it reads them.

---

## 3. Visual-simplification engine for complex concepts

**Goal:** Take a hard idea (orbital mechanics, chemical equilibrium, derivatives, natural selection) and present it as something visible and touchable, and be honest about what was simplified.

### 3.1 Domain packs
Each domain ships as a pack: components + presets + misconceptions list + explainer adapter hooks.
- **Physics:** motion, forces, energy, waves, orbits, circuits. **[PARTIAL]** projectile, bridge.
- **Chemistry:** particles with bonds, reaction rates, equilibrium, pH, states of matter. **[NEW]**
- **Math:** numbers, fractions, geometry, functions, probability. **[PARTIAL]** math boards, fractions, counting, equal groups.
- **Life science / ecology:** populations, evolution, food webs. **[NEW]**
- **Earth/space, economics, social systems, CS/algorithms.** Town **[PARTIAL]**; economy and information spread listed as future work in the architecture doc.

### 3.2 Simplification techniques (reusable "lenses")
- **Scale lens:** zoom between levels (molecule ↔ bulk, one citizen ↔ crowd).
- **Time lens:** slow-mo, fast-forward, step, rewind (needs deterministic engine §2).
- **Invisible-made-visible overlays:** vectors, energy bars, stress colors, heatmaps, trails. Components already have `VelocityArrowVisual`, `TrajectoryVisual`.
- **Representation switching:** same data as animation, graph, table, equation.
- **Progressive disclosure:** start with 2 sliders, reveal more as the learner explores.
- **Fidelity badge:** `exact | approximate | heuristic | toy` shown on every model, with a "what is simplified" note.

### 3.3 Authoring rule
A concept pack is only accepted if it lists: the concept, the misconception it targets, the model's fidelity, and at least one "break it" experiment (§10).

---

## 4. System 1 thinking: Jev (fast model) for responsiveness

**Goal:** Keep the interface feeling instant. **Jev is the System 1 model.** It makes fast, bounded decisions so Apertus (System 2) is only called when deliberation is worth the wait.

> Naming note: the original [Overview](agent-only/OVERVIEW.md) called this role "Laya / Jev-like classifier". This spec now uses **Jev** as the name of the System 1 model. The Overview's §15 "Laya" responsibilities carry over to Jev unchanged.

### 4.1 Two tracks
| | System 1: **Jev** | System 2: **Apertus** |
|---|---|---|
| Role | Fast classifier/router for bounded decisions | Semantic composer, planner, explainer |
| Output | A label from a closed set (plus optional small structured fields) | Free-form text and full simulation specs |
| Examples | "Increase gravity", "add 5 citizens", "reset", is this a new sim or a change?, which domain?, is the request ambiguous? | "Build a town where information about prices spreads", novel multi-component builds, explanations |
| Target latency | under ~100–300 ms perceived | Seconds, streamed, with visible progress |

Rules and caches still sit *in front of* Jev. Order of attempts: **exact rules/cache → Jev → Apertus**.

### 4.2 Jev's responsibilities (closed label sets)
Carried over from the Overview's fast-classifier section:
| Decision | Labels |
|---|---|
| Top-level intent | `CREATE`, `MODIFY`, `COMPARE`, `INSPECT`, `SAVE`, `REMIX` (**[NEW]** add `EXPLAIN`, `ASK`) |
| Representation | `2D`, `3D`, `GRAPH`, `DIAGRAM`, `TIMELINE`, `TABLE` |
| Domain | `PHYSICS`, `ENGINEERING`, `MATHEMATICS`, `ECONOMICS`, `SOCIETY`, `BIOLOGY`, `COMPUTING`, `GENERAL` (**[NEW]** `CHEMISTRY`) |
| Modification type | `ADD`, `REMOVE`, `MOVE`, `RESIZE`, `CHANGE_PROPERTY`, `CHANGE_BEHAVIOR`, `CHANGE_RULE`, `ADD_MEASUREMENT` |
| Ambiguity | `CLEAR`, `MISSING_TARGET`, `CONFLICTING`, `UNSUPPORTED`, `NEEDS_CLARIFICATION` |

**[NEW]** Further jobs worth benchmarking for Jev:
- **Escalation decision:** can a template/System 1 path handle this, or does it need Apertus?
- **Adapter selection:** which domain/task LoRA (§1) Apertus should load for this request.
- **Component pre-filter:** shortlist component categories before retrieval (§8), so Apertus sees fewer manifests.
- **Proactive-hint gating (§10.3):** is this a good moment to offer a reflective prompt, or stay quiet?
- **Safety/off-topic triage** before spending a System 2 call.

### 4.3 Escalation and fallback
- Jev returns a **confidence score**. Below threshold, or label `NEEDS_CLARIFICATION`/`UNSUPPORTED`, escalate to Apertus or ask the user.
- If Jev is unavailable, fall back to the existing deterministic matchers, then to Apertus alone. The product must still work without Jev.
- Log Jev decisions and Apertus overrides. Disagreements become training data for Jev.
- Per the Overview: *don't include Jev merely because it exists.* Benchmark that it actually improves latency, cost, reliability, or throughput.

### 4.4 Techniques
- **Intent router first.** **[PARTIAL]** `resolveExperimentPrompt.ts`, `promptMatchers.ts`, and `catalogSelection.ts` already do deterministic matching before the model. Jev slots in after these and before Apertus. **[NEW]** a Jev provider next to the Apertus client in `lib/` (config, timeout, concurrency, in the style of `APERTUS_*`).
- **Template-first, model-second:** instantly show the closest template, then refine it in the background and apply a diff.
- **Optimistic UI + streaming:** stream tokens and partial specs. Validate incrementally.
- **Constrained decoding / JSON schema** so System 1 calls cannot return invalid output.
- **Cache** plans by normalized-prompt + library-version hash. Prefetch likely next commands.
- **Never block the sim loop on the model.** Simulation runs on its own clock. The AI is asynchronous.
- **Small budget:** max tokens, concurrency limits (`APERTUS_MAX_*` config exists **[BUILT]**), timeouts with graceful fallback.
- **Measure:** track p50/p95 latency per route in the evaluation harness.

---

## 5. Simulation engine that consumes shared-library components

**Goal:** The engine can load any compatible component from the community library safely.

- **Resolution:** a composition references components by `id@version`. The loader resolves, verifies integrity (hash/signature), checks that required capabilities exist, and caches locally (offline-friendly).
- **Contract checking:** component declares reads/writes/owned state. The runtime enforces the *single owner per state* rule from the architecture doc. **[PARTIAL]** (`reads`, `writes`, `capabilities.ts`, `validation.ts`).
- **Dependency graph + version pinning:** semver, lockfile per composition, upgrade previews ("this update changes outputs X").
- **Compatibility:** declared `environments`, `targets` (svg/three), and `requires`. A component that doesn't fit the active world is shown as disabled with the reason.
- **Isolation (see §6.6):** untrusted components run in a sandbox with a bounded API.
- **Interoperability:** capability-based matching so a community "Gas Particle" can work with any "Container" that provides the right traits.

---

## 6. Community-grown component library

### 6.1 What can be published
Resource, Trait, Behavior, System, Visual, View, Control, Prefab, Composition (the nine agreed types), plus **domain packs**, **lesson/challenge packs**, and **LoRA adapters** (§1, reviewed separately).

### 6.2 Upload flow
1. Author builds/edits locally (§7).
2. Automated checks: schema valid, manifest complete, **AI-readable description present (§9)**, tests/examples pass headless, fidelity declared, license set, size limits, no banned APIs.
3. Preview in a clean sandbox.
4. Publish as a version. Authors can publish privately, unlisted, or publicly.

### 6.3 Library features
Search (text + semantic embeddings over descriptions), tags and domains, dependencies, "used by N compositions", remix/fork with lineage, ratings and reports, verified/official badge, changelogs, collections ("Grade 7 physics").

### 6.4 Governance and quality
- Trust tiers: **official → verified → community → experimental**.
- Moderation: report flow, takedown, content rules (especially if minors are users).
- Licensing: required field (e.g., CC-BY / MIT), assets carry their own license. Remix must respect it.
- Correctness review for domain content: a "science check" badge by reviewers, separate from code quality.

### 6.5 Storage
Start simple: Git-like content-addressed packages (manifest + files + hash) in object storage with a metadata DB. **[NEW]** (the current registry is a built-in catalog `catalog.ts`).

### 6.6 Security (deferred: v1 is declarative-only)
Declarative components (data only) are the default and safest. If code components (Systems/Behaviors with logic) are allowed, they must run in a **sandbox** (Web Worker + restricted API, no network, CPU/memory/time budgets, deterministic). Never execute AI-generated code outside the sandbox. This is the main technical risk of an open library.

---

## 7. Component maker with agentic assistance

**Goal:** A guided workshop where a person (including a non-programmer) creates a component with Apertus helping.

### 7.1 Experience
- Describe what you want ("a pendulum with adjustable length") or start from a template/fork.
- Split view: manifest/fields on one side, live preview on the other. Apertus drafts; the human edits.
- Agent actions (all producing **diffs the user approves**): draft manifest, pick traits/capabilities, write parameter schemas with units and ranges, write the AI-readable description (§9), generate example compositions and test cases, suggest a fidelity label, flag problems.
- Tests are generated and run headless. The validator is the judge, not the model.

### 7.2 Tooling
Schema-aware editor with live validation, "explain this error", unit/range checking, a visual wiring view for capabilities, a "try in sandbox" button, and a publish checklist (§6.2).

### 7.3 Guardrails
Agent can only emit the declarative format (or sandboxed code if enabled). It may not auto-publish. All agent output is labeled as AI-assisted in the component metadata.

---

## 8. Library usable by agents to build new components

**Goal:** An AI agent can understand *why* a component exists and build new ones from existing parts. It does more than pattern-match names.

- **Concept graph:** each component links to concepts (e.g., `Gravity → acceleration, free fall, weight`) and prerequisite concepts. Seed from open ontologies where licensing allows, and extend by community.
- **Rich semantic metadata** per component: purpose, concept(s), assumptions, valid ranges and why, known limitations, what it ignores (e.g., air resistance), typical combinations, common misconceptions.
- **Retrieval:** hybrid (keyword + embedding + capability/type filters). The planner is given only the top-k manifests to fit the small context window of an 8B model.
- **Compose-before-create:** the agent should first try to *assemble* from existing components. Only if there is a gap does it propose a new component, citing the gap.
- **Introspection API:** `list_components(query)`, `get_manifest(id)`, `get_examples(id)`, `check_compat(a, b)`, `simulate_headless(spec)`. The agent uses these as tools.
- **Self-verification loop:** generate → validate → run headless → compare to the expected behavior stated in the description (e.g., "period grows with length") → repair. Cap iterations.
- **Provenance:** components created by agents record the prompt, agent/model/adapter version, and human approvers.

---

## 9. Descriptions beyond visuals and physics

**Goal:** Every component carries machine- and human-readable meaning, so AI (and search, accessibility, and teachers) can understand it.

### 9.1 Required description block (extend the manifest)
```yaml
semantics:
  summary: "One sentence, plain language."
  purpose: "Why this exists / what it helps a learner understand."
  concepts: [free_fall, acceleration]     # links into the concept graph
  assumptions: ["constant g", "no drag"]
  fidelity: approximate                   # exact | approximate | heuristic | toy
  limitations: ["ignores air resistance"]
  misconceptions_addressed: ["heavier objects fall faster"]
  learner_level: [grade_6, grade_9]       # optional
  behaves_like: "Describes expected behavior in words, testable."
  parameters_explained:
    mass: "Amount of matter; does not change fall speed here."
  example_prompts: ["drop a ball from 10 m"]
  accessibility:
    alt_text: "..."
    narration_template: "The ball has fallen {t} s and moves at {v} m/s."
  lang: { en: ..., de: ..., fr: ..., it: ... }   # multilingual, a good fit for Apertus
```
### 9.2 Rules
- Validator rejects components with missing or too-short semantics. A quality score affects ranking.
- Descriptions are **testable** where possible. `behaves_like` can link to a headless test.
- Descriptions are reviewed for accuracy by the science-check process (§6.4).
- Used for: retrieval (§8), AI explanations (§4), accessibility and screen readers, teacher-facing summaries, and training data (§1.3).

> Multilingual support is a natural strength of Apertus. Treat it as a first-class field rather than an afterthought.

---

## 10. Sandbox "messing around" engine (experimentation feel)

**Goal:** The *feel* of games like Universe Sandbox, Kerbal Space Program, Besiege, People Playground, Scrap Mechanic, Satisfactory, and Cities: Skylines. We are not copying mechanics. We are copying the loop where **curiosity → experiment → surprising result → "why?" → better experiment**.

### 10.1 Feel pillars (what we take from each, as a feel)
| Reference | Feel to capture |
|---|---|
| Universe Sandbox | Change a constant, watch a whole system respond; god-mode time and scale |
| Kerbal Space Program | Build, launch, fail, learn from failure; "it's rocket science, but forgiving" |
| Besiege / Scrap Mechanic | Build contraptions from parts; physical, funny failures |
| People Playground | Zero rules, tools in a toolbox, harmless chaos, instant feedback |
| Satisfactory / Factorio-like | Flow, throughput, bottlenecks, optimizing a system |
| Cities: Skylines | Systems-of-systems; tweak policy, see emergent traffic/economy |
| The Sandbox | Creation tools plus sharing |

### 10.2 Mechanics that deliver this feel
- **Direct manipulation:** drag, throw, attach, cut, pour, scale, with parameters as live sliders and gestures, not forms.
- **Toolbox + parts bin** from the component library (§5). Drag a component in. Compatible things snap together or interact.
- **God tools:** pause, rewind, time scale, change gravity/constants, spawn, delete, probe, "freeze this and inspect."
- **Satisfying failure:** things break, collapse, explode, overheat visibly, and *replays show why* (highlight the cause: the beam that exceeded load).
- **Measure everything:** drop-in probes and graphs that make cause and effect legible.
- **Goals optional:** open sandbox by default. Optional, community-made **challenges** (not a built-in campaign; pure sandbox) ("cross the gap with < 20 beams", "keep the population stable"). No built-in scoring or unlocks. Never forced.
- **Emergence:** components interact through shared capabilities, so combos nobody scripted can happen.
- **Snapshots and branching:** save state, try a variant, compare timelines side by side.
- **Share a "contraption"** as a composition with one link (§6).

### 10.3 Learning layer on top of play
- **Reflective prompts, not lectures:** Apertus watches events and, on request or at good moments, says *"Notice the arch carried more than the flat beam. Want to see why?"* Low interruption, easy to dismiss, never blocks play.
- **Predict → try → compare:** optional "what do you think will happen?" before running, then show the difference.
- **Hidden-variable discovery:** challenges where the learner finds a rule by experiment.
- **Learning evidence:** light, private tracking of what the learner explored (concepts touched, experiments done) for self-reflection or teachers. Opt-in.

### 10.4 Performance and scope
Prioritize responsive interaction over accuracy at high object counts (use cheaper approximations and show the fidelity badge). Decide early on 2D-first (cheaper, clearer) with 3D views where valuable.

---

## 11. Things that were missing (additions)

These are not in the original list but the product probably needs them.

1. **Learner model and pedagogy:** age/level adaptation, scaffolding, misconceptions library, not only "make a sim." Without this it is a toy box, not a learning tool.
2. **Teacher/classroom mode:** assignments, shareable sessions, class galleries, progress views, locked/curated component sets, offline-capable classroom server (the Pi/LAN goal fits).
3. **Assessment and challenges:** auto-graded via headless engine checks (e.g., "bridge holds 5 t") rather than model judgement.
4. **Safety and trust:** the content moderation, sandboxing (§6.6), and child-safety (privacy, COPPA/GDPR-style rules, no unsolicited chat) described above. Switzerland-origin model means Swiss/EU data-protection expectations are likely.
5. **Accuracy and anti-misinformation:** fidelity badges, science-check review, and citing sources in descriptions. A confident wrong simulation is worse than none.
6. **Accessibility:** keyboard control, screen-reader narration (from §9), colorblind-safe overlays, reduced-motion, captions. Multilingual UI and descriptions.
7. **Persistence, accounts, and sharing:** saves, versioning, remix lineage, optional anonymous mode. Decide the auth model early.
8. **Offline / low-end operation:** cached components and a small local model; graceful degradation when Apertus is unavailable (rules and Jev only).
9. **Observability and evaluation:** a benchmark suite (planner validity, latency, simulation correctness tests) run in CI. The model must be regression-tested whenever adapters or components change.
10. **Determinism and reproducibility:** shareable seeds, replays, bug reports from snapshots.
11. **Undo/redo and history** for every change (manual or AI). Users need to trust the agent.
12. **Creator incentives and attribution:** credits, remix lineage, collections, featured components, which are what keep a community library alive.
13. **Cold start:** the library is useless when empty. Ship a strong official core set (current demos extracted into components) and seed with domain packs.
14. **Content licensing and IP:** assets, textbooks used for training, and the inspiration games' names/art. Take the feel only; no assets or branding.
15. **Cost and hosting model:** who pays for hosted inference/storage? Local-first reduces this; define the hosted tier and rate limits.
16. **Versioning and migration:** breaking changes to the component contract, saved-simulation migration.
17. **Telemetry and privacy policy:** opt-in, minimal, with a clear statement of what trains models.

---

## 12. Current state mapped to this spec

| Area | Status | Notes |
|---|---|---|
| Component model (9 types) | **[BUILT/PARTIAL]** | `src/web/src/simulations/components/{resources,traits,systems,visuals,views,controls,prefabs}` |
| Catalog / validation / commands | **[BUILT]** | `runtime/catalog.ts`, `validation.ts`, `commands.ts`, `resolver.ts` |
| Demos | **[BUILT]** | Projectile, Town (22 citizens), Bridge (heuristic), Math (counting, fractions, equal groups, arithmetic) |
| Apertus integration | **[BUILT]** | `lib/apertus` (local MLX or HF router), schema'd planner output, live eval script |
| Prompt routing before model | **[PARTIAL]** | `resolveExperimentPrompt`, `promptMatchers`, `catalogSelection` |
| Landing / playground / experiments pages | **[BUILT]** | `app/` |
| Adapters / LoRA | **[NEW]** | none yet |
| General engine interface | **[NEW]** | sessions are per-domain |
| Community library, upload, auth | **[NEW]** | built-in catalog only |
| Component maker | **[NEW]** | |
| Semantics block / concept graph | **[NEW]** | manifests have `description`, `limitations`, `outputs` (fidelity) as a start |
| Sandbox feel (rewind, snapshots, god tools) | **[NEW]** | `sweeps.ts` and sessions are a base |

---

## 13. Suggested phasing

| Phase | Deliverable | Spec § |
|---|---|---|
| **0 (now)** | Finish extracting the three demos into components; unify session interface; add `semantics` block to manifests | 2, 9 |
| **1** | Sandbox loop on one domain (physics): god tools, snapshots, rewind, probes, one "break it" challenge | 10, 3 |
| **2** | Jev (System 1) router in front of Apertus, constrained JSON, cache, latency benchmarks, Jev fine-tuning from logged routing disagreements | 4 |
| **3** | Local registry + loader with versions/hashes; component maker v1 (manual + AI-drafted manifests) | 5, 7 |
| **4** | First planner LoRA from synthetic, validator-filtered data; eval harness gate | 1, 8 |
| **5** | Public library: accounts, upload checks, moderation, trust tiers | 6 |
| **6** | Domain packs (chemistry, ecology, economics). Teacher mode is optional given the high school to adult focus | 3, 11 |
| **7 (later)** | Sandboxed community code components. Deferred by decision; v1 is declarative-only | 6.6 |

---

## 14. Decisions (2026-10-03)

| # | Question | Decision | Consequences in this spec |
|---|---|---|---|
| 1 | Audience | **All ages welcome; core demographic is high school to curious adults.** | Default tone is respectful and non-childish. Domain order favors physics, math, chemistry, economics, systems. Young-learner math boards stay as an accessible entry level, not the design center. Still apply minors' privacy/safety basics (§11.4) since all ages may join. |
| 2 | Code components | **Declarative-only for v1; community logic later.** | §6.6 sandbox is deferred (phase 7). v1 manifests must stay expressive enough (declarative Behaviors, expressions, supported actions) that this is workable. Design the manifest/version format now so sandboxed code components can be added without breaking existing packages. |
| 3 | Hosting | **Hosted public library.** | Phase 5 needs accounts, storage, moderation, and a hosting/cost plan (§11.15). Local-first runtime is kept: the library is the hosted piece, and caching lets sims run offline once downloaded. Self-hosted/classroom mirrors stay a later option, not a v1 goal. |
| 4 | 2D vs 3D | **2D first; 3D when it clearly helps.** | Sandbox engine, physics and tools target 2D first (§10.4). The architecture already separates model space from views, so a 3D view can be added per component (the town demo already uses 3D). Don't build a general 3D physics engine until a concrete need exists. |
| 5 | Adapter strategy | **One planner adapter plus domain explainers.** | §1.1 recommendation is confirmed. No per-domain planner adapters. Domain knowledge reaches the planner via retrieved component descriptions (§8, §9). |
| 6 | Game-like | **Pure sandbox.** | No campaign or levels. §10 "challenges" are demoted to optional, user- or community-made prompts, not a built-in progression. Do not build scoring or unlock systems in v1. Learning comes from experimentation and reflective prompts (§10.3). |
| 7 | Licensing | **CC BY 4.0 default with a license allow-list; training on community content is opt-in only.** | See §14.1. |

### 14.1 Licensing policy (confirmed 2026-10-03)
Confirmed as the working policy. It is not legal advice; have someone qualified review it before launch.

**Library content (components, compositions, assets)**
- Author keeps copyright. On upload they must pick a license from a short allow-list, e.g. **CC BY 4.0** (default), CC BY-SA 4.0, CC0, or MIT (code-like declarative logic).
- Avoid non-commercial and no-derivatives licenses. They break remixing, which is core to the product.
- Uploading grants the platform the right to host, display, and distribute the work. Remix lineage and attribution are kept automatically.
- Official `core.*` components need their own license too. Pick a permissive one.

**Adapters and model training**
- **Do not train on community uploads or user sessions by default.** Make it opt-in at upload time and for session logs. Users can opt out later for future training runs.
- Training sets should record provenance and the license of each item. Only include items whose license permits it and whose authors opted in.
- Synthetic data generated from *official* components (§1.3) needs no community consent and is the safe starting point.
- Check Apertus' own license terms before publishing derived adapters. Publish adapters under terms compatible with the base model's license, with a model card.
- Published adapters are not guaranteed to be "clean" of memorized training data. Another reason for opt-in only.

**Platform terms (minimum)**
- Terms of service with a takedown/DMCA-style process, a clear "what trains models" statement, and the privacy policy in §11.17.

> **Open item:** confirm Apertus' own license permits publishing derived adapters.
