# pAperSim HTML component authoring — API v1

Create **one complete UTF-8 HTML file** containing your component's markup, inline CSS, inline JavaScript, and manifest. There is no build step. Return the whole file, not snippets. Use only the API below; do not invent methods or install dependencies.

The component owns its own rectangular panel. It may render HTML, SVG, or an HTML canvas within that panel. Inputs and outputs connect it to other pAperSim components. It does not draw objects directly into another component's canvas.

## Required manifest

Include exactly one `<script type="application/json" id="apertus-component">` containing these fields. All top-level fields are required; unused maps are `{}`.

| Field | Meaning |
| --- | --- |
| `formatVersion`, `apiVersion` | Both must be `1` |
| `id` | `namespace/name`; letters, numbers, hyphens, underscores |
| `version` | Positive integer, at most 1,000,000 |
| `name` | Nonempty component name, at most 100 characters |
| `description` | Purpose, at most 1,000 characters |
| `settings` | Saved authored choices; each entry declares `description`, `schema`, `unit`, `default` |
| `inputs` | Live incoming values; each declares `description`, `schema`, `unit`, `required`, and optional `default` |
| `outputs` | Live outgoing values; each declares `description`, `schema`, `unit` |
| `actions` | Commands; each declares `description` and an object `arguments` schema |
| `clock` | Whether the host must call `step` |

Names in these maps start with a letter and contain letters, numbers, hyphens, or underscores, up to 64 characters. At most 64 declarations per map. Reserved names are `reset`, `RESET`, `source`, `settings`, `inputs`, `__proto__`, `prototype`, and `constructor`. Unknown manifest fields are rejected.

`unit` is always a string; use `""` for dimensionless data. Optional inputs require defaults. Required inputs need a supplied value or a declared default before startup. Every default must satisfy its schema. Emit a number separately from its unit: do not format it as a string.

## Value schemas

These are pAperSim value schemas, not arbitrary JSON Schema. The downloadable manifest JSON Schema formally describes this vocabulary.

| Type | Schema fields |
| --- | --- |
| `number` / `integer` | `type`, finite `minimum`, finite `maximum`, optional `unit`; integer bounds must be integers |
| `boolean` | `type`, optional `description` |
| `string` | `type`, explicit `minLength`, `maxLength`, optional string `enum` |
| `enum` | `type`, nonempty `values` array of strings, finite numbers, or null |
| `array` | `type`, `items` schema, `minItems`, `maxItems` |
| `object` | `type`, `properties` map of schemas, optional `optional` list of property names |

Bounds must be ordered. String/array bounds are integers from 0 to 10,000. Enums have at most 64 entries. Objects have at most 64 properties. Schemas/data may nest at most 32 levels. Undeclared object properties are rejected. Null is accepted only by an enum declaring null.

Port units must match. When both connected ports declare schemas, their normalized schemas must match, including bounds. A native output without a schema may connect, but its actual values still undergo runtime validation.

## Runtime API

The host creates `window.apertus` before your scripts execute. Call `apertus.register` exactly once with these handlers:

| Handler | Arguments and responsibility |
| --- | --- |
| `initialize(context)` | `context = {settings, inputs, viewport}`; render and emit every declared output before completing |
| `updateInputs(inputs)` | Complete current input map, not a patch; update state/rendering |
| `resize(viewport)` | `{width, height, pixelRatio}`; CSS pixels and device-pixel ratio |
| `reset(context)` | Restore initial simulation state for current settings/inputs; emit every output again |
| `dispose()` | Release timers/listeners/resources |
| `step({time, delta})` | Required when `clock: true`; advance simulation by `delta` seconds |
| `action(name, arguments)` | Required when actions are declared; execute the named command |

Handlers may return void or a promise. The host sends requests in order, without overlapping handlers. Await work needed to finish a request. `initialize`, `updateInputs`, `resize`, `reset`, and `dispose` are always required. Reinitialization after cleanup must work in a fresh document.

Use `apertus.emit(name, value)` to send a declared output. Send finite JSON values only. No functions, DOM elements, undefined, cycles, or non-finite numbers. Every emitted value is checked against its output schema. Undeclared or invalid outputs stop the instance.

Use `apertus.reportError({code, message})` for an unrecoverable component error. Thrown errors and rejected promises are also captured. Do not implement postMessage or communicate directly with the parent application.

The host owns simulation time. Do not advance physics using your own timers or animation frames. You may use animation frames to draw the current state. The host stops sending steps while paused. Reset starts at time zero. Settings changes recreate the instance. Reopening an experiment restores authored settings and inputs, not an arbitrary saved simulation state.

## Runtime restrictions

- Maximum HTML size: 256 KiB, including embedded assets. Keep the entire saved experiment within the existing 1 MB document budget.
- Inline scripts/styles only. Bundle dependencies; do not use remote imports, scripts, fonts, stylesheets, or images.
- Embed raster images as data URLs using PNG, JPEG, GIF, or WebP. Inline SVG markup is allowed.
- No child frames, forms, objects, embeds, link elements, base tags, or HTTP-equivalent meta tags. Links may only target local fragment identifiers.
- The host blocks external subresource requests with Content Security Policy. Camera, microphone, geolocation, application storage, and parent DOM access are unavailable.
- Inline event-handler attributes are blocked by the script policy. Use `addEventListener` instead.
- Do not navigate the frame, open windows, download files, access cookies, or attempt networking. Violations may stop execution. Browser iframe isolation does not guarantee CPU/memory containment or prevent every self-navigation request.
- Host messages have a 256 KiB limit. Startup must connect within 5 seconds; each handler must complete within 2 seconds. At most 64 queued requests and 1,024 outgoing messages per second.
- Keep code cooperative: a long synchronous loop can freeze a browser tab. Verification does not make arbitrary code universally safe.

Use semantic labels, keyboard-operable controls, visible focus, readable sizing, and motion preferences. Keep the visual as the main content; show only controls needed for its purpose.

## Verification and repair

Import checks the manifest, schemas, defaults, file limits, and forbidden resource declarations before execution. Automated preview checks startup, initial outputs, input updates, numerical input boundaries, resize, host clock when enabled, reset, disposal, and reinitialization. Actions require manual testing with valid arguments.

You can inspect inputs/outputs in the preview and copy a repair report. The report records source hash, verifier version, passed/failed checks, diagnostic codes, and relevant input values. Fix the identified fields or handlers and return a complete replacement file. Do not remove required outputs to hide an error.

Common diagnostics:

| Code | What to fix |
| --- | --- |
| `manifest.missing` / `manifest.json` / `manifest.invalid` | Manifest placement, valid JSON, required fields, or field values |
| `manifest.version` | Set format/API versions to 1 |
| `package.resource` / `package.size` | Bundle supported assets; remove forbidden elements or reduce file size |
| `input.required` | Supply the required input or declare a valid default |
| `runtime.startup_timeout` | Register during document startup; remove unavailable dependencies |
| `runtime.handler` / `runtime.handler_timeout` | Repair the handler error or make it complete within the time limit |
| `output.unknown` / `output.invalid` / `output.missing` | Use declared output names, valid values, and emit all initial/reset outputs |
| `runtime.message` / `runtime.rate` / `runtime.queue` | Use only the SDK; reduce message frequency or expensive work |

“Technical checks passed” means interface and tested lifecycle behavior passed. Scientific correctness, visual quality, and accessibility still require human review. A report applies to its exact source and tested inputs; runtime output validation continues after insertion.


## Authoring, trying, and sharing

Use **Community → Create HTML component** to describe a component and download a Markdown brief containing this contract, your request, and the starter. Give that brief to your external AI, then upload its complete HTML file. Existing HTML can be uploaded directly.

After technical checks, open **Suggested connections** to choose controls for declared inputs, action buttons/forms, and output displays. Try the selected connections before saving. The saved component contains one independent HTML panel; the trial controls and displays are separate components. In the builder, compatible existing endpoints can also be suggested, and **Add to experiment with connections** applies the chosen connections together.

Saving to My components is optional. Guests save on their current device; signed-in users save privately to their account. Community publication is a separate action with license review, checks of the saved source and starting values, and an immutable published snapshot. The Components tab lists standalone HTML components; Compositions lists assemblies. A shared component can be tried, downloaded as HTML, or copied to My components with its source attribution retained in the app. Credit the author when reusing downloaded HTML.

Stored check reports are contributor-reported evidence. The server checks report/source linkage and tested inputs/settings, but does not execute or certify uploaded JavaScript. Public previews run in the same isolated runtime and continue validating outputs. Scientific correctness and untested actions still require review.

## Deliverable for an external AI

Return one complete HTML file following this guide. Include the manifest and every required handler. Use API version 1. Include no remote dependencies or build instructions. Replace the starter's visual content while keeping the protocol. Explain relevant assumptions in the component description. Do not claim automated scientific verification.
