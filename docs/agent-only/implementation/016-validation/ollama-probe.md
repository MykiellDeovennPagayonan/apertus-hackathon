# Ollama Probe and Latency Evidence

Date: 2026-10-07T08:11:17.938Z
Base URL: http://127.0.0.1:11434/v1
Model: apertus-16k

| Probe Check | Status | Measurements / Details |
| --- | --- | --- |
| Reachability & Model Listed | **PASS** | Found 3 models. Target model 'apertus-16k' present. |
| Enum & Object Schema Enforcement | **PASS** | 257ms, parsed valid: {"choice":"friction","magnitude":25} |
| anyOf, Nullable & Array Enforcement | **PASS** | 268ms, parsed valid: {"status":"applied","values":[2,null,7]} |
| Adversarial Schema Constraint | **PASS** | 131ms, grammar enforced: {"mode":"allowed-value"} |
| Latency & Generation Speed Benchmark | **PASS** | 350 completion tokens in 3547ms (98.7 tok/s). Prompt tokens: 83. |

## Summary

- GPU offload: 100% GPU confirmed via `ollama ps` (VRAM: ~9.2 GB / 12.2 GB).
- Schema enforcement: OpenAI `response_format: { type: "json_schema" }` is strictly constrained by Ollama's grammar engine.
- Generation throughput: 98.7 tok/s.
