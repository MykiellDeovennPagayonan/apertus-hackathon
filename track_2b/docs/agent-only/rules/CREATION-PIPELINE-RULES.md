# Rules for changing the simulation creation pipeline

These rules apply to creation, component retrieval, activity selection, required interactions, configuration, assembly, presentation, and follow-up paths that create or replace a simulation. Explicit user instructions take precedence.

## 1. Ownership: Apertus decides meaning; the application executes

Apertus interprets the original natural-language request and decides which supported activity, components, interactions, settings, and feedback fulfill it. It must be allowed to resolve informal language, synonyms, ambiguity, and unfamiliar phrasing using the supplied registry context.

The application owns the registry, authoritative document, component identities, contracts, bindings, defaults, transactions, budgets, and accepted state. It checks whether proposed operations are structurally valid and executes accepted operations atomically.

A valid component ID or connection is not proof that the proposed simulation answers the user's request. Meaning and structural validity are separate responsibilities.

## 2. No prompt-specific fixes or hard semantic filters

Do not add:

- Branches keyed to a benchmark prompt, experiment name, or failed example.
- Keyword-to-experiment maps, prompt substring dispatch, or forced recipe selection.
- Synonym lists accumulated from failures to make particular prompts pass.
- Regexes, stopword rules, stemming rules, single-letter exclusions, or arbitrary matching thresholds that decide which quantities the user means.
- Rules that infer required inputs solely from configuration field names, output names, or lexical overlap.
- Deterministic semantic eligibility gates that reject an activity before Apertus interprets the request.
- Fixture substitution, injected model answers, or premade imports presented as successful prompt generation.
- Production instructions that encode benchmark cases or their expected answers.

Fix shared ownership, context, contracts, state handling, or execution behavior. Do not patch the wording of one prompt to hide a pipeline defect.

## 3. Retrieval supplies candidates; it does not settle meaning

Retrieval may rank and compact candidates using registry metadata. Text matching is a retrieval aid, not a final semantic decision or proof of unsupported behavior.

Give Apertus enough context to distinguish candidates: model meaning, supported commands and arguments, units, available outputs, interaction bindings, and relevant limitations. Keep the projection small and specific to the unresolved decision.

A weak literal match must not erase a relevant component before Apertus can consider it. When the shortlist is insufficient, use a bounded broader retrieval or ask for clarification. Do not silently substitute a loosely related activity.

An empty shortlist means retrieval found no candidates; it does not establish that the user's learning goal is impossible.

## 4. Registry metadata describes capabilities, not user intent

Schemas and capability identities must describe the actual reusable component behavior. Keep metadata at the component or domain owner and derive it from existing contracts where possible.

Stable identities for models, commands, and argument fields let the application preserve a selected capability. They must not become a hand-maintained natural-language interpretation table.

Do not add metadata solely to route a failing benchmark prompt. Any addition must be independently meaningful to the component's behavior and useful beyond that example.

The approved catalog restriction is an explicit resource scope: the selected experiment components plus the approved retained extras. It is not permission to hard-code how requests map onto that inventory. Keep excluded definitions registered where needed to load existing recipes.

## 5. Resolve requirements through Apertus, then preserve the decision

Use the original request throughout selection and interpretation. Inferred lesson text or a generated question must not invent requirements or replace the user's meaning.

Apertus should resolve requested interactions against supplied capabilities before the application commits the activity. Preserve the selected model, quantity, command, argument field, units, and instance association through configuration, pruning, layout, and final validation.

An empty inferred input list is not proof that the request contains no interactions. The semantic decision must account for the original request. Do not fill that gap with another deterministic language parser.

Do not let later optional presentation choices remove required functionality. For comparisons, preserve the resolved requirements for each intended instance without applying every requested quantity indiscriminately to every model.

Layout changes affect geometry and presentation; they must not change scientific bindings or quantities.

## 6. Unsupported decisions and structural rejection are different

Apertus decides whether the offered capabilities fulfill the requested meaning, whether clarification is needed, or whether the request is unsupported within the available scope.

The application must reject objectively invalid proposals: unknown identities, unsupported versions, invalid values, incompatible ports or units, missing resolved bindings, stale revisions, unsafe transactions, or exhausted budgets. Report the concrete structural problem without claiming a lexical mismatch proves semantic impossibility.

Never convert a rejected proposal into an unrelated valid simulation merely to produce a result. Preserve the accepted simulation when a proposal fails.

## 7. Repairs must address the failure and remain bounded

Give Apertus the original decision context and the exact rejection reason. Keep accepted decisions and bindings authoritative during repair.

When a proposal fails, change the relevant candidate/context or ask a focused clarification. Do not repeat the same failed semantic choice against unchanged context indefinitely. Do not compensate by expanding retry limits, context windows, or permissive fallbacks without evidence that this addresses the cause.

Keep existing provider safeguards, cancellation, concurrency limits, and generation budgets.

## 8. Evidence and verification follow the user's instructions

Before changing code, inspect the actual request path, affected callers, registry contracts, and available diagnostics. Separate observed failures from hypotheses about what Apertus selected.

Report semantic failures separately from structural failures. Do not call a result fully successful merely because the recipe validates or renders. Success requires fidelity to the original request and correct behavior of the requested interactions and feedback.

Do not describe mocked responses, source inspection, or contract checks as live Apertus success. Retain failed outcomes and distinguish first-attempt success from success after repairs.

Honor the user's verification limits. When instructed not to make or run verification scripts, do not create, modify, or execute verification scripts, tests, builds, or type checks unless the user subsequently authorizes them. Leave verification to the user and state that the changes are unverified.

## 9. Review questions before accepting a pipeline change

- Is Apertus still deciding the requested meaning, or has application code made that decision first?
- Would the change work for unrelated supported simulations and different wording?
- Is each deterministic rejection based on an actual execution contract rather than a language heuristic?
- Are required capabilities preserved through every affected creation path?
- Can the system return a structurally valid simulation that answers a different question?
- Does the implementation respect the current catalog scope, accepted-state safeguards, and verification instructions?

## Current implementation status

This document records the required architectural boundary. It does not certify that the current implementation complies. In particular, deterministic name matching and request-span extraction introduced during recent changes must be reviewed against these rules; writing this document does not remove those mechanisms.
