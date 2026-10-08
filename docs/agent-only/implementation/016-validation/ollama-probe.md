# Ollama Probe and Latency Evidence

Date: 2026-10-08T13:16:25.047Z
Base URL: http://127.0.0.1:11434/v1
Model: apertus-16k

| Probe Check | Status | Measurements / Details |
| --- | --- | --- |
| Reachability & Model Listed | **PASS** | Found 3 models. Target model 'apertus-16k' present. |
| Enum & Object Schema Enforcement | **PASS** | 4126ms, parsed valid: {"choice":"friction","magnitude":25} |
| anyOf, Nullable & Array Enforcement | **PASS** | 249ms, parsed valid: {"status":"applied","values":[2,null,7]} |
| Adversarial Schema Constraint | **PASS** | 127ms, grammar enforced: {"mode":"allowed-value"} |
| Latency & Generation Speed Benchmark | **PASS** | 350 completion tokens in 3359ms (104.2 tok/s). Prompt tokens: 83. |

## Summary

- GPU offload: 100% GPU confirmed via `ollama ps` (VRAM: ~9.2 GB / 12.2 GB).
- Schema enforcement: OpenAI `response_format: { type: "json_schema" }` is strictly constrained by Ollama's grammar engine.
- Generation throughput: 104.2 tok/s.
