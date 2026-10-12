# Imported HTML components — implementation report

Date: 2026-10-12

## Delivered behavior

The component library's existing import flow accepts both assembly JSON and self-contained HTML. HTML is inspected before execution, previewed through an isolated component host, and saved as a portable component recipe. The saved component can be inserted into the builder and reopened after reload.

The import screen provides downloadable authoring instructions and starter HTML, plus a button copying the guide and starter together for an external AI. Inputs use existing scalar controls. Variable-length arrays use a validated JSON editor so authors can actually change dataset length. Settings and actions appear on demand. Outputs and reports remain in technical details.

## Contracts and runtime

- `runtime/imported/contract.ts`: manifest inspection, bounded schema validation, defaults, input resolution, diagnostics, and instance-specific public definitions.
- `runtime/imported/runner.ts`: a host-owned fresh iframe per instance, opaque sandbox origin, restrictive resource policy, bootstrap SDK, authenticated frame/channel setup, ordered requests, bounded messages/queues, output validation, timeouts, and teardown.
- `runtime/imported/provider.ts`: integration with the existing document runtime, clock, authored input values, output snapshots, reset, and action queues.
- `runtime/imported/verify.ts`: automated lifecycle checks, numerical input boundaries, source hash, and repair reports.
- `runtime/imported/recipe.ts`: portable recipe creation using existing storage and insertion paths.

Catalog lookup accepts either a built-in ID or a component instance. All instance lookup callers were updated so graph ports, connection validation, controls, composites, runtime providers, and presentation agree about an imported component's interface. Uploaded code is never added to the global trusted implementation registry or executed on the server.

The host creates each iframe inside an otherwise empty React-owned container. Replacement creates a fresh document and removes the previous iframe, avoiding races from repeatedly navigating one frame during verification and React effect cleanup. Messages from previous channels/instances are discarded.

Every output is validated before downstream publication. Complete output snapshots are required at initialization/reset. Missing or invalid incoming data suspends an imported instance; unavailable upstream outputs do not become fabricated zeroes. Dependent runtime steps stop when their input output is unavailable.

## Persistence decision

The original proposal considered a separate artifact bundle and document format migration. Neither was needed: the new adapter stores `source`, `settings`, and `inputs` within the existing validated configuration representation. Exact HTML travels with its instances in JSON exports, composite recipes, library entries, and saved experiments.

This preserves existing format versions and uses existing server-side recipe/document validation. Duplicated instances carry duplicated source; the existing overall document budget still applies. A verification hash identifies the checked source but is not a trust certificate or signature.

## Public authoring kit

Available without authentication at `/component-authoring/v1/`:

- `component-authoring-v1.md`
- `component-manifest-v1.schema.json`
- `component-api-v1.d.ts`
- `component-starter-v1.html`

Starter HTML responses force attachment download and apply a restrictive sandbox CSP. Imported source is stored as data rather than served as an unrestricted HTML page.

The manifest JSON Schema describes structural fields; the runtime additionally checks ordered bounds, optional-property membership, finite values, default/schema agreement, matching units, and complexity limits. `parse5` is the added dependency, used for structural HTML parsing rather than regex sanitization.

## Validation performed

Passed:

- TypeScript compilation.
- Production build, including server rendering and client bundling.
- Biome checks for the new runtime and component modules.
- Imported component contract tests: invalid manifests/schemas/defaults, resource declarations, required values, runtime output validation, stale generations, reset, connection compatibility, cycle rejection, composite extraction, and portable save/reopen.
- Existing composition, composition graph, and control contract tests.
- Browser acceptance against development and production builds: HTML import, automated checks, resizing, library save, insertion, and reload.
- Browser failure cases: wrong output types, missing initial outputs, absent handlers, nonresponding handlers, blocked parent access, blocked external fetch, and disabled saving after failure.
- Browser repair/replacement and input updates, including variable-length array editing.
- Browser action invocation and clock/pause behavior.
- HTTP download policy for starter HTML.
- Narrow preview screenshot review; fixed an overlapping input label.

Commands from `src/web`:

```sh
pnpm test:components:imported
UX_TEST_URL=http://127.0.0.1:43129 pnpm test:components:imported:browser
pnpm exec tsc --noEmit --incremental false
```

Browser checks require an already running local app. They use fresh browser contexts and do not change the user's signed-in session.

Broader existing checks encountered unrelated workspace failures:

- `scripts/recipes/verify-contract.cjs`: expects “Loading experiment”; current loading UI says “Preparing your experiment…”.
- `scripts/builder/verify-architecture.cjs`: existing `SpatialBoard.tsx` imports the builder's `BuilderIcon.tsx`.
- `scripts/verify-component-cleanup.cjs`: existing projectile, coordinates, and town markup snapshots differ from fixtures.

These fixtures and unrelated UI changes were not rewritten for this feature. Live authenticated database saving was not exercised; imported recipes use the existing validated library routes.

## Limits retained

- Independent visual panels only; arbitrary objects inside existing shared canvases need another rendering interface.
- Authored source/settings/inputs/connections persist. Arbitrary simulation runtime state resets on reopen.
- Technical checks do not certify scientific correctness, visual quality, or accessibility.
- Iframes do not guarantee CPU/memory containment. A synchronous loop can freeze a tab.
- CSP blocks external subresources and sandboxing blocks parent access/top navigation. Self-navigation can still initiate a request before the host detects it; universal network isolation is not promised.
- No signed package registry, automatic remote AI repair, or marketplace was added.
