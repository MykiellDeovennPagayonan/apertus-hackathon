# pAperSim: Apertus-Assisted Component-Based Simulation Authoring 

pAperSim is a browser-based educational simulation authoring framework that uses Apertus 1.5 8B, an open-weight large language model (LLM), to create interactive simulations from natural-language instructions. Given a request, Apertus identifies the intended experiment and selects and configures predefined and community-contributed components. The application assembles these components into an editable simulation recipe, validates their connections, and executes the registered computational models.

This architecture allows the LLM to author simulations without generating the underlying simulation code.

Hack Apertus Online 2026 — Track 2B: Own Project.

[Demo video](https://www.youtube.com/watch?v=bpb16vIsMLg) · [Technical report (PDF)](track_2b/pAperSim_Report.pdf) · [Local deployment](#run-locally) · [Documentation](track_2b/docs/README.md)

![Projectile motion comparison simulation with independently adjustable launch angles.](track_2b/docs/papersim_paper/figures/projectile.png)

*Projectile motion comparison assembled by Apertus from registered components.*

## Motivation and objectives

Interactive simulations allow learners to explore complex concepts through experimentation. However, creating them requires implementing simulation logic, interactive controls, and visual representations. Access to educational technologies also remains unequal across classrooms, particularly in environments without reliable internet connectivity.

The primary objective of pAperSim is to provide an extensible framework for creating and customizing interactive educational simulations through natural-language instructions that can operate locally. Its objectives are:

- To support the visual and interactive exploration of abstract concepts through customizable educational simulations;
- To provide a framework for AI-assisted, component-based simulation creation;
- To evaluate Apertus’s capabilities and limitations in interpreting natural-language requests, selecting and configuring components, and producing executable simulations;
- To allow developers to create and contribute reusable components that extend the simulations available in pAperSim; and
- To make simulation authoring more accessible in environments with limited or no internet connectivity through local LLM inference and potential deployment on resource-constrained devices, such as a Raspberry Pi 5 with 8 GB RAM.

Local inference was tested on the Mac host. A Raspberry Pi 5 with 8 GB RAM remains a potential deployment platform, not a tested configuration in the report.

## Simulation authoring

pAperSim represents an educational experiment as a graph of reusable components, saved as a simulation recipe. Apertus interprets the user’s request and selects supported activities and settings, while the application assembles and validates the recipe and registered implementations execute it. Prepared simulations, manual editing, and AI-assisted authoring share this representation, so an experiment can be inspected and modified regardless of how it was created.

![AI-assisted simulation builder exposing the editable component graph for projectile comparison.](track_2b/docs/papersim_paper/figures/builder.png)

*The AI-assisted simulation builder exposes the editable component graph and supports refinement through manual and natural-language instructions.*

For a request such as “compare two projectile angles,” two projectile instances maintain independent angles and state. Each angle slider controls its own instance, while a shared launch control starts both. Their range and maximum-height outputs feed separate readouts, and their appearance attachments feed the same scene. Apertus selects and configures the experiment; the registered model supplies the calculations.

![Simple titration experiment assembled from registered components.](track_2b/docs/papersim_paper/figures/titration.png)

*Simple titration experiment assembled by Apertus from registered components.*

Recipes can be edited in the visual builder. The local deployment supports browser-local guest saves and JSON export. Community publishing requires separate online services and is disabled in the default offline stack.

## System design

The main technical contributions are a shared, typed simulation-recipe representation for manual and AI-assisted authoring, and a staged authoring pipeline for interpreting requests, selecting and configuring components, and validating executable recipes, with support for revision-safe editing.

### Components and simulation recipes

The registry contains components with different responsibilities: models compute simulation behavior, controls provide learner interactions, and displays present observations. Each component definition describes what can be configured and connected. Configuration schemas specify permitted settings, while typed ports and commands describe how the component exchanges values and responds to actions.

A recipe is the saved, executable description of an experiment. It records component instances and versions, their configurations and typed connections, scopes, layout, and instructional text.

The implementation described in the paper contains 458 public definitions, including 126 models, and 92 prepared recipes. Of these available resources, the active authoring catalog exposes 40 experiments and 135 component identities to Apertus. This catalog defines the scope of initial activity selection.

### Authoring pipeline

![Authoring pipeline: input, intent interpreter, relevant components, composer, authoring engine, validator, runtime engine, and simulation, supported by the component library and repair memory.](track_2b/docs/papersim_paper/figures/architecture.png)

Apertus identifies the teaching goal, concepts, required interactions and observations, explicit constraints, and whether the experiment calls for a single instance or a comparison. A lexical retriever ranks eligible activities using the request, interpreted intent, and capability metadata, retaining at most eight candidates.

Once an activity is selected, Apertus chooses optional controls, observations, and settings while preserving required inputs and playback. The application applies these choices, creates independently identified activity instances, preserves required connections, and arranges the interface.

Validators check versions and references, required inputs, connection scope and cardinality, and immediate value cycles. Invalid responses receive feedback about JSON formatting, schema violations, or semantic errors. The pipeline allows corrections within a bounded repair process before deciding whether to accept the recipe.

During execution, registered TypeScript providers initialize state, apply commands, compute outputs, and advance time-dependent models. React, SVG, and Three.js views use this state under a shared clock. Ordinary learner interactions do not invoke Apertus on every action or frame.

Laya provides optional selection advice. Repair memory is an optional subsystem and is disabled in the default deployment and recorded benchmark.

Implementation details are documented in the [component architecture](track_2b/docs/COMPONENT_ARCHITECTURE.md) and [creation/editing pipeline](track_2b/docs/agent-only/features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md).

## Experimental evaluation

On 14 October 2026, seven deployments were evaluated on the same 40 fixed prompts, with one scored attempt per deployment and prompt. All 280 attempts had recorded final outcomes. Internal repairs were bounded, and repair memory was disabled. The prompts covered the active benchmark catalog and were not an independent held-out set.

| Measure | Apertus 1.5 8B (local MXFP4) |
| --- | --- |
| Render completion | 38/40 (95.0%) |
| Repair-free completion | 30/40 (75.0%) |
| Median generation time | 28.98 seconds |
| P95 generation time | 37.72 seconds |

Render completion is the proportion of the 40 requests visibly rendered without an observed terminal error. Repair-free completion uses the same denominator but counts only rendered results with no recorded schema repairs, validator returns, or deterministic repairs. Timing statistics include successful generations only.

For Apertus, 30 requests completed without repairs and eight further requests rendered after formatting or schema corrections. Apertus used a local text-only MLX MXFP4 conversion of version 1.5 8B on an Apple M5 with 24 GiB system memory. The other models used hosted endpoints. Hardware, quantization, reasoning settings, and output enforcement were not controlled separately. The results characterize the evaluated deployments rather than isolate differences between the models themselves.

Four project-team members reviewed screenshots alongside the original prompts, completing 157 review responses. Reviewers could select several preferred results or none. This evaluation contains repeated judgments from four team members, not 157 independent participants. Screenshot preference does not measure learner interaction, scientific correctness, or learning gains; these were not evaluated.

The [technical report](track_2b/technical_report.md), [recorded data](track_2b/data/README.md), and [frozen benchmark evidence](track_2b/docs/agent-only/benchmark/README.md) provide the full results and methodology.

## Run locally

Install **Docker Engine/Desktop, Docker Compose, and GNU Make**, then run from the repository root:

```sh
make run
```

Open **http://localhost:43100**.

The first run requires internet access to download approximately **5.7 GB of pinned model artifacts**, including optional Laya artifacts, plus dependencies and container images/build layers. It builds images for the Docker host and starts the web application and Apertus. Laya is available through an optional profile described in the deployment guide. No host Node.js or Python installation, database, or API credentials are required. The command also works from `track_2b/`.

To use a separately managed local inference server on Linux, Windows, or macOS, or Hugging Face, configure `track_2b/deploy/raspberry-pi/.env` and run **`make run-external`**. This starts the Docker web app without downloading or starting bundled models. See [inference provider setup](track_2b/deploy/raspberry-pi/README.md#choose-hostlan-inference-or-hugging-face).

To stop the stack:

```sh
make stop
```

Stopping preserves model files and Docker volumes. Guest lessons belong to the browser and application origin; export important lessons before clearing browser data or changing the origin.

The default stack uses local services with `OFFLINE=true`. Accounts, MongoDB access, community publishing, hosted inference, and repair memory are disabled. The browser still needs access to the running web server. Optional phone HTTPS is available through `COMPOSE_PROFILES=https make run`, with additional certificate and hostname setup described in the [deployment guide](track_2b/deploy/raspberry-pi/README.md).

**Local inference verification:** The Docker web app connected to a local MLX inference server on Apple Silicon and successfully generated a projectile simulation with launch-speed and angle controls and a trajectory view. See the [inference setup guide](track_2b/deploy/raspberry-pi/README.md#choose-hostlan-inference-or-hugging-face) to configure your runtime or Hugging Face provider.

For host development, `make dev` starts the web development server; inference is configured separately. Follow the [development guide](track_2b/docs/DEVELOPMENT.md), and use `make stop-dev` to stop host development processes.

## Repository structure and documentation

The application lives under `track_2b/`, retaining the layout and Git history of the [Hack Apertus project template](https://github.com/HackApertus/project-template).

| Path | Contents |
| --- | --- |
| [`track_2b/src/web/`](track_2b/src/web/) | Web application, component registry, simulation runtime, and visual builder |
| [`track_2b/src/inference/`](track_2b/src/inference/) | Local Apertus and Laya serving helpers |
| [`track_2b/deploy/`](track_2b/deploy/) | Docker deployment and optional repair-memory setup |
| [`track_2b/src/playwright/`](track_2b/src/playwright/) | Fixed-prompt benchmark runner |
| [`track_2b/src/eval/`](track_2b/src/eval/) | Evaluation gallery and human review tooling |
| [`track_2b/data/`](track_2b/data/) | Recorded benchmark and human evaluation data |
| [`track_2b/docs/`](track_2b/docs/) | Architecture, authoring, development, and evidence guides |

For development or component contributions, start with the [development guide](track_2b/docs/DEVELOPMENT.md), [component architecture](track_2b/docs/COMPONENT_ARCHITECTURE.md), and [component contracts](track_2b/docs/agent-only/COMPONENT_CONTRACTS.md). The [manual builder guide](track_2b/docs/MANUAL_EXPERIMENT_BUILDER.md) explains authoring and local saves. Known verification issues are recorded in the development guide; historical evidence and attachment paths are covered by the benchmark evidence guide.

## Licenses

Source code: [Apache-2.0](LICENSE). Documentation and reports: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Submitted project datasets: [CDLA-Permissive-2.0](https://cdla.dev/permissive-2-0/). Third-party materials retain their licenses and notices.
