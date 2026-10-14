# 035 — Shared creation-pipeline repair loop

Date: 2026-10-14 (Asia/Manila).  
Status: complete; final full pass reached 39/40 (97.5%), exceeding the 36/40 minimum and 38/40 target.

Follow [creation-pipeline rules](../rules/CREATION-PIPELINE-RULES.md). Use [the fixed runner](../../../src/playwright/README.md) and [all 40 original prompts](../benchmark/final-benchmark-list.md). Score generation/rendering without observed errors only; this does not certify request fidelity or scientific correctness.

## Working loop

1. Read the completed run's screenshots, exact UI errors and request evidence. Separate runner/infrastructure failures from application outcomes.
2. Group failures by their shared source. Inspect callers, contracts and affected execution paths before editing.
3. Fix ownership, context or execution at that shared source. No benchmark dispatch, experiment-specific branches, accumulated synonyms, fixture answers, weakened validators or enlarged retry budgets.
4. Preserve the original request and Apertus-selected identities through selection, configuration, pruning and final checks. Registry facts constrain valid execution; they do not decide natural-language meaning.
5. Freeze changes, then run `make benchmark` once for all 40. No build, type check, verification script, additional application tests or database commands. Do not edit pipeline files during a pass.
6. Record the result, errors, regressions and changes below. Retain every run folder and screenshot; discard no failed samples. If fewer than 36 PASS, diagnose and repeat with a justified shared fix.
7. Stop when a complete pass reaches at least 36/40 and report what changed and what remains. Repeating without new evidence or a plausible corrective change is not a fix. Escalate a demonstrated external blocker rather than fabricating success.

## History

| Run | Changes | PASS / 40 | Rate | Outcome / evidence |
| --- | --- | --- | --- | --- |
| Baseline | Existing pipeline; corrected browser completion detector | 15 | 37.5% | [Report](../../../src/playwright/runs/2026-10-13T16-12-13-773Z-72437/report.md); 22 input-matching rejections, two activity-coverage rejections, one identical-comparison-configuration rejection; no timeouts. |

| Correction 1 | Semantic ownership and comparison feedback | 34 | 85% | [Report](../../../src/playwright/runs/2026-10-13T16-29-49-040Z-81114/report.md); 20 new passes, one regression; six errors, no timeouts. |

| Correction 2, interrupted | Coverage and control expansion; board metadata regression | — | — | [Partial report](../../../src/playwright/runs/2026-10-13T16-48-24-835Z-87688/report.md); stopped after repeated structural board-host errors; retained all submitted outcomes. |

| Geometry repair, interrupted | Optional presentation serialization | — | — | [Partial report](../../../src/playwright/runs/2026-10-13T16-51-12-719Z-88887/report.md); validation rejects present-but-undefined optional metadata; removed the property correctly before a new pass. |

| Final correction | Coverage, registered controls and geometry serialization repair | 39 | 97.5% | [Report](../../../src/playwright/runs/2026-10-13T16-52-52-901Z-89550/report.md); one input-binding rejection (tipping), no timeouts; threshold met, loop stopped. |

Earlier attempts were interrupted for a sandbox browser-launch restriction and a faulty runner check that required the empty-draft Apply button to be enabled. Their scores are invalid for application comparisons; the successful detector uses an editable composer and rendered workspace instead. Normal stream-reader cleanup is recorded separately from unsuccessful network transport.

## First shared correction

- Removed name-matched requirements and regex-extracted input phrases from live candidate retrieval, and removed their semantic eligibility filter before Apertus activity selection. Lexical scoring remains solely a retrieval ranking aid.
- Resolve requested interactions against the selected activity's actual model meanings, command bindings, labels, fields, units and limitations using Apertus. Preserve its supplied binding IDs; later presentation and final validation still reject missing or changed bindings.
- Give starting-setting selection prior values and the inferred comparison condition. When it proposes keeping identical defaults for a requested different-condition comparison, provide the existing rejection through the existing bounded repair mechanism rather than failing outside inference without feedback.

Legacy deterministic matching helpers remain for existing contract-script callers; they no longer determine requirements in this live creation path. Those scripts were not changed or run under the user's verification limits, and their old semantic expectations need a separate authorized update. No prompt-specific cases, new synonyms, catalog changes, additional retry allowances or validation bypasses are introduced.

## Limits

Runs use the local development app as a guest unless explicitly supplied account state. Private repair-memory capture and pgvector population are not evaluated. Server-selection traces are not available in the saved browser evidence; when multiple internal branches produce the same UI error, the exact branch remains unknown.

## Second shared correction

Activity selection now supplies scientific model meaning and registered commands, and Apertus reports whether the activity covers the remaining request. Bundled models are no longer excluded solely by the inferred count; incomplete compositions remain bounded by the existing instance budget and are rejected rather than silently accepted.

Selected activities offer registered scalar commands that lack template widgets using existing validated addBoundControl/hasBoundControl contracts. Apertus selects required input IDs; unrelated controls are pruned. Prepared source documents and binding identities travel together through configuration, pruning and validation. Only geometry is regenerated when new selected controls require placement. No special handling names a benchmark topic or prompt.

### Control-expansion structural repair

The second pass was interrupted after repeated board-host validation errors. Appending hypothetical controls adds layouts, so the original fixed board metadata is invalid during subsequent runtime initialization. The temporary expanded document now clears geometry immediately after an added control; when no new control is selected, original geometry is restored before final pruning. Scientific state, command contracts and validation remain unchanged. A fresh full pass follows; the interrupted pass is not used as a completed score.

The optional presentation reset now deletes the property instead of assigning undefined, matching the existing authored-document validation contract.

## Final outcome and remaining work

Completed full passes improved from 15/40 → 34/40 → 39/40. The final run took approximately 15 minutes 45 seconds, with median case time 22.9 seconds. All original 40 prompts, one-attempt policy, five-minute timeout, and error scoring remained unchanged. The final command exits nonzero because tipping failed; aggregate success is nevertheless 97.5%.

Tipping's current error is “The offered activities could not resolve all requested input bindings.” It passed in the earlier 85% run. The browser evidence does not identify which candidate(s) were rejected or distinguish selection variability from inadequate context. Preserve this failure and inspect those decisions if pursuing 40/40; do not add a topic-specific fallback.

No further full runs were launched after the requested threshold was met. A separately requested unchanged confirmation pass would establish repeatability for the measured scope. Correctness, interactions, usability, pgvector and private learning were excluded. Existing contract-script fixtures assume the former lexical resolution path and remain unmodified/unrun under the user's verification limits.
