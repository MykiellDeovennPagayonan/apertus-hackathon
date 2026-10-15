# Manual experiment builder

The manual builder creates editable lessons through the same component registry, validation and runtime path used by prepared recipes and accepted AI compositions. Its implementation is under `src/web/src/simulations/builder/`.

## Workflow

1. Open the manual builder and add a canvas or supported model.
2. Add objects, controls and readouts from the component picker.
3. Connect compatible ports in the Connections graph. The settings dialogs also provide connection selectors for keyboard access.
4. Configure components, arrange the lesson and use the preview to operate its controls.
5. Save the draft, try the lesson, and export recipe JSON when a portable backup is needed.

Canvases are explicit components. Controls and readouts must connect to their intended model. Separate model instances keep their own configuration and runtime state. Incomplete drafts can be saved; learner playback requires a runnable document. Invalid changes must preserve the last accepted state.

## Persistence and compatibility

The submission uses browser-local guest storage. Saves belong to the browser and application origin; changing the hostname, protocol or port can make an existing library inaccessible from the new origin. Docker volumes do not back up browser saves.

Lesson saves preserve authored configuration, rather than an animation checkpoint. Learner-only slider changes do not rewrite authored starting values; reopening starts from the saved recipe. Use authoring edits to change those starting values.

Older document formats retain compatibility readers and migrations. Do not remove stable component identities or legacy adapters solely because they are absent from the current picker. Imported data must pass validation before becoming accepted state.

## Verification

From `track_2b/src/web`, run `pnpm test` for existing contract, migration and persistence checks. For release verification, use the actual app to create a draft, connect a control, change a value, undo, save, reload, reopen and export it. Check keyboard connection selectors and a narrow viewport when changing builder interactions.

See [development](DEVELOPMENT.md) for setup and [component architecture](COMPONENT_ARCHITECTURE.md) for shared ownership. Domain models are teaching approximations; rendering a lesson does not certify its scientific accuracy.
