# Frozen benchmark evidence

Keep this folder with the submission. The Playwright runner reads [final-benchmark-list.md](final-benchmark-list.md). The data collector reads the campaign reports under `results/` and [component-catalog-report.md](component-catalog-report.md).

The original reports are preserved byte-for-byte because the [recorded data](../../../data/README.md) stores their SHA-256 hashes. Their links to `src/playwright/runs/` describe the original local runner evidence, which is not shipped. Those historical attachment links will not resolve in a fresh checkout.

Frozen run manifests are included under `data/benchmarking/runs/`; compact pipeline evidence is included under `data/benchmarking/`. The current published screenshots are in `src/eval/public/benchmarks/` and can be viewed with the [evaluation gallery](../../../src/eval/README.md). Current gallery entries may have newer per-prompt provenance; do not treat a current screenshot as a frozen campaign attachment without checking its run identity.

Historical implementation diaries and simulation design plans are omitted. Their removal does not change benchmark results or establish a new evaluation of the submission's deployment changes.
