# pAperSim — Hack Apertus Track 2B

pAperSim uses Apertus to assemble editable educational simulations from registered components. The application is under `track_2b/`, following the [official Hack Apertus project template](https://github.com/HackApertus/project-template). The original repository and Git history are retained.

## Run

With Docker Engine/Desktop, Compose, and GNU Make installed, run from this repository root:

```sh
make run
```

The command also works inside `track_2b/`. It downloads approximately 5.7 GB of pinned model artifacts on first use, builds the images for the Docker host, and starts web, Apertus, and Laya. Open **http://localhost:43100**. Setup requires internet access. AMD64 and Raspberry Pi execution remain unverified.

```sh
make stop
# Optional phone HTTPS:
COMPOSE_PROFILES=https make run
```

Stopping includes the optional HTTPS service and preserves model files and volumes. Guest saves belong to the browser and application origin. The default offline stack disables accounts, MongoDB, community publishing, and repair memory. Phone HTTPS needs the additional certificate and hostname setup in the deployment guide.

**AI generation is not established as reliable in the CPU Docker stack.** An earlier submission-copy smoke request failed despite healthy containers. The measured campaign used MLX on a Mac, not this Docker serving configuration. This refactor preserves the existing model build and does not import the experimental streaming transport or ARM compiler optimization.

## Documentation and report

- [Track instructions and application startup](track_2b/README.md)
- [Maintained documentation index](track_2b/docs/README.md)
- [Development and verification](track_2b/docs/DEVELOPMENT.md)
- [Docker deployment](track_2b/deploy/raspberry-pi/README.md)
- [Technical report](track_2b/technical_report.md) and [report PDF](track_2b/pAperSim_Report.pdf)
- [Frozen benchmark evidence](track_2b/docs/agent-only/benchmark/README.md) and [recorded data](track_2b/data/README.md)

Host-development, build, benchmark, evaluation, and stop commands are delegated to the application Makefile. Run package-specific commands from `track_2b/` as documented. `make dev` starts host web development; inference is separate. `make stop-dev` controls those host processes.

## Cleanup and provenance

Historical reports, speculative plans, loose screenshots, and duplicate report exports were archived before removal. The verified recovery archive is outside this repository: `project-cleanup-archive-20261015-211609.tar.gz`. It contains all 6,614 removed files, including ignored development evidence, with a SHA-256 inventory in `CLEANUP_MANIFEST.json`. The removed versions tracked by Git also remain recoverable from revision `ea95d04d030228dd8816c5a9938d160173ff163a`.

Frozen benchmark reports, manifests, measurements, gallery assets, runtime simulations, compatibility implementations, and optional repair-memory code remain. Historical attachment links are explained in the evidence guide; frozen report bytes are preserved.

The original full web contract runner has a pre-existing test/application mismatch at `track_2b/src/web/scripts/recipes/verify-contract.cjs:366`. It expects `requiredCapabilities`, while retrieval returns `ranked` and `cards`. This cleanup does not change the pipeline or remove that assertion to conceal the failure.

Before submission, confirm registered team details and the public demo URL, and review the separately edited Markdown/PDF versions. The existing Git remote is retained; this refactor does not publish changes.

## Licenses

Source code: [Apache-2.0](LICENSE). Documentation and reports: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Submitted project datasets: [CDLA-Permissive-2.0](https://cdla.dev/permissive-2-0/). Third-party materials retain their licenses and notices.
