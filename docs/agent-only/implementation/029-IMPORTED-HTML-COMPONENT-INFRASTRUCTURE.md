# Imported HTML components: infrastructure and implementation plan

Date: 2026-10-12  
Status: implemented. See [implementation report](029-validation/implementation-report.md) for checks and remaining limits.  
Scope: import one HTML file, validate it, preview it, and use it through the existing component/composite system.

## 1. The proposed system

A contributor creates one self-contained HTML file using our documentation, usually through an external AI. The file contains its markup, styles, JavaScript, and a JSON manifest describing its interface. The application reads the manifest, runs the file in an isolated frame, and connects it to the existing builder through a small host API.

The process is:

**Copy authoring instructions → generate HTML → drop file → validate → preview and repair → use in experiment.**

The implementation has four parts:

1. **Contract:** the manifest schema and runtime API.
2. **Host:** the isolated runner and communication bridge.
3. **Verifier:** package checks, runtime checks, and actionable diagnostics.
4. **Builder integration:** import, preview, save, connection, and reopening.

An imported component owns a rectangular rendering area. It can draw with HTML, SVG, or canvas inside that area. It can be grouped with other components using existing composites. It does not insert arbitrary objects into the existing shared physical/cartesian canvas; that requires a separate rendering interface and is outside this first implementation.

No marketplace, automatic AI repair service, build pipeline, ZIP format, or new composition language is required.

## 2. File format and manifest

Require exactly one manifest element:

```html
<script type="application/json" id="apertus-component">
  { "formatVersion": 1, "apiVersion": 1 }
</script>
```

The fragment above shows only the location, not a complete valid manifest. The complete required shape is defined below. The JSON block is data and must never be evaluated as JavaScript. Require UTF-8 input, a complete HTML document, inline styles/scripts, and embedded assets for version 1. No remote scripts, imports, fonts, images, or stylesheets.

### Manifest contract

Use the existing `ParameterSchema` vocabulary for values. The following TypeScript notation specifies the proposed wire format; it is not an existing exported API.

```ts
type ValueDeclaration = {
  description: string;
  schema: ParameterSchema;
  unit: string;                 // empty string means dimensionless
};

type InputDeclaration = ValueDeclaration & {
  required: boolean;
  default?: JsonValue;
};

type SettingDeclaration = ValueDeclaration & {
  default: JsonValue;
};

type Manifest = {
  formatVersion: 1;
  apiVersion: 1;
  id: string;                   // contributor namespace/name
  version: number;              // positive integer; matches existing versions
  name: string;
  description: string;
  settings: Record<string, SettingDeclaration>;
  inputs: Record<string, InputDeclaration>;
  outputs: Record<string, ValueDeclaration>;
  actions: Record<string, {
    description: string;
    arguments: ParameterSchema;
  }>;
  clock: boolean;
};
```

`JsonValue` means null, boolean, finite number, string, arrays of JSON values, or string-keyed objects containing JSON values. It excludes functions, DOM objects, cycles, undefined, and non-finite numbers. Null is valid only where the declared schema accepts it.

Reject unknown manifest fields in v1 so misspelled fields do not silently disappear. Require all top-level fields, allowing empty settings/input/output/action maps. Require nonempty descriptions, unique names, safe bounded identifiers, and finite numeric bounds. Reject reserved map keys such as `__proto__`, `prototype`, and `constructor`; use own-property access in validation and adaptation.

An optional input must have a default. A required input may have a default, but it must have either a valid supplied value or that default before execution begins. A manual value satisfies a required input; a connection is not mandatory. Removing a connection restores the default or places the component in a visible “Input required” state. Never continue silently with a stale value.

Settings are persisted authored choices. Inputs are live values supplied manually or through connections. Outputs are live values available to other components. Actions are explicit commands. Reset is part of the host lifecycle, not a contributor-defined action.

### Supported value schemas

Reuse `src/web/src/simulations/registry/contracts/parameterSchema.ts`:

| Type | Required or supported constraints | Host behavior |
| --- | --- | --- |
| `number` / `integer` | `minimum`, `maximum`; optional schema `unit` | Numeric field; reject non-finite values |
| `boolean` | Optional description | Toggle |
| `string` | Explicit `minLength`, `maxLength`; optional `enum` | Text field or select |
| `enum` | `values` containing strings, numbers, or null | Select |
| `array` | `items`, `minItems`, `maxItems` | Structured data editor |
| `object` | `properties`, optional field-name list `optional` | Field editor; reject unknown properties |

The manifest's outer `unit` is the port's connection unit. If a number schema also declares `unit`, require it to agree. No implicit conversions in v1. Connection checks require compatible value schemas and equal units. Begin with structural equality of normalized schemas, including ranges, so a broader upstream output cannot feed a narrower input accidentally. This deliberately conservative rule can be relaxed later without weakening runtime validation.

Validate schema definitions themselves before using `validateValue`: minimum must not exceed maximum, array bounds must be valid, optional object fields must exist, and schema nesting must be bounded. The current value validator is not by itself a validator of untrusted schema definitions.

Publish a JSON Schema for the manifest, with definitions for this existing vocabulary. Do not document standard JSON Schema keywords as if they were valid `ParameterSchema` fields. The manifest JSON Schema describes the file; the nested value schemas use the application's vocabulary.

## 3. Runtime API and execution process

The trusted bootstrap exposes `window.apertus` before contributor scripts run. The contributor registers one implementation:

```ts
apertus.register({
  initialize({ settings, inputs, viewport }),
  updateInputs(inputs),
  resize(viewport),
  reset({ settings, inputs, viewport }),
  dispose(),
  step({ time, delta }),        // required only when manifest.clock is true
  action(name, arguments),     // required only when actions are declared
});

apertus.emit(outputName, value);
apertus.reportError({ code, message });
```

These signatures are proposed API declarations, not runnable code. `viewport` contains width and height in CSS pixels and device-pixel ratio. Time and delta are seconds. Handlers may return void or a promise; the bridge acknowledges completion. Registering twice is an error. The bootstrap reports readiness only after successful initialization.

### Exact lifecycle rules

1. Parse and validate the source without running it.
2. Construct an isolated runner with the trusted bootstrap before contributor code.
3. Establish an instance-specific communication channel and await registration.
4. Resolve and validate complete settings and input snapshots.
5. Call `initialize`; require an initial value for every declared output before it completes.
6. Deliver complete input snapshots when values change; unchanged snapshots need not be sent.
7. Deliver resize notifications and named actions through the same ordered queue.
8. For clocked components, deliver host-controlled steps. Do not overlap steps or skip simulation time silently. If the component falls behind, pause it and report the condition.
9. Reset recreates the initial simulation state using current authored settings and resolved inputs. Clear host-held outputs and require fresh initial outputs before resuming. The host resets the clock to zero.
10. A settings edit recreates the instance in v1. No live settings mutation contract is needed.
11. Removal attempts `dispose`, closes the channel, and removes the frame regardless of whether disposal succeeds.

Simulation time comes from the existing authoritative runtime. Animation frames may draw the current state; they must not independently advance simulation state. Pausing stops host steps, while interaction and resizing remain available.

Do not save arbitrary JavaScript runtime state in v1. Save source, settings, manual input values, connections, and placement. Reopening starts from initial conditions. State capture is not advertised by the imported definition.

### Bridge rules

The SDK hides messaging. Internal envelopes include protocol version, instance/session identity, request ID, message kind, and a JSON payload. Replies match request IDs; output messages identify their source request when emitted during a handler. Ignore messages from removed or replaced instances.

Use a dedicated `MessageChannel` established with the expected frame. Check the sending window during setup; opaque sandbox origins cannot be authenticated by origin string alone. Do not accept arbitrary global `message` events as output. Validate and bound every message on the host, even if the SDK already checked it.

Outputs update the existing runtime only after host validation. Deliver connected input changes at a defined scheduler boundary rather than recursively calling components during an output callback. Reject directed value-connection cycles involving imported components in v1; delayed feedback is not part of this contract.

## 4. Isolation

Run contributed code only inside a sandboxed iframe with scripts enabled and without same-origin privileges. Never render it with host `innerHTML`, evaluate it in the parent, or execute it on the server. Never pass authentication tokens, application storage, or the full experiment to the frame.

Construct the runner as a host-owned document with an enforced Content Security Policy installed before contributed content. Allow only the inline code/styles and embedded asset types necessary for this format. Deny connections, remote resources, child frames, workers, objects, forms, popups, downloads, and top navigation. Strip or reject base tags, meta refresh, contributed policy declarations, and forbidden executable/resource elements using structural HTML parsing, not regex replacement. Reject visible unsupported constructs with a useful diagnostic; runtime policy remains the enforcement layer for dynamically generated behavior.

Do not claim that blocking `fetch` alone prevents networking. Navigation, subresources, and browser differences require dedicated escape tests. Never serve raw uploaded HTML as an unsandboxed same-origin page; downloads must be attachments. Frame source construction, CSP enforcement, and any preview route must be reviewed together before release.

An iframe is not a reliable CPU/memory quota. A stuck loop may make a browser tab unresponsive before a host timeout can run. Treat this as an explicit v1 limitation. The headless verification process can run with an external process deadline; the in-app preview cannot promise the same containment. If stronger runtime availability is required, change the execution architecture before promising it.

## 5. How the verification engine works

The verifier is a sequence of deterministic checks around the real component host. It is not an AI judge and does not require a remote model. Use the same validators and host in preview and normal use.

### Stage A: inspect without executing

Check file size/encoding, HTML structure, exactly one manifest, JSON parsing, manifest schema, supported versions, safe identifiers, schema definitions, defaults, and forbidden resource declarations. Compute a SHA-256 hash of the original bytes.

If this stage fails, retain the file and show the diagnostics, but do not execute it. Missing required inputs produce “Input required”; they are not automatically an invalid-package verdict.

### Stage B: verify the protocol

Create a fresh isolated instance with resolved preview inputs. Check registration, initialization acknowledgement, required handlers, and initial outputs. Capture bootstrap errors, `error`, and `unhandledrejection` where available. The host independently detects missing acknowledgements and malformed messages.

Every emitted output must have a declared name and pass `validateValue`. Unknown names, invalid types, invalid ranges, and oversized payloads block that value from reaching downstream components. Mark the component as failed and pause dependent execution rather than substituting a fabricated value. An absent output is “unavailable,” never zero.

### Stage C: exercise lifecycle behavior

Run initialization, input update, resize, reset, and disposal. For clocked components, run a fixed sequence of steps and verify that pausing sends no steps. Validate outputs throughout. Repeat mounting/removal to catch obvious lifecycle errors and reject late messages from old instances.

Exercise input boundaries one field at a time where a valid complete input snapshot can be formed. Record exact values and sequence. Do not pretend a few boundary cases cover every input combination. For actions, validate arguments and test invocation using user-supplied valid arguments; do not invent domain assertions or claim untested actions passed.

After reset, check that fresh valid outputs arrive. Comparing numerical outputs with initial outputs is justified only when the same inputs/settings and deterministic behavior are part of the declared contract; v1 does not certify determinism.

### Stage D: user preview

Let the user interact at normal and narrow sizes, supply inputs, inspect outputs on demand, and reset. The verifier keeps checking runtime messages while the user interacts. Record runtime failures with the triggering request and current input snapshot.

Visual correctness, usable keyboard interaction, and scientific correctness are manual review items in v1. Do not mark them automatically passed because the component rendered or emitted valid numbers. Resizing without an exception is a lifecycle check, not proof of a readable layout.

### Limits and timeout policy

Implemented centrally defined host limits: 256 KiB source, 32 schema nesting levels, 256 KiB serialized bridge payload, 5 seconds for startup, and 2 seconds per handler acknowledgement. These limits are documented and checked; they are not performance guarantees. Declaration maps are capped at 64 entries, output messages at 1,024 per second, and queued requests at 64. Use bounded queues; never buffer unlimited pending messages.

Reaching a limit produces a distinct diagnostic. A timeout means “did not respond within the host limit,” not proof of an infinite loop. Enforcement must not depend on contributor cooperation. Browser-level limits remain subject to the iframe limitation above.

### Verification report schema

```ts
type VerificationReport = {
  sourceHash: string;
  apiVersion: number;
  verifierVersion: string;
  checkedAt: string;
  status: "passed" | "failed" | "incomplete";
  checks: Array<{
    id: string;
    status: "passed" | "failed" | "not-run";
  }>;
  diagnostics: Array<{
    code: string;
    severity: "error" | "warning";
    stage: "package" | "interface" | "runtime";
    message: string;
    path?: string;
    expected?: string;
    received?: JsonValue;
    requestId?: string;
    reproduction?: JsonValue;
    repair: string;
  }>;
};
```

`passed` means all mandatory technical checks in the recorded run passed. `incomplete` means a required check could not run, including missing inputs or cancellation. Warnings do not silently become passes. Keep source hashes and verifier versions with reports; modifying the file invalidates the old result. Continue runtime checks after insertion because a successful preview cannot cover future inputs.

Use stable diagnostic codes such as `manifest.invalid`, `schema.invalid`, `input.required`, `runtime.startup_timeout`, `output.unknown`, and `output.invalid`. Show the plain-language message first. Source line numbers are included only if they can be mapped accurately to the original file; otherwise use a manifest path or handler name.

“Copy fixes for AI” exports the component/API identity, relevant contract excerpt, expected/received values, and a minimal reproduction sequence. Do not include unrelated experiment data, credentials, or logs. Let users inspect the report before copying; preview input data may itself be private.

## 6. Import and use flow

Reuse the library's existing import entry and feedback patterns. Keep JSON assembly import working. Add HTML component import as another supported file type with a focused preview step.

| State | What the user sees | Next action |
| --- | --- | --- |
| Empty | Drop area and “Copy component instructions” | Choose/drop file |
| Inspecting | Short progress label | Wait or replace file |
| Invalid | Main diagnostic; details on demand | Copy fixes or replace file |
| Needs inputs | Only required missing fields | Supply values |
| Previewing | Component with relevant input controls | Try component |
| Runtime failure | Error near preview | Copy fixes or replace file |
| Ready | Preview and technical check result | Use component |

Inputs and settings use existing field editors where possible. Large structured inputs get the existing structured-data editing pattern. Do not automatically expose all settings, outputs, logs, and checks in a permanent dashboard. The default view is the preview plus the controls needed for the current check. Output inspection and technical details are explicit secondary actions.

“Use component” saves the artifact to the existing library flow and adds an instance as one undoable document change. If saving or insertion fails, retain the preview and source. Do not leave a broken half-inserted instance. Replacing a file cancels the old verification run and ignores its late results. A failed replacement does not overwrite the last usable saved revision.

## 7. Existing-system integration and persistence

**Implementation choice:** the existing configuration schema supports a new built-in adapter definition, `displays/ImportedHTML`. Each instance carries its exact HTML source, settings, and manual inputs in configuration. Catalog lookup accepts the instance and derives its ports from its own manifest. Consequently, source travels through existing recipe/document/library serialization without an artifact registry or format migration. The artifact-bundle approach below is the original proposal; it was unnecessary for this first version. Copies duplicate source and remain subject to the existing document budget. Verification reports identify exact source content with SHA-256.

This change must reach the catalog, authored document validation, runtime scheduling, presentation, library persistence, recipe dependencies, serialization, and import/export. Adding an iframe view alone is insufficient.

| Existing area | Required change |
| --- | --- |
| `runtime/parameterSchema.ts` | Reuse value validation; add bounded validation of untrusted schema definitions at the import boundary |
| `runtime/authoring/types.ts` | Represent imported artifact references and adapt manifests to current public definitions |
| `components/catalog/` and its callers | Resolve imported definitions in document/library context; never register uploaded code as global trusted code |
| `runtime/authoring/validate.ts`, `connections.ts`, `recipes.ts` | Resolve custom ports/dependencies and apply existing checks plus imported-component rules |
| `runtime/authoring/runtime.ts` and presentation providers | Connect the isolated runner to inputs, actions, outputs, clock, resize, and teardown |
| `builder/composition/RecipeImport.tsx` and catalog/library UI | Add HTML inspection, preview, repair feedback, and insertion |
| Builder library/document persistence and database library routes | Store artifacts safely; validate metadata server-side without executing HTML |
| Recipe/document import, export, reopening | Carry and resolve all referenced artifacts, including nested composites |

At implementation time, search every `publicDefinition` caller and every serializer before changing resolution. The existing API assumes built-in definitions; changing only import code will leave validation and reopening broken.

Store original source once per artifact hash in an explicit imported-artifact bundle carried by the document/recipe. Instances refer to the exact artifact, alongside identity/version. Keep runtime input/output state out of the artifact. The library stores the same bundle through its existing persistence path; no separate registry service is needed.

If the current format rejects additional artifact metadata, add an explicit new document/recipe format version with migration from existing formats. Do not silently reinterpret `formatVersion: 3` or break existing recipe imports. An exported composite must contain every required artifact so another user can reopen it without access to the author's library. Missing or mismatched hashes are visible errors, never an automatic substitution with another version.

Source hash is integrity/identity evidence, not a signature or a safety certificate. Server save/import repeats structural validation and computes hashes itself. Client-submitted verification reports do not authorize code execution or establish trusted status. Imported component ports and descriptions are untrusted data even after validation.

## 8. Documentation deliverables

Publish one versioned authoring kit, available without an account:

| File | Purpose |
| --- | --- |
| `component-authoring-v1.md` | Self-contained rules: required file, manifest, types, API, lifecycle, restrictions, and verification behavior |
| `component-manifest-v1.schema.json` | Machine-readable manifest contract including the supported value-schema vocabulary |
| `component-api-v1.d.ts` | Exact callback and SDK signatures |
| `component-starter-v1.html` | Minimal structurally valid file with required handlers and manifest |

These deliverables are available in `src/web/public/component-authoring/v1/`. The starter is infrastructure scaffolding, not a domain demo or a new simulation.

“Copy component instructions” copies the guide and starter contract needed by an external AI to produce one complete file. Also offer a download. It must work without the AI opening links, installing packages, or accessing this repository. The instruction must clearly request one complete HTML file, the exact API version, and no undeclared dependencies.

Maintain one executable contract definition from which schema/types can be derived using existing tooling where available. If a generated representation is impractical, add parity tests rather than maintaining unchecked copies. Avoid reusing a provider-specific reduced JSON Schema conversion unless it preserves all validation semantics needed here.

CI validates the starter manifest, launches it through the actual runner, and checks lifecycle behavior. Contract changes must update the guide, types, schema, starter, and diagnostic reference together. Unsupported API versions fail clearly; never guess compatibility.

## 9. Implementation plan and acceptance criteria

### Step 1 — Contract and pure validation

- Add the manifest contract, schema-definition checks, source inspection, limits, and diagnostic/report types.
- Reuse existing value validation semantics.
- Write the authoring guide, JSON Schema, API types, and starter together.
- Add focused tests for valid manifests, malformed schemas/defaults, reserved keys, unsupported versions, and bounded input handling.

**Done when:** a valid file can be inspected without execution, invalid files have stable actionable errors, and published contract artifacts agree.

### Step 2 — Isolated runtime

- Add the host-owned runner document, bootstrap SDK, frame policy, and instance-specific channel.
- Implement ordered lifecycle delivery, output validation, timeouts, bounded queues, and teardown.
- Wire a minimal host harness to the starter.
- Test parent/storage access, external resources, navigation attempts, spoofed/stale messages, invalid outputs, thrown handlers, and missing acknowledgements.

**Done when:** the starter runs with the documented API, malformed runtime messages cannot reach downstream state, and the browser isolation checks pass. Record the stuck-loop limitation explicitly.

### Step 3 — Verification and repair reports

- Build stages A–C using the same runtime harness, with cancellable runs.
- Record input/action/step sequences and normalize failures into the report schema.
- Add repair-text export and source-hash invalidation.
- Test errors at every stage, incomplete runs, reset freshness, and replacing an active run.

**Done when:** each injected failure yields a reproducible report identifying what must change; no failed or unrun mandatory check is reported as passed.

### Step 4 — Builder preview

- Extend existing import UI with HTML selection, generated input controls, preview, and replacement.
- Reuse existing feedback and accessible controls; support keyboard file selection as well as dropping.
- Make “Use component” available after required technical checks pass.
- Review desktop/narrow layouts and recovery flows against the project's simplicity requirements.

**Done when:** a user can import, provide inputs, preview, copy fixes, replace, and reach insertion without editing application code or losing their current experiment.

### Step 5 — Full component/composite integration

- Adapt the manifest into the existing definition/port model and resolve it in document context.
- Connect host scheduling and presentation to the runtime.
- Persist artifact bundles and exact references, with migrations if required.
- Support library save/reopen and composite export/import, including nested dependencies.
- Verify incompatible connections and value cycles fail before execution.

**Done when:** an imported implementation can connect to native components, participate in a composite, survive save/reopen and export/import, and remain isolated in both preview and learner views. Undo removes insertion cleanly. Existing JSON recipes continue to work.

### Step 6 — Release checks

- Run relevant existing component, recipe, composition, library/database, and builder browser checks after the affected paths are identified.
- Run the authoring starter through the publicly documented flow.
- Verify that UI claims match check coverage and that diagnostics contain no unrelated private data.
- Confirm source is never served as unrestricted same-origin HTML and server routes never execute it.

**Done when:** documentation and application agree, the complete authoring-to-reopening path works, and failures are recoverable. Do not ship insertion that only works until refresh.

## 10. Explicit limits

- Technical verification establishes compatibility and observed runtime behavior, not scientific correctness or universal safety.
- Visual quality and accessibility require human review; v1 does not offer automated certification.
- HTML panels render independently; shared-canvas objects need a different interface.
- Simulation runtime state is reset on reopen; authored state and connections are retained.
- No guaranteed CPU/memory isolation for arbitrary browser code in this version.

## References

- [Project simplicity requirements](IMPORTANT.md)
- [Builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md)
- [Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md)
- [Usability QA guide](../design/004-USABILITY-QA-GUIDE.md)
- [MDN: iframe sandbox behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
- [MDN: message source and origin validation](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
