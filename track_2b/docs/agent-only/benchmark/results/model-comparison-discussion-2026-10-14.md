# Model performance discussion: seven models on the 40-prompt simulation benchmark

Benchmark date: 14 October 2026. Discussion updated: 15 October 2026. Scope: seven completed batches containing 280 model–prompt outcomes, plus four human evaluation exports containing 157 reviewed ballots. This is an analysis of recorded evidence; no new inference or repair campaign was run. Combined statistics and provenance are available in [data/summary.json](../../../../data/summary.json), with metric definitions in the [data README](../../../../data/README.md).

**Apertus performed competitively in this application.** Its local 8B MXFP4 deployment rendered 38/40 requests, matching both Qwen configurations and finishing one result behind Llama and Mistral. Its main weaknesses were structured-output reliability and preserving the exact requested investigation through later selection stages. Its strongest deployment result was reaching that coverage locally with relatively consistent successful-generation times.

**Mistral Small 3.1 24B Instruct had the strongest combination of render coverage and repair-free completion:** 39/40 rendered, with no JSON/schema repairs or validator returns. Llama also rendered 39/40, but needed five recorded schema repairs. Sol's 32 successful results were also entirely repair-free, although it accepted fewer requests.

**Human preference strengthens Mistral's lead and distinguishes models that tied on rendering.** Mistral received 75 preferences and led the selection count in every evaluator export. Qwen3 32B followed with 56; Llama, Qwen3 8B, and Apertus received 50, 49, and 46. Luna and Sol each received 22. Mistral's lead persists on the same prompts where every model rendered, so availability alone does not explain it. These are nonexclusive screenshot preferences, not independent correctness scores or a general model ranking.

The discussion distinguishes three kinds of statements. **Observed** means the reports or diagnostics directly record it. **Documented** means an official model card or provider document describes it. **Hypothesis** means a plausible explanation inferred from those facts. Hypotheses about training effects, quantization, reasoning effort, or provider performance are not established causes: these batches did not isolate those variables.

The main scoring qualification is that a model can receive a render pass while producing an incomplete or incorrect activity. Another model can receive a render failure for correctly recognizing an unavailable interaction. That difference substantially affects the interpretation of Luna and Sol.

**What was measured.** Every model received the same 40 prompts, with one scored attempt per prompt, repair memory disabled, and bounded internal repairs enabled. All seven manifests have the same prompt hash and pipeline source fingerprint. The pipeline selects and configures registered simulation activities; the models are not independently writing and validating all of the underlying physics or rendering code. The original inputs are in the [benchmark prompt list](../final-benchmark-list.md).

Render success means that a generation visibly rendered without an observed terminal error. It does not establish complete instruction fulfillment, scientific accuracy, or successful learner interaction. The screenshot reviews supply additional qualitative evidence, but interactions were not exercised end to end.

| Model | Render success | Terminal failures | First-validator passes / reaching validation | Zero-repair successes / all 40 | JSON/schema repair attempts | Validator returns |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Apertus 8B | 38/40 — 95.0% | 2 — 5.0% | 38/38 | 30/40 — 75.0% | 13 | 0 |
| Llama 3.1 8B | 39/40 — 97.5% | 1 — 2.5% | 39/39 | 34/40 — 85.0% | 5 | 0 |
| Qwen3 8B | 38/40 — 95.0% | 2 — 5.0% | 37/39 | 37/40 — 92.5% | 0 | 2 |
| Qwen3 32B | 38/40 — 95.0% | 2 — 5.0% | 38/38 | 35/40 — 87.5% | 3 | 0 |
| Mistral Small 3.1 24B | 39/40 — 97.5% | 1 — 2.5% | 39/39 | 39/40 — 97.5% | 0 | 0 |
| GPT-6 Luna | 30/40 — 75.0% | 10 — 25.0% | 30/30 | 28/40 — 70.0% | 2 | 0 |
| GPT-6.1 Sol | 32/40 — 80.0% | 8 — 20.0% | 32/32 | 32/40 — 80.0% | 0 | 0 |

First-validator pass occurs after earlier interpretation and activity-selection stages. Apertus's 38/38 includes simulations that needed formatting repairs before validation. Sol's 32/32 excludes its eight unsupported outcomes. Zero-repair success is therefore a separate, more demanding completion measure. No deterministic repairs were recorded in any batch.

Across the campaign, 254/280 attempts rendered: **90.7%**. There were 235 successful completions with no recorded repairs, 23 JSON/schema repair attempts, and two validator returns. Of the 26 terminal failures, 23 ended unsupported through selection, capability checking, input binding, or the instance budget; one exhausted malformed-JSON repairs; one exhausted comparison-setting correction; and one was a provider HTTP 502. All 280 outcomes have terminal measurements.

**Timing statistics.** Values below are seconds and include only successful generations. The common-25 column uses the same 25 prompts that rendered under every model, reducing the effect of different success subsets. P95 uses the benchmark's nearest-rank calculation on each model's 30–39 successful samples.

| Model | Mean | Median | P95 | Maximum | Standard deviation | Median on common 25 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Apertus 8B | 29.44 | 28.98 | 37.72 | 47.14 | 6.33 | 28.97 |
| Llama 3.1 8B | 22.92 | 18.36 | 58.28 | 58.66 | 12.48 | 19.24 |
| Qwen3 8B | 22.75 | 20.46 | 45.12 | 51.35 | 10.66 | 16.37 |
| Qwen3 32B | 25.96 | 23.26 | 58.46 | 58.75 | 9.69 | 22.89 |
| Mistral Small 3.1 24B | 24.60 | 24.09 | 50.30 | 50.90 | 10.31 | 20.48 |
| GPT-6 Luna | 23.53 | 13.48 | 51.48 | 135.12 | 24.51 | 13.72 |
| GPT-6.1 Sol | 28.50 | 19.40 | 66.41 | 120.12 | 22.40 | 19.37 |

Apertus had the slowest typical successful generation but the lowest observed successful P95 and standard deviation. Luna had the fastest median and the largest isolated delay. Sol's mean approached Apertus's despite a substantially faster median because slow calls pulled its average upward. With a small sample, P95 can also conceal an isolated extreme: Luna's maximum was 135.12 s even though its P95 was 51.48 s.

These are submission-to-render times across several sequential stages. They combine model execution, input processing, provider behavior, orchestration, and rendering. They do not establish a hardware-normalized speed ranking. Apertus used local MLX inference; hosted hardware and quantization were not supplied. A successful pipeline can exceed the 120-second provider timeout because it contains several calls, each with its own duration. The pipeline timeout was 240 seconds.

Batch wall time includes screenshot and test overhead. Luna's shortest batch, 16 min 29.4 s, also benefited from ten failures ending in an average of about 9.4 seconds. A short batch is therefore not the same as high completed-lesson throughput. For reference, batch wall time divided by rendered results was 35.48 s for Apertus, 27.82 s for Llama, 29.11 s for Qwen3 8B, 32.38 s for Qwen3 32B, 28.69 s for Mistral, 32.98 s for Luna, and 38.59 s for Sol; these figures still include benchmark overhead.

**Human evaluation statistics and what they measure.** Four exports have distinct evaluator IDs. Two reviewed all 40 prompts; one reviewed 38, missing hydraulics and cell division; one reviewed 39, missing tipping. The three missing ballots are excluded, not counted as rejection. The available data contain 157 reviewed ballots, 62 sole-favorite judgments, 74 multiple-favorite judgments, and 21 none-preferred judgments. There were 320 model selections because several models could be preferred on one ballot. Source exports are preserved in [data/human-evaluations](../../../../data/human-evaluations).

| Model | Preferred / 157 ballots | Sole favorite | Preferred when its result rendered | Preferred on the common subset | Fractional tie credit |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mistral Small 3.1 24B | 75 — 47.8% | 21 | 75/153 — 49.0% | 49/99 — 49.5% | 39.59 |
| Qwen3 32B | 56 — 35.7% | 13 | 56/149 — 37.6% | 37/99 — 37.4% | 26.55 |
| Llama 3.1 8B | 50 — 31.8% | 11 | 50/154 — 32.5% | 35/99 — 35.4% | 21.00 |
| Qwen3 8B | 49 — 31.2% | 8 | 49/149 — 32.9% | 30/99 — 30.3% | 18.12 |
| Apertus 8B | 46 — 29.3% | 4 | 46/149 — 30.9% | 30/99 — 30.3% | 15.90 |
| GPT-6 Luna | 22 — 14.0% | 2 | 22/118 — 18.6% | 18/99 — 18.2% | 7.50 |
| GPT-6.1 Sol | 22 — 14.0% | 3 | 22/126 — 17.5% | 12/99 — 12.1% | 7.32 |

The overall preference rate measures selection among all reviewed ballots, including requests where a model failed to produce a selectable result. The rendered-result rate excludes those failures but still compares different prompt mixes. The common subset uses the same 25 simulations that rendered under all seven models, yielding 99 reviewed ballots because one cell-division answer is missing. It is the stronger comparison for separating appearance preferences from render availability, although it covers only that subset. See [human model statistics](../../../../data/human-evaluations/model-statistics.json).

Fractional credit gives each selected model `1 / number of selected models` on a ballot. None-preferred contributes no model credit; total credit is therefore 136. This is a sensitivity check, not the original rubric. Mistral remains first and Qwen3 32B second under this normalization. It reduces the influence of broad co-selection within a ballot, but it does not establish equal reviewer standards or independent observations.

| Source export | Reviewed | None preferred | Total model selections | Mean selections per ballot | Mistral selections |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Original f32ae941 export](../../../../data/human-evaluations/evaluation-f32ae941d2093555b5cb990fbc9ca5d3.json) | 40 | 8 | 77 | 1.93 | 20 |
| [a9ef80c6 export](../../../../data/human-evaluations/evaluation-a9ef80c6f93c0969af45cd8c5459a8af.json) | 40 | 1 | 86 | 2.15 | 21 |
| [da861cdd export](../../../../data/human-evaluations/evaluation-da861cdde63c91ee11d232dfa669c379.json) | 38 | 4 | 108 | 2.84 | 23 |
| [47306fd3 export](../../../../data/human-evaluations/evaluation-47306fd36d0df4fc0831f35f5a0af998.json) | 39 | 8 | 49 | 1.26 | 11 |

The evaluators differed substantially in selectivity. Mistral nevertheless had the highest raw selection count in every export, making its aggregate lead more consistent than a result driven by one generous reviewer. The smaller differences among Llama, Qwen3 8B, and Apertus should remain tentative: their counts differ by only one to four selections, across four evaluator exports rather than 157 independent people. Distinct IDs alone do not prove participant independence or a representative sample.

The local [evaluation interface](../../../../src/eval/public/app.js) labels cards as Result A, Result B, and so on, with order shuffled per question. This design reduces direct identity and fixed-position cues. However, a measurements view exposes model information, and the exports do not record which information reviewers inspected. Full blinding is not established. Exports also omit screenshot version IDs and candidate-exposure histories; the availability comparison uses the fixed campaign whose current local manifests matched these runs.

**How to interpret preference hypotheses.** The exports do not contain comments explaining choices. The hypotheses below connect preferences with the recorded screenshot observations: visible controls, informative readouts, comparison structure, starting states, and apparent task fit. A vote cannot establish which feature caused the choice. Screenshots also cannot demonstrate whether an animation, control, or physical relationship works correctly. Zero repairs, faster inference, or an Instruct label should not be treated as direct reasons for visual preference merely because they correlate with a favored model.

**Shared factors that affect the model explanations.** The pipeline's retrieval query combines the original request with the generated goal, concepts, and interactions, then keeps eight candidates. Consequently, the model's initial wording can change which activities it later sees. If the correct activity is absent, subsequent selection cannot recover it from outside that set. See the [retrieval implementation](../../../../src/web/src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts).

The output modes also differed. Apertus's 276 recorded inference-stage events used `constrained:false`; hosted inference events recorded `constrained:true`. Hosted schema support is therefore an important contributor to clean formatting. The flag is deployment evidence, not a guarantee that every hosted response can never be truncated or interrupted. OpenAI's documentation describes schema adherence as the purpose of Structured Outputs; it does not make schema compliance a semantic correctness test. [Official OpenAI structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

Laya was called for 279 selection decisions; Apertus's induction failure occurred before that stage. Only 11 decisions passed the acceptance policy. Apertus had zero accepted recommendations out of 39 calls. Rejected recommendations allowed main-model selection to continue, so the batches do not establish that Laya improved coverage. They evaluate the combined application without a Laya ablation. See the [selection acceptance path](../../../../src/web/src/simulations/creation-and-editing/component-selection/selectAssemblies.ts) and [assembly planner](../../../../src/web/src/simulations/creation-and-editing/component-selection/assemblyPlan.ts).

**Apertus 8B: broad local coverage, with schema and semantic boundaries as the main weaknesses.**

**Observed.** Apertus rendered 38/40, with 30 repair-free successes. Thus, 78.9% of its successful results needed no repairs. Eight successful prompts required JSON/schema correction; the failed magnet-induction prompt consumed three more repair attempts. Its other terminal failure was voting systems.

The induction intent correctly described magnetic flux, induced current, speed, and direction. The failure was a repeated JSON nesting mistake near the final question field. The responses stopped normally and were far below the stage token ceiling. The trace supports a serialization explanation, rather than a conclusion that the model could not understand induction.

Other corrections involved using descriptive setting names such as `height` or `rear` instead of supplied setting IDs, and returning explanations where typed values were required. For gas equilibrium, it returned a sentence about pressure where a numerical volume was expected. For slope, it returned equation text where the setting required an object. These are differences between knowing what a quantity means and expressing the exact executable argument.

Voting selected the appropriate activity, rejected it during input checking, then tried tree-height and wildfire alternatives, which were also rejected. The generated intent had expanded the request to include proportional representation even though the available voting activity described a single elected position. The support response did not record a rationale, so that expansion is only a possible contributor.

Bridge was more serious: Apertus first selected the bridge, rejected support, then accepted tree-height. The screenshot retained a bridge-stress question above a tree diagram. It also produced one rectangle for a two-rectangle request and division/sharing for multiplication. A valid document was therefore possible even after the requested investigation had been lost.

Its mean of 29.44 s was close to its 28.98 s median. About 77.9% of recorded inference time went into intent interpretation and activity selection, leaving those stages as the clearest measured latency targets.

**Human preference.** Apertus was selected on 46/157 ballots, with four sole favorites. It received 30/99 preferences on the common subset, tying Qwen3 8B there. Its strongest agreement was wildfire, selected by all four evaluators, and cell division, selected by all three who reviewed it. Hydraulics was the sole favorite for two of three evaluators. Can material, levers, cooling drinks, spectrophotometry, and water pressure each attracted three selections.

**Why reviewers may have preferred Apertus.** A plausible explanation is that its stronger results kept the main investigation and controls easy to recognize. The wildfire review described three main controls and compact extras; hydraulics exposed three primary controls; cell division showed stage buttons and an error toggle. These visible affordances make a screenshot communicate what the learner can change. This is a hypothesis based on the reviews and votes, not a recorded reviewer explanation.

Its 42 nonexclusive selections and four sole favorites suggest that Apertus often belonged among the acceptable-looking contenders but less often stood out as the uniquely preferred result. A plausible contributor is that competing outputs sometimes offered more explicit result readouts or clearer comparison structure. Its local quantization and slower generation cannot be blamed directly for visual preference: reviewers selected final screenshots, and the data do not link those internal factors to particular choices. The evidence supports improving presentation and exact task coverage alongside serialization reliability.

**Working hypotheses.**

- **Strongly supported: unconstrained output exposed formatting mistakes that hosted schemas could prevent.** Repeated delimiter errors and invalid candidate names fit this explanation directly. The model had to satisfy syntax and argument contracts through token generation and subsequent parsing. This is a deployment disadvantage in the current comparison, although it does not explain wrong activity selection.
- **Moderate confidence: instruction-following and tool-use post-training made the model sufficiently capable for bounded catalog decisions.** The official Apertus card describes improved instruction following and tool use. Many stages ask for a small choice or value instead of an entire program, so competent language understanding can produce broad coverage when executable models already exist. The training card provides context; it does not prove which training change caused this score. [Official Apertus model card](https://huggingface.co/swiss-ai/Apertus-v1.5-8B).
- **Moderate confidence: accepting a related activity inflated apparent success in some cases.** The bridge replacement and incomplete rectangle comparison suggest that local checks sometimes accepted partial semantic resemblance. That helps the render metric while reducing exact fulfillment.
- **Plausible but untested: low-precision quantization contributed to brittle punctuation or identifier selection.** The tested artifact was an independent MXFP4 text conversion. Quantization is a candidate explanation, but no higher-precision run of the same model was made here. Its conversion card's perplexity measurements cannot establish instruction-following loss on this benchmark. [Tested conversion's model card](https://huggingface.co/m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4).
- **Plausible but untested: local execution contributed to the smaller latency spread.** Removing remote inference transport can reduce one source of variability, but prompt complexity, caching, local scheduling, and hardware behavior were not separately measured. The benchmark does not isolate network or queue time.

The most useful checks would compare the same Apertus weights with enforced schemas and then with higher precision, while keeping prompts, retrieval candidates, and budgets fixed. This would separate output-mode effects from quantization effects. Independently checking activity identity and required interactions would test the semantic explanation.

Evidence: [Apertus batch report](apertus-laya-40-2026-10-14T04-18-05-230Z-16457.md).

**Mistral Small 3.1 24B Instruct: the cleanest combination of coverage and completion in this batch.**

**Observed.** Mistral rendered 39/40, and all 39 successes completed without JSON/schema repair or validator return. It tied Llama for the lowest terminal failure rate, 2.5%, while having a cleaner completion record. Its sole failure was galvanic cell.

That failure began with retrieval. The correct electrochemical activity was absent from its eight candidates, which included an RC circuit, spectrophotometry, and unrelated activities. Mistral returned unavailable. The outcome does not establish a chemistry-knowledge limitation; the relevant executable option was never offered.

Mistral often selected useful numerical observations, including production, pH/equivalence, and equilibrium readouts. Nevertheless, it produced a single rectangle for the comparison request and division for multiplication. It also accepted activities missing explicitly requested adjustments, and its buoyancy capture showed an overloaded hull. Zero repairs therefore means clean pipeline completion, not perfect interpretation of every request.

Its mean and median were almost identical, 24.60 and 24.09 s, with P95 at 50.30 s. It had 292 recorded inference-stage events. No provider outage ended a prompt in this batch.

**Human preference.** Mistral received 75/157 selections and 21 sole favorites. It led raw selection counts in every export and received 49/99 selections on the common subset. All four evaluators selected only Mistral for cost and profit, phase change, and equal groups. All four also selected it for projectile, price elasticity, arithmetic, and gas equilibrium, although those preferences were not uniformly exclusive.

**Why reviewers may have preferred Mistral.** The strongest presentation hypothesis is that it more often made the outcome visible, not merely the apparatus. Its factory activity showed production readouts; cost/profit showed output readouts; phase change showed the chamber, phase diagram, and readouts. Those additions could help a reviewer see the relationship between a learner adjustment and a result. This fits the votes and qualitative notes, but the export provides no direct explanation. The phase-change review still reported lower controls overlapping the composer, so the preferences do not establish flawless layout.

The combination of instruction-following task fit and selecting useful observations may explain why clean technical completion also translated into preferred screenshots. The link to post-training remains conjectural: zero JSON repairs are not themselves visible evidence of a better lesson. Its broad preference lead is more directly established than the claim that instruction tuning caused it.

An important counterexample is equal groups. All four preferred only Mistral even though its result was division/sharing rather than the requested multiplication construction. Human agreement can therefore favor the most appealing available approximation. Mistral's strongest combined result is high availability plus perceived presentation quality; complete instruction fulfillment still requires separate checking.

**Why might this Instruct model have done so well?**

- **Moderate confidence: its post-training emphasis fits the task format.** Mistral's official card explicitly emphasizes system-prompt adherence, function calling, and JSON output. Those capabilities align with choosing supplied IDs, keeping responses small, and filling typed arguments. This is a more specific explanation than assuming it knows more physics. The card's capability claims are provider descriptions, not independent proof of the cause. [Official Mistral model card](https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503).
- **Strongly supported contributor: hosted structured output reduced opportunities for malformed responses.** All its recorded calls used constrained output. This plausibly explains part of the contrast with Apertus. Other hosted models also had constraints, so constraints alone cannot explain Mistral's complete result.
- **Moderate confidence: it matched the pipeline's completion style well.** It generally moved through candidate selection, configuration, and presentation without exhausting correction bounds or leaving the planner incomplete. A model can be a good fit for these short decisions without being the strongest on every general reasoning task.
- **Moderate confidence: permissive capability judgments increased render coverage.** Its successful but incomplete rectangle and multiplication results show that it sometimes accepted approximations. Part of its high score may reflect willingness to use the available lesson, even when exact request coverage was weaker.
- **Low confidence: its 24B capacity helped keep long capability descriptions and response rules consistent.** This is plausible, but Qwen3 32B did not complete more requests, and the experiment did not compare Mistral sizes under identical serving conditions. Parameter count is not an isolated explanation.
- **Observed circumstance: this batch avoided terminal provider errors.** One provider failure would have changed the score by 2.5 percentage points. Operational variation matters when the leaders differ by one prompt.

The word **Instruct** alone is insufficient to explain the win. Llama was also an Instruct model, and Apertus and Qwen have instruction-following post-training. The plausible explanation is the combination of that particular model's task fit, structured-output serving, completion judgments, and this batch's operational reliability.

A useful test would hold output constraints and candidate lists equal across models, then grade exact requested controls and comparison coverage. If Mistral remains ahead under that rubric, its advantage would be stronger evidence of semantic orchestration skill. Turning off schema enforcement in a controlled comparison would separately test how much of its clean output belongs to the model and how much to serving.

Evidence: [Mistral batch report](mistral-small-3.1-24b-huggingface-laya-40-2026-10-14T06-58-22-525Z-60750.md).

**Llama 3.1 8B Instruct: high render availability, with permissive judgments about related activities.**

**Observed.** Llama rendered 39/40, with a median of 18.36 s and P95 of 58.28 s. Its only terminal failure was an HTTP 502 on hydraulics. That belongs in the end-to-end reliability score, but supplies little evidence about its understanding of the subject.

The more consequential errors occurred inside successful renders. A battery request became a Beer–Lambert spectrophotometer, addition became counting, two rectangles became one, and multiplication became division/sharing. For the battery request, the correct galvanic activity was absent from retrieval. Llama selected spectrophotometry and declared its inputs sufficient. For addition, the correct addition activity was available, but it chose counting.

It had five recorded schema repairs, although four repair reasons were simply `terminated`. The records do not support treating all five as malformed JSON authored by the model. It had 375 recorded inference-stage events, including substantial configuration work.

**Human preference.** Llama received 50/157 selections and eleven sole favorites. On the common subset it received 35/99, between Qwen3 32B and the Apertus/Qwen3 8B pair. Every evaluator selected only Llama for RC. Every evaluator selected it for fishing lake, with three choosing it alone. All four selected it for spectrophotometry and water pressure; three selected it for collisions.

**Why reviewers may have preferred Llama.** A particularly plausible explanation is the visibility of actions needed to explore change over time. Its RC screenshot review explicitly described advance/reset buttons as well as a connection selector; its fishing-lake review described a 30-day playback button. Some competing reviews mentioned only a selector or no visible progression control. Such affordances could make an activity feel more actionable even in a static capture. Actual progression was not exercised by this evaluation, and reviewers supplied no rationale.

This gives Llama a more specific human strength than its render score alone suggested: some activities communicated an immediate way to investigate the system. It does not remove the wrong battery and addition selections elsewhere. The unanimous RC preference also does not supply the missing resistance adjustment requested by the original prompt. The observations support a presentation-affordance hypothesis while retaining the capability-coverage limitation.

**Working hypotheses.**

- **Moderate confidence: an instruction-following, helpful response style supported broad completion.** Meta documents supervised fine-tuning and reinforcement learning with human feedback for the tuned models. Those objectives provide context for producing actionable responses. They do not prove that training for helpfulness caused the specific substitutions observed here. [Official Llama model card](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct).
- **Strongly supported behavioral interpretation: the model sometimes accepted surface-level relationships as sufficient.** Concentration connects electrochemistry and spectrophotometry; circles and totals connect addition and counting. In these traces, Llama accepted the related activity despite a different requested system or operation. Its high render score partly reflects that permissiveness.
- **Moderate confidence: bounded catalog work was within the useful capacity of an 8B model.** Executable recipes supplied the simulation behavior, while the model mainly chose and configured them. The score therefore need not imply that an 8B model independently solved every scientific system.
- **Strongly supported qualification: the terminal failure was operational.** A successful provider response could have allowed hydraulics to continue, but the unobserved outcome cannot be assumed to have succeeded.

An exact-activity rubric would test whether the completion advantage persists after rejecting substitutions. Repeating the provider-sensitive cases would distinguish model behavior from service reliability. Restoring the galvanic activity to an identical candidate set would test whether the battery substitution came mainly from missing retrieval or from weak support checking.

Evidence: [Llama batch report](llama-3.1-8b-huggingface-laya-40-2026-10-14T05-38-00-070Z-35031.md).

**Qwen3 8B: clean formatting and effective correction on some comparisons, with inconsistent comparison semantics.**

**Observed.** Qwen3 8B rendered 38/40 with zero JSON repairs. Thirty-seven successes needed no repairs of any kind. Its two validator returns occurred on rectangles and voting; one recovered and one ended in failure.

Rectangles supplied the strongest reported two-instance result. Qwen selected the activity twice, initially chose identical dimensions, received feedback, and changed the second height from 4 to 5. It produced two independently controlled rectangles. Its lower first-validator pass rate therefore accompanied a better final comparison than the uncorrected single-rectangle renders.

Voting exposed the limit of that correction behavior. It created two election instances but repeatedly returned `done` while their comparison settings remained identical. The requested relationship was to preserve ballots and change the voting rule. It did not produce that distinction within the repair bound.

Its galvanic failure began with the correct activity missing from retrieval. It tried spectrophotometry, phase change, and tree-height, rejecting each during capability checking. That avoided a wrong final activity, although it spent time exploring unrelated options.

It also duplicated the whole factory comparison and produced two division activities for equal groups. Two survey charts began at the same sample size, 20, weakening the small-versus-large contrast. It had the most recorded inference-stage events, 398, but the lowest successful mean, 22.75 s, and a common-25 median of 16.37 s.

**Human preference.** Qwen3 8B received 49/157 selections and eight sole favorites, almost the same total as Llama. Its 30/99 common-subset selections tied Apertus. Guitar string was the sole favorite for three of four evaluators. All three evaluators who reviewed cell division selected it. Survey sampling and rectangles each received two preferences.

**Why reviewers may have preferred Qwen3 8B.** Its willingness to construct multiple instances could make comparisons more visible. The guitar capture showed two string modes, and rectangles showed two independently controlled shapes. For a screenshot comparison, showing both states at once may be more immediately informative than requiring the reviewer to imagine changing one object. That interpretation fits these outputs, but it remains a guess about the evaluator's criteria.

This behavior is useful only when duplication expresses the requested comparison. The factory duplication and identical survey starting sizes show that more instances are not automatically better. The guitar result also had overlapping controls and no visible tension adjustment, yet three evaluators chose it alone. Preference may have rewarded the visual comparison despite missing part of the requested investigation. Conversely, the genuinely more complete rectangle pair received fewer selections than Luna's single rectangle, showing that semantic completeness alone did not determine these votes.

**Working hypotheses.**

- **Moderate confidence: the explicitly disabled thinking mode fit short structured decisions well.** The official Qwen card describes non-thinking mode as an efficiency-oriented mode that omits thinking content. Small candidate-choice and value-setting stages can benefit from that directness. The benchmark establishes the configuration and observed speed, not the size of any improvement caused by disabling thinking. [Official Qwen3 8B model card](https://huggingface.co/Qwen/Qwen3-8B).
- **Strongly supported contributor: constrained output protected syntax while leaving semantic decisions fallible.** Zero JSON repairs coexisted with a terminal comparison-setting failure. Producing the right JSON shape was easier than deciding which values had to differ.
- **Moderate confidence: it treated comparisons as repeated construction tasks.** That helped with independently controlled rectangles but also produced duplicated factory and division activities. The hard decision was whether an activity already contained a comparison or needed duplication.
- **Moderate confidence: numeric correction was easier than preserving a relational constraint.** Changing a duplicate rectangle height was a narrow correction. Keeping identical ballots while changing only the election rule required a more specific distinction between shared and differing settings. The contrast suggests this difficulty, but two cases cannot establish a general reasoning hierarchy.

Tests should separately cover one activity containing multiple objects, two independent activity instances, and paired instances that share inputs while differing in one setting. Keeping the comparison relationship explicit would help determine whether the main problem was task interpretation or failure to apply corrective feedback.

Evidence: [Qwen3 8B batch report](qwen3-8b-huggingface-laya-40-2026-10-14T05-19-00-653Z-25103.md).

**Qwen3 32B: similar render coverage, with a reasoning-budget and planner-completion mismatch as plausible bottlenecks.**

**Observed.** Qwen3 32B rendered 38/40, with three JSON/schema repairs and no validator returns. All three repairs followed 768-token truncations during intent interpretation: galvanic cell, phase change, and pendulum. Each recovered. Intent interpretation accounted for approximately 74.8% of its recorded inference time.

Unlike the 8B route, the recorded unqualified Hugging Face route had no explicit thinking override. Its mean was 25.96 s, median 23.26 s, and P95 58.46 s. The provider hardware and quantization were not recorded.

Rectangles failed despite selecting the correct activity twice. It returned `complete:false` after both choices; once the instance budget was exhausted, the planner ended unsupported. The failure concerned the meaning of the completion flag, not area calculation. RC also ended unsupported, corresponding to the absent resistance-adjustment command.

It correctly rendered bridge and voting, but still produced division for multiplication. Its buoyancy scene showed a flooded hull sinking instead of demonstrating a sealed ship floating.

**Human preference.** Qwen3 32B was second overall with 56/157 selections and thirteen sole favorites. It received 37/99 on the common subset, ahead of Qwen3 8B despite identical 38/40 render counts. All four evaluators selected it for galvanic cell, magnet induction, arithmetic, and pendulum. Galvanic cell was its sole preference for three evaluators; slope was its sole preference for three as well. This distinguishes the quality of some accepted outputs from its unchanged render coverage.

**Why reviewers may have preferred Qwen3 32B.** A plausible explanation is clearer communication of the measured relationship. Galvanic cell included voltage/reaction readouts with two concentration controls; pendulum included a period readout; slope included an equation readout beside its controls. Those outputs may help a reviewer connect an adjustment to an observable result. Magnet induction also exposed position and signed-speed controls, while Luna's review lacked a visible position adjustment.

The larger model or longer interpretation could have helped select informative observations, but neither was isolated as a cause. Its timing cost might have bought better choices on some prompts, or the difference might instead arise from configuration and serving behavior. The narrower observed conclusion is that identical completion rates concealed a human preference difference. Its failed rectangle completion flag and flooded buoyancy state remain counterexamples to a general quality advantage.

**Working hypotheses.**

- **Moderate confidence: thinking or longer interpretation output competed with the small stage budget.** Qwen's official card states that its chat template enables thinking by default. Together with three exact-cap truncations and the large interpretation-time share, this makes a mode/budget mismatch plausible. The actual hosted route's thinking behavior was not confirmed, and truncated content was unavailable, so thinking cannot be named as the proven cause. [Official Qwen3 32B model card](https://huggingface.co/Qwen/Qwen3-32B).
- **Strongly supported: protocol decisions limited completion despite correct topic selection.** Returning an incomplete flag after selecting the second rectangle was enough to fail the pipeline. Additional scientific knowledge would not, by itself, correct that interface decision.
- **Moderate confidence: greater capability did not translate into a better fit for every bounded stage.** The task required concise commitment to supplied IDs and completion states. More elaborate interpretation could add latency or qualification without improving a binary planner decision.
- **Plausible but untested: stricter capability interpretation helped explain the RC decline.** The original request required resistance adjustment, and the available circuit did not expose it. Declining that request can be a sound judgment even though the render metric penalizes it.

The cleanest comparison would use explicit non-thinking settings for both Qwen sizes, identical stage budgets, and the same retrieved candidates. A separate run with enough room for thinking could test whether extra computation improves exact request fulfillment. This would help separate model size from mode, route, and truncation effects.

Evidence: [Qwen3 32B batch report](qwen3-32b-huggingface-laya-40-2026-10-14T06-14-16-814Z-46582.md).

**GPT-6 Luna: a fast typical response, with frequent unsupported decisions at capability boundaries.**

**Observed.** Luna rendered 30/40, and all ten terminal failures ended unsupported. Its successful outputs were generally clean: two schema repairs, no validator returns, and 28 repair-free successes. It ran at `reasoningEffort:none`.

Some declines corresponded to real catalog limitations. Production quantity, cart masses, and string tension were requested learner adjustments that the relevant executable activities did not expose. Pushing a cabinet also differed from the catalog's quasi-static tilt model.

Other declines appear avoidable. The price-elasticity activity had a price command and a quantity-demanded output, yet Luna rejected support. Bicycle gears supplied the front/rear gear controls but were also rejected. Its support responses generally gave no explanation beyond a boolean, preventing a definitive attribution.

Its successful screenshots often placed controls in collapsed disclosures, and some secondary panels were clipped. It still accepted one rectangle for a two-rectangle request and division for multiplication. Therefore, frequent abstention did not guarantee consistent semantic accuracy.

Its median was 13.48 s, but its mean rose to 23.53 s. Pulleys took 135.12 s, including 87.90 s in the initial interpretation call for 143 output tokens. The trace locates the delay but does not isolate provider queueing, network time, or model execution.

**Human preference.** Luna received 22/157 selections and two sole favorites. It was preferred on 22/118 ballots where its result rendered, 18.6%, and on 18/99 ballots in the common subset. Its low total therefore cannot be attributed entirely to the ten missing results. Cooling drinks and rectangles each attracted three preferences. Its exclusive choices were one tile-pattern vote and one rectangle vote, illustrating isolated appeal rather than no appeal.

**Why reviewers may have preferred Luna less often.** The most plausible screenshot-level explanation is that some usable controls or observations were less prominent. Its titration volume control was hidden in extras; water-pressure controls were collapsed; some secondary panels were clipped. A reviewer may prefer a screenshot that makes the next learner action and resulting observation obvious. This is supported as a candidate explanation by the qualitative reviews, but no evaluator comments establish it.

The positive cases suggest the same model could produce attractive scenes when the outcome was easy to read. Its cooling comparison showed two conditions with shared playback, while its rectangle screenshot included area/perimeter readouts. Three evaluators selecting the incomplete single rectangle also show that the preference rubric could reward legibility over exact comparison coverage. Increasing reasoning effort might help interpretation and support checks, but these votes do not show that it would fix shared layout behavior or make the screenshots more appealing.

**Why might Luna have performed poorly on the render metric?**

- **Strongly supported behavioral explanation: capability rejection, rather than malformed output, dominated failure.** All ten failures were unsupported outcomes. The principal weakness to investigate is the support decision, not JSON generation.
- **Moderate confidence: a literal reading of complete-coverage instructions produced some reasonable declines.** The checker tells the model to accept only a fully supported requested investigation. On missing controls, Luna may have followed that rule more closely than models that produced incomplete renders. Such outcomes lower the score without establishing worse scientific understanding.
- **Moderate confidence: no-reasoning configuration reduced opportunities to resolve informal language into executable contracts.** Front/back gears must be mapped to gear-tooth commands, and everyday buying language must be mapped to quantity demanded. OpenAI documents a speed/quality tradeoff in reasoning effort. An effort increase might improve those mappings, but the current run does not show that it would. More reasoning also cannot create absent commands. [Official OpenAI reasoning documentation](https://developers.openai.com/api/docs/guides/reasoning).
- **Moderate confidence: a focused, efficient model may be less consistent when a small output requires a broad semantic judgment.** Luna is documented as a model for focused, high-volume work. The response schema was small, but the decision could require reading many capabilities and reconciling physical meaning, available actions, and comparison coverage. That task may be more demanding than its output length suggests. This is a task-fit hypothesis, not evidence of a model-specific architectural cause. [Official Luna model page](https://developers.openai.com/api/docs/models/gpt-6-luna).
- **Plausible but untested: the binary gate made uncertainty expensive.** Returning `supported:false` stops or redirects the planner; the schema does not express a qualified approximation or negotiate a narrower lesson. Uncertainty about a contract could therefore become a terminal unsupported result.

The next useful check would hold candidates and prompts fixed, vary Luna's supported reasoning effort, and grade whether each unsupported judgment is correct. Price elasticity and bicycle gears are particularly useful for investigating false declines, while production quantity and string tension test correct recognition of missing capabilities. This would distinguish a reasoning-setting effect from a genuinely unavailable lesson.

Evidence: [Luna batch report](gpt-6-luna-openai-laya-40-2026-10-14T05-56-54-380Z-41033.md).

**GPT-6.1 Sol: perfect repair-free completion among accepted requests, with strict capability judgments and retrieval problems limiting coverage.**

**Observed.** Sol rendered 32/40. All 32 successes required zero repairs, and all eight failures ended unsupported. It ran at `reasoningEffort:low`, with a 4096-token provider ceiling. Its mean was 28.50 s, median 19.40 s, and P95 66.41 s.

Several declines aligned with absent executable interactions:

| Requested interaction | Available executable controls | Interpretation |
| --- | --- | --- |
| Change production quantity | Market price and fixed cost | Quantity is calculated as an optimum; no learner quantity command |
| Change cart masses | Starting speeds and collide/reset | Mass adjustment is absent |
| Change string tension | Length, wave phase, harmonic | Tension is fixed in the declared model |
| Change RC resistance | Connection, advance, restart | No declared resistance-adjustment command |

These distinctions are visible in the [economics contracts](../../../../src/web/src/simulations/domains/economics/index.ts), [collision and tipping contracts](../../../../src/web/src/simulations/domains/physics/mechanics.ts), and [string/RC contracts](../../../../src/web/src/simulations/domains/physics/thermalOptics.ts). The wildfire activity also has a fixed vegetation pattern with treatment, wind, and moisture controls, rather than an unrestricted vegetation-amount parameter.

The galvanic failure began with the correct activity missing from retrieval. For rectangles, Sol selected an incomplete single-instance activity, rejected its support, and stopped instead of assembling two instances. These are distinct from missing physical commands.

Relative to Luna, Sol recovered price elasticity, bicycle gears, buoyancy, voting, and bridge, but lost galvanic cell, RC, and rectangles. Its net gain was two renders; it was not uniformly better across prompts. The RC decline may be more faithful to the requested resistance adjustment than Luna's incomplete render.

Its water-pressure success took 120.12 s, including 81.44 s in activity selection for a 19-token response. Clean output did not imply short execution. Hidden reasoning work, input processing, service delays, and transport are possible contributors, but these records do not separate them.

**Human preference.** Sol received 22/157 selections, tying Luna in total, with three sole favorites. It received 22/126 preferences when its result rendered, 17.5%, and only 12/99 on the common subset. Thus, its clean accepted outputs did not consistently become preferred screenshots. Buoyancy, cooling drinks, and magnet induction each attracted three preferences. Its exclusive choices were one vote each for buoyancy, levers, and Doppler.

**Why reviewers may have preferred Sol less often.** Less accessible controls and clipped presentation are plausible contributors. Its cell-division stage panel was clipped off the right edge, and its water-pressure controls were all collapsed in extras. Schema compliance cannot make those affordances visible. The model's conservative support decisions explain some missing screenshots, but they do not explain the low preference rate on prompts where all models rendered.

Buoyancy supplies a positive counterexample. Sol's review described a sealed hull floating beside a sinking solid block, matching the central requested observation, while several competitors showed overloaded or flooded hulls sinking. Three evaluators selected Sol there. That could reflect better starting-state selection and task fit, but the votes do not identify their reason. The broader interpretation is that Sol sometimes preserved the intended investigation well, while its overall screenshot presentation was less frequently preferred. Shared layout and per-model control-selection effects need to be distinguished before attributing that outcome to the underlying model or its training.

**Why might Sol score below smaller open models?**

- **Strongly supported scoring explanation: exact capability checking can lose to permissive approximation.** A model that notices the absence of mass, tension, or resistance controls receives a render failure. A model that overlooks those omissions can earn a pass. Some of Sol's lower score is consistent with closer adherence to the executable contract.
- **Moderate confidence: the completeness rule conflicted with incremental assembly.** The input checker asks whether the supplied activity can support the complete original investigation. During rectangle assembly, that checker receives a single selected recipe before the second rectangle is assembled. A literal model can reject the first rectangle because it cannot alone satisfy the two-rectangle request. A more permissive model can accept it as a building block and finish the pair. The code and trace make this a plausible prompt/workflow mismatch, although Sol did not explain its boolean decision. See [input requirement checking](../../../../src/web/src/simulations/creation-and-editing/component-selection/inputRequirements.ts) and [incremental assembly](../../../../src/web/src/simulations/creation-and-editing/component-selection/assemblyPlan.ts).
- **Strongly supported pipeline explanation: retrieval could hide an answer from an otherwise capable model.** Sol's battery interpretation lacked the canonical terms that brought the galvanic activity into Apertus's and Luna's candidate sets. A stronger general model cannot select an activity that a closed candidate stage never offers.
- **Moderate confidence: low reasoning effort left room for improvement on ambiguous contracts or comparisons.** Official documentation lists medium as Sol's default and supports low through max. The tested low setting is a narrower configuration than the model's default workload profile. That does not prove that medium would improve this result; stricter reasoning could also preserve justified declines. [Official Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
- **Moderate confidence: better contract adherence increased semantic strictness more than render coverage.** Zero repair attempts show strong recorded response compliance after acceptance. The failure distribution suggests that deciding whether a request was supportable was more limiting than expressing the answer in the required shape. Schema correctness and practical completion are separate skills.

The strongest check would supply identical complete candidate sets, resolve the per-instance versus whole-request completeness wording, and then compare supported reasoning settings. Unsupported outcomes should be judged against the actual commands rather than treated as uniformly incorrect. The result would better distinguish model weakness from strict compliance with a flawed or underspecified gate.

Evidence: [Sol batch report](gpt-6.1-sol-openai-laya-40-2026-10-14T06-36-50-397Z-53783.md).

**What the model hypotheses collectively suggest.** The strongest explanation for the ranking is a combination of response-format support, compatibility with short staged decisions, lexical retrieval effects, and how strictly each model interprets capability coverage. Training style and reasoning settings are plausible contributors, but the diagnostics give more direct evidence about pipeline behavior than about training causes.

Mistral combined clean responses with high acceptance of available activities. Llama also accepted broadly but sometimes substituted a related task. Qwen3 8B handled one corrected comparison especially well while mishandling another. Qwen3 32B paid a large interpretation cost and encountered a completion-flag error. Apertus performed broadly despite weaker output-format enforcement. Luna and Sol often declined at gates where complete fulfillment was either unavailable or judged unavailable.

These are observed tendencies within one workload. They should not be turned into universal claims that a model is always cautious, always helpful, or always stronger at reasoning. In particular, these unsupported outcomes are application capability decisions; the evidence does not identify them as safety-policy refusals.

The human evidence adds a second layer. Mistral's lead appears in both technical completion and perceived output quality. Qwen3 32B improves its position when accepted results are judged by people. Llama has strong activity-specific agreement, especially for visible progression controls. Apertus and Qwen3 8B often produce shared contenders, with narrower differences that this small cohort cannot firmly resolve. Luna and Sol remain less frequently preferred on matched successful prompts, so justified unsupported judgments are only part of their explanation.

The most plausible shared preference factors are visible learner actions, informative outcomes, useful comparisons, and starting states that communicate the requested phenomenon. Those are properties of the final model-plus-application output. They should not be assigned entirely to pretraining, model size, or instruction tuning. The same renderer and catalog can limit every model, and a preferred screenshot can still omit a required interaction.

**Agreement and dissatisfaction across the four evaluations.** The strongest agreement and shared rejection patterns are available in [simulation preferences](../../../../data/human-evaluations/simulation-preferences.json).

| Simulation | Recorded agreement | Interpretation |
| --- | --- | --- |
| Cost and profit | All four selected only Mistral | Strong presentation preference; production-quantity adjustment was still missing |
| Phase change | All four selected only Mistral | Strong preference despite reported lower-control overlap |
| Equal groups | All four selected only Mistral | Unanimous preference for a division/sharing result instead of requested multiplication |
| RC circuit | All four selected only Llama | Visible advance/reset actions are a plausible contributor; resistance adjustment remained absent |
| Coordinates | All four selected none preferred | Shared dissatisfaction despite seven automatic render passes |
| Tile patterns | Three of four selected none preferred | A second shared dissatisfaction signal; the remaining evaluator selected Luna alone |

Coordinates is the clearest shared concern. The inspected Apertus screenshot showed one point controlled by x/y sliders, without a visible plotting challenge or answer feedback. The original request asked to practise plotting points. A plausible explanation is that the available activity communicated a demonstration more than a practice task. The screenshots and prompt support that hypothesis; the exports do not prove it was the reviewers' reason. This points toward a shared activity-design issue that changing the language model alone may not resolve.

Other initial none-preferred judgments were not universally shared. For example, Qwen3 32B's fraction number line was selected by the three evaluators beyond the original review. The expanded cohort therefore narrows the earlier broad concern about rejected activities: coordinates has unanimous dissatisfaction, while several other activities show divergent standards or preferences.

The unanimous equal-groups preference is an especially important limit on interpretation. Agreement increases confidence that reviewers preferred Mistral's available screenshot; it does not turn its division activity into the requested multiplication exercise. Preferences for Luna's and Mistral's single-rectangle results reinforce the distinction. A future rubric should separately ask which result is appealing and which fulfills the original request, rather than assuming the first answer establishes the second.

**Simulation coverage analytics.** All 40 simulations rendered under at least four models. Twenty-five rendered under all seven. Galvanic cell and voting had the lowest render coverage, four models each.

| Models rendering a simulation | Number of simulations | Share of the 40 |
| --- | ---: | ---: |
| 7/7 | 25 | 62.5% |
| 6/7 | 6 | 15.0% |
| 5/7 | 7 | 17.5% |
| 4/7 | 2 | 5.0% |
| 0–3/7 | 0 | 0.0% |

The matrix records the benchmark's render outcome. **✓** means a render pass; **✗** means terminal failure. **△** means a render pass with a clearly reported wrong activity or missing required second rectangle. The flags cover those specific discrepancies, not every omitted control, starting-condition problem, or layout defect. An unflagged ✓ is not a certificate of full correctness. Both ✓ and △ count in the rendered column.

**A** = Apertus; **L** = Llama; **Q8/Q32** = Qwen; **M** = Mistral; **Lu** = Luna; **S** = Sol.

| # | Simulation | A | L | Q8 | Q32 | M | Lu | S | Rendered |
| ---: | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | ---: |
| 1 | Projectile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 2 | Price elasticity | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | 6/7 |
| 3 | Pythagorean / ladder | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 4 | Acid-base titration | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 5 | Cost and profit | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | 5/7 |
| 6 | Tree height | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 7 | Galvanic cell | ✓ | △ | ✗ | ✓ | ✗ | ✓ | ✗ | 4/7 |
| 8 | Craft production | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 9 | Tile patterns | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 10 | Wildfire | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | 5/7 |
| 11 | Can material | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 12 | Survey sampling | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 13 | Levers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 14 | Pulleys | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 15 | Bicycle gears | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | 6/7 |
| 16 | Tipping | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | 5/7 |
| 17 | Collisions | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | 5/7 |
| 18 | Hydraulics | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/7 |
| 19 | Buoyancy | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | 6/7 |
| 20 | Doppler siren | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 21 | Guitar string | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | 5/7 |
| 22 | Cooling drinks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 23 | Magnet induction | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/7 |
| 24 | RC circuit | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | 5/7 |
| 25 | Fraction number line | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 26 | Cell division | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 27 | Area and perimeter | △ | △ | ✓ | ✗ | △ | △ | ✗ | 5/7 |
| 28 | Beer–Lambert | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 29 | Arithmetic | ✓ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 30 | Gas equilibrium | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 31 | Phase change | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 32 | Coordinates | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 33 | Water pressure | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 34 | Voting systems | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | 4/7 |
| 35 | Counting | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 36 | Equal groups | △ | △ | △ | △ | △ | △ | △ | 7/7 |
| 37 | Pendulum | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 38 | Slope | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 39 | Bridge | △ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | 6/7 |
| 40 | Shared fishing lake | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| | **Total rendered** | **38** | **39** | **38** | **38** | **39** | **30** | **32** | **254/280** |

Several rows reveal the difference between availability and fulfillment. Equal groups rendered under all seven, but every review described division/sharing instead of multiplication. Rectangles rendered under five, but only Qwen3 8B produced the reported pair of independently controlled rectangles. Galvanic cell rendered under four, but Llama produced spectrophotometry, leaving three correct-topic renders. These are qualitative conclusions from the reviews, not a complete semantic re-scoring of the campaign.

**What the comparison means for Apertus.** The evidence supports a useful place for Apertus among small models for locally hosted simulation orchestration. Its local MXFP4 deployment matched both tested Qwen configurations on rendering, with about 29-second typical successful generation and the smallest observed successful timing spread. The recorded host was an Apple M5 with 24 GiB of system memory; this is host capacity, not measured model peak memory.

The gap between Apertus and the two 39/40 leaders was one prompt, or 2.5 percentage points. One batch cannot establish a stable ordering among such close results. Its larger render advantages over Luna and Sol, 20 and 15 percentage points, also include incomplete accepted activities and justified unsupported decisions. A claim that Apertus is generally more intelligent than those models would exceed the evidence.

The human results qualify its competitive position. Apertus's 46 selections are close to Qwen3 8B's 49 and Llama's 50, and it ties Qwen3 8B on the matched common subset. Mistral's 75 and Qwen3 32B's 56 show a clearer preference advantage in this cohort. Apertus's four sole favorites, compared with eight for Qwen3 8B, eleven for Llama, thirteen for Qwen3 32B, and twenty-one for Mistral, suggest its screenshots were more often co-preferred than uniquely compelling. This is a useful product-quality signal, not a statistically established ordering of general model ability.

The strongest Apertus cases suggest that locally hosted inference can produce scenes reviewers value when controls and investigations are explicit. The next improvement should therefore address both engineering reliability and lesson presentation: enforce structured output, preserve the requested activity, make required controls visible, show informative outcome readouts, and begin in states that illustrate the requested relationship. A larger model may improve some decisions, but the coordinate dissatisfaction and missing catalog commands demonstrate problems that extra language-model capacity alone cannot solve.

The more defensible interpretation is that Apertus already has enough practical language and orchestration capability to support broad local coverage when the application provides executable simulations. Its observed weaknesses point toward output enforcement and semantic grounding. The official release's open weights, data, and training documentation also make it relevant to inspectable and adaptable deployments. Those openness features are documented advantages; they were not separately benchmarked here. [Official Apertus release](https://huggingface.co/swiss-ai/Apertus-v1.5-8B).

The campaign evaluated an independent text-only MXFP4 conversion. It does not measure the official model's image/audio capability, multilingual performance, full-precision performance, or capability to author entirely new simulation engines. Locally hosted model inference is demonstrated; complete offline behavior, peak memory, energy use, and application-wide privacy were not audited.

The most evidence-backed improvements are to enforce schemas locally, preserve the requested system through selection, normalize terminology in retrieval, distinguish one comparison activity from multiple independent instances, and explicitly verify requested learner controls. Bridge must remain a bridge throughout the planner, and multiplication must not be accepted as division merely because both use grouped objects.

For the next comparison, exact task fulfillment should be scored separately from rendering. Outcomes should distinguish a correct completed lesson, an incomplete approximation, a wrong substitution, a correct unsupported decision, a false unsupported decision, a schema failure, and a provider failure. The model can then be rewarded for both completing supported requests and recognizing real limits. Repeated batches would help estimate stability; fixed candidate sets and matched output modes would help isolate model behavior.

**Checks performed and remaining uncertainty.** All 280 report rows were reconciled with the run manifests, including statuses, timing, repair counts, and validator returns. Aggregate totals and matrix totals agree, and the prompt and pipeline hashes match. The 157 reviewed human ballots match the campaign prompts, have distinct source evaluator IDs, and select only models with successful results in this fixed campaign. Human totals, sole-favorite counts, common-subset rates, reviewer summaries, and consensus examples were checked against the collected data. Missing ballots were kept separate from none-preferred votes. Selected diagnostic traces and screenshots were inspected for the mechanisms discussed above. The existing reports supply the full screenshot review; this analysis did not independently exercise all learner interactions.

No controlled training, quantization, reasoning-effort, serving-mode, provider, or presentation-feature ablation was run. The human sample contains four evaluator exports without explanations for individual choices, established participant independence, or a representative sampling procedure. Each explanation labeled hypothesis therefore remains a testable interpretation. Together, the benchmark and evaluations establish deployment-specific completion and screenshot preference on these 40 prompts, not a general model leaderboard or complete educational correctness score.
