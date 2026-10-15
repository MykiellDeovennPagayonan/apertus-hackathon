# HTML component authoring and community

Date: 2026-10-14
Status: implemented and verified locally. See [implementation evidence](037-validation/implementation-report.md) for checks and integration limits.

## Outcome

A contributor describes a new standalone component, downloads a Markdown brief for their external AI, uploads the returned self-contained HTML, checks and tries it, and optionally saves it to their personal component library or publishes it. Community components are distinguished from assemblies of existing components.

The existing manifest and API remain authoritative: inputs, outputs, settings, and actions are declared inside the HTML. We do not guess an interface from arbitrary markup. Keep the single-node recipe as the internal storage format; do not require contributors to author a composite.

## Implementation

1. Add a dedicated component authoring page linked from Community. Start with a name and description, then download a tailored Markdown brief containing the existing contract and starter. Reuse the builder importer for uploading, retaining errors, verification, and live preview.
2. Emit current version-2 recipes for standalone HTML and normalize older standalone HTML recipes at the shared parsing boundary. Preserve source, settings, manual inputs, identity, and version.
3. Expose manifest-derived connection suggestions in the preview: controls for inputs, buttons/forms for actions, and appropriate displays for outputs. Offer compatible existing endpoints when using the builder. Apply selected suggestions to a trial document, not the saved standalone component, and use the existing connection validator. Keep structured data editable without inventing unsupported conversions.
4. Make trying, downloading HTML, saving to a personal library, and publishing separate explicit actions. Reuse account projects, revision checks, licensing, immutable publications, and attribution. Guests can try/download and save locally; publishing requires the existing sign-in and sharing permission.
5. Distinguish standalone HTML components from compositions using their validated graph shape. Add a Community Components tab and component detail actions for trying, downloading HTML, and adding to the personal library. Preserve the existing experiment/composition APIs and records.
6. Preserve source-bound verification evidence and recheck imported HTML before publication in the UI, including JSON-imported and older components. Preserve evidence in private storage and validate evidence completeness/source linkage at the publication boundary. Treat browser reports as contributor-reported technical checks, never a trusted safety certification. Continue isolated previews and runtime output validation.

## Scope and compatibility

Touches component authoring/import UI, HTML recipe adaptation, recipe validation, suggestion/trial construction, personal library persistence, project/publication validation and filtering, Community listing/detail, publication review, authoring docs, and focused regression checks. No new dependency, database type migration, paid AI call, or public deployment is needed. Assemblies remain available separately.

## Verification

- Regression checks for current/legacy HTML recipes, source-bound reports, publication rejection of absent/stale/failed reports, component classification/filtering, tailored brief generation, and valid/invalid suggested connections.
- Type check and focused lint for changed files; existing contract checks where shared validation changes affect them.
- Browser review of describe/download/upload/check/try/save, invalid upload recovery, Community entry points, and keyboard/narrow viewport behavior. Record exact evidence and any unavailable account/database integration separately.

## Limits

Technical lifecycle checks do not prove scientific correctness, accessibility, or universally safe JavaScript execution. The existing sandbox/CSP cannot fully contain CPU/memory abuse. Manual actions remain explicitly recorded as untested until exercised. Reports apply only to their exact source and supplied inputs/settings. Public evidence must be labeled contributor-reported unless a trusted server-side verifier is introduced.

## Completion evidence

See [implementation report and screenshots](037-validation/implementation-report.md). Focused regression checks, type checking, scoped lint, and local browser flows passed. Account/community browser checks used mocked APIs; live MongoDB publication and deployment remain untested. The existing full contract suite failure was reproduced on committed HEAD and is documented in the report.
