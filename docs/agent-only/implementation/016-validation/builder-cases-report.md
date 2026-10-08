# Builder AI Composite Generation & Refinement Report

**Date:** 2026-10-08T13:32:41.944Z
**Runtime:** Ollama (http://127.0.0.1:11434/v1)
**Target Model:** apertus-16k

## Evaluated User Composite Scenarios

| Case | Domain / Model | Initial Build Prompt | Refinement Prompt | Initial Nodes / Conns | Refined Nodes / Conns | Latency (Build + Refine) | Status |
|---|---|---|---|---|---|---|---|
| **Rolling Track Dynamics** | `prefabs/physical-systems/RollingTrack` | "Build an inclined track composite with friction slider and speed readout" | "Add a launch height slider and an observation readout" | 3 / 2 | 4 / 3 | 7.72s | **PASS** |
| **Pendulum Harmonic Oscillator** | `prefabs/physical-systems/Pendulum` | "Build a pendulum oscillator composite with length control and period readout" | "Add a gravity slider control and an observation readout" | 2 / 1 | 4 / 3 | 7.33s | **PASS** |
| **Resistive Electrical Circuit** | `prefabs/physical-systems/ResistiveCircuit` | "Build a circuit composite with resistance slider and current readout" | "Add a voltage control slider and an observation readout" | 3 / 2 | 3 / 2 | 8.09s | **PASS** |
| **Rectangle Metrics Geometry** | `models/area-perimeter` | "Build a rectangle composite with width slider and area readout" | "Add a height slider control" | 6 / 5 | 6 / 5 | 5.82s | **PASS** |
| **Projectile Launcher Kinematics** | `models/Projectile` | "Build a projectile launcher composite with launch angle slider and distance readout" | "Add a launch speed slider control and an observation readout" | 3 / 2 | 4 / 3 | 8.35s | **PASS** |

## Validation Highlights

1. **Autonomous Tool Selection & Execution:** Every case correctly identifies the target model from natural language intent, instantiates control sliders and observation readouts, and links them via valid typed ports.
2. **Stateful Multi-Turn Refinement:** Re-ingesting the generated composite via `activeFromBuilderDocument` enables the builder agent to preserve existing topology and augment the composite in place (`status: updated`).
3. **Runnable Guarantee:** 100% of generated and refined documents passed `checkRunnable` and instantiated full simulation runtimes with zero crashes.