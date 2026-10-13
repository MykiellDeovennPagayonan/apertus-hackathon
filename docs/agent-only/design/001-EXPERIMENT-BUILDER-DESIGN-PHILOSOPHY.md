# Experiment builder: design philosophy and interaction guide

Date: 2026-10-05  
Scope: `/experiments/builder`, particularly input editing, component discovery, graph navigation, and contextual selection tools.

This guide records the reasoning behind the builder’s current design and gives future contributors a basis for extending it. It reflects the interface refined through user feedback in this project. It is a design direction grounded in the implementation, not a claim of completed usability research or accessibility certification.

## 1. The central commitment: make the next action clear

The builder allows people to create experiments from components, values, connections, and canvases. That underlying system is complex. The interface should make each immediate decision understandable without requiring the author to understand the entire system first.

At any moment, the author should be able to answer:

- What am I editing or selecting?
- What can I do here?
- Which action completes this task?
- What will change when I take that action?
- How can I recover if the result is wrong?

These questions drive both layout and behavior. A visually polished button cannot rescue a confusing sequence. A technically correct connection editor still fails if the author must scroll past unrelated controls to enter a number.

The working priority is task clarity, predictable behavior, readable hierarchy, efficient use of space, then visual refinement. These priorities reinforce one another. Clear hierarchy makes a task easier to understand; good spacing makes the right action easier to find.

## 2. The desired character

The visual direction is a warm, quiet workspace for constructing and exploring ideas. Cream surfaces, restrained teal accents, dark organic neutrals, and fine borders give the builder continuity with the surrounding application.

The interface should feel approachable enough for exploration and precise enough for authoring. A person adjusting a slope needs a dependable numerical field. A person browsing components needs recognizable names, useful descriptions, and space to compare choices. Both should feel like parts of the same product.

Decoration must have a job. Borders identify boundaries. Shadows indicate elevation. Color distinguishes an action or state. Icons aid recognition. Empty space separates decisions. Adding these elements without a clear role increases the amount of interface the author must interpret.

## 3. Reveal complexity in response to intent

The largest improvement came from changing what is visible together.

The initial input editor placed manual values, existing connections, search, existing components, and new components into one long scrolling dialog. Each section was individually reasonable, but the combined experience required the author to sort through several different tasks.

The revised editor asks the author to choose an input source:

| Mode | Author’s intent | What the surface presents |
| --- | --- | --- |
| Set value | “I know the value I want.” | A labeled field and the Apply value action. |
| Use existing | “Something in my experiment already produces this.” | Searchable compatible outputs from existing components. |
| Add component | “I need a new component to supply this input.” | Compatible additions that can be created and connected together. |

Manual editing is the default when the input supports it. Component-only inputs start with the component-adding flow. The available modes follow the capabilities of the input.

This principle also shapes the library. Search is immediately available because it is a common entry point. Advanced filters are behind an explicit Filters control because they consume space and are useful only when the author needs to narrow the context further.

Progressive disclosure should shorten the common path while keeping other paths recognizable. Do not bury everyday actions merely to make a screenshot look cleaner. A disclosure is appropriate when the hidden controls support a distinct, less frequent decision and the trigger clearly describes them.

## 4. Treat screen space as part of the task

Space occupied by controls is space unavailable for the experiment or component choices. This is particularly important in a visual builder, where the author needs to see relationships across a canvas.

The component library now gives most of its height to results. Its default top area is a compact row containing search, Filters, and Import assembly. The footer is quiet and shallow. Categories occupy a narrow navigation column on desktop.

The objective is sufficient room for recognition and comparison. Component cards still need a title, a short explanation, placement information, and actions. Reducing their padding to the point that they become difficult to scan would undermine the purpose of reclaiming space.

Use density selectively:

- Keep navigation and repeated utility controls compact.
- Give the active editing task comfortable spacing.
- Use a consistent rhythm between repeated items.
- Reserve larger separations for changes in task or meaning.
- Avoid large containers around a small number of trivial controls.

A compact control bar and a spacious editing form can coexist. Their densities reflect different jobs.

## 5. Visual hierarchy and action emphasis

The primary action should be apparent before the author reads every label.

In manual input editing, Apply value is the completion action. It uses a solid teal background, white text, a clearly bounded shape, and a minimum height of 44px. It sits beside the value field on desktop and expands to a full-width action on narrow screens.

Cancel is an escape action. It remains available but receives less emphasis. Giving Cancel the same strong treatment as Apply would force the author to compare two competing primary actions.

The library follows the same hierarchy: adding a component is emphasized inside a card; opening Details is secondary; closing the library is quiet. The selection toolbar uses restrained text actions because the experiment itself remains the focus. Delete is distinguished with a muted red text treatment and a visible label.

For future actions, choose emphasis according to consequence and relevance:

| Role | Treatment | Example |
| --- | --- | --- |
| Complete the active task | Filled accent button | Apply value |
| Take the main action on an item | Filled accent within the item | Add component |
| Explore or configure | Quiet button or text action | Details, Filters |
| Exit without applying | Low-emphasis action | Cancel, Close library |
| Remove authored content | Explicit label with restrained destructive color | Delete |
| Show current mode | Persistent selected treatment | Set value, Build |

Do not rely on color alone to communicate these meanings. Labels and placement must also explain the action.

## 6. Color, typography, spacing, and shape

### Color roles

Use the existing application tokens as the starting point. The following values describe the current implementation, rather than introducing a separate theme.

| Token or role | Current value | Purpose |
| --- | --- | --- |
| `--bg` | `#eee9dc` | Workspace and recessed surfaces. |
| `--panel` | `#fffbef` | Dialogs, cards, and raised surfaces. |
| `--border` | `#d5cdbb` | Fine boundaries and separators. |
| `--text` / local `--ink` alias | `#30362e` | Primary text. |
| Builder `--muted` | `#626c60` | Supporting descriptions and metadata. |
| `--accent` | `#285e56` | Primary actions, selection, and focus emphasis. |
| Selection Delete text | `#a14638` | Local destructive-action distinction. |

Subtle accent tints identify selected categories and modes. They should retain readable text and remain distinguishable from hover. A selected state must persist after the pointer moves away.

Contrast should be measured whenever colors change. A harmonious palette is not evidence that every combination meets an accessibility requirement.

### Typography

The builder inherits the application’s sans-serif family. Hierarchy comes primarily from size, weight, and placement rather than switching fonts.

Current examples include roughly 18px dialog headings, 15px library card titles, 13px form and interaction text, and 12px compact navigation or metadata. These are starting points for the existing layouts, not a mandate to shrink every label.

Titles identify the subject. Supporting text explains the decision. Metadata provides useful detail without competing with either. A canvas title should read like the name of the content area rather than an incidental caption.

Avoid using tiny text to solve a layout problem. First reduce redundant controls, unnecessary labels, or competing sections.

### Spacing and shape

The interface uses a recurring spacing rhythm around 4, 8, 12, 16, 20, and 24px. Small gaps connect related controls; larger gaps distinguish groups.

Typical control radii are around 8px. Grouped controls and cards use approximately 10–14px. Dialogs use softer outer corners. These relationships matter more than forcing every element to have the same radius.

Shadows are restrained and reserved mainly for floating surfaces. A contextual toolbar benefits from a soft shadow because it sits above the graph. Every individual control does not need its own elevation.

## 7. Make interactions match the author’s mental model

Clicking an input expresses an intention to work on that input. It should expose a useful editing path even when the author has not begun drawing a wire.

The builder retains output-to-input wiring, while an independent input click opens the input editor. Compatible existing components and compatible additions are derived from the actual connection rules.

Adding and connecting a component should be one coherent authoring operation. The person has expressed a single intent: “Use this component for this input.” Creating an unconnected component and requiring a second search for it would introduce avoidable work.

Manual values need to respect the model. A line’s slope is derived from its endpoint geometry, so assigning an arbitrary `slope` property would create misleading state. The editor uses a supported setter where necessary, validates the result, and captures the corresponding authored configuration.

This is a general rule: the UI’s promise and the document’s resulting state must agree. Visual feedback should describe a change that actually happened.

## 8. Preserve work and make recovery predictable

Switching between input-source modes preserves an unfinished manual value. Looking at an alternative should not silently discard the author’s draft.

Applying a value is explicit. Adding and connecting is an undoable operation. Invalid changes should be rejected without leaving partial state behind. Escape and Cancel provide recognizable exits from the dialog.

When applying a manual value will replace a connection, explain that consequence near the form. When a connection accepts multiple sources, preserve the meaning of that multiplicity rather than treating every new selection as a replacement.

These behaviors are part of the design, even when they are not visible in a static screenshot. Authors gain confidence when they can explore, reverse decisions, and understand why an operation was rejected.

Future changes should explicitly consider what happens to a draft when the author switches modes, navigates away, closes a dialog, or encounters validation errors.

## 9. Component discovery should support recognition and narrowing

The library supports two complementary approaches: searching for a known concept and browsing related categories.

Desktop categories have a persistent selected treatment. Selecting a category narrows the visible results. All components provides an obvious way back to the broader collection. Counts help communicate the size of each set.

Cards use a consistent order:

1. Name and recognizable visual cue.
2. Component or assembly kind.
3. Brief explanation of what it does.
4. Relevant placement or compatibility information.
5. Add and Details actions.

Descriptions should help someone distinguish neighboring choices. A description that simply repeats the title consumes space without improving recognition.

Search and filtering need recoverable empty states. Tell the author when nothing matches and provide a route to change the query or reset the filters. Do not make an empty region look like a loading failure.

Filters retain their values when collapsed. An active-filter indication helps explain why the result set may remain narrowed. If more filtering options are introduced, make applied constraints explicit enough that authors can understand and remove them.

## 10. Scroll only where there is meaningful overflow

The earlier library showed prominent vertical scrollbar rails in both category navigation and results. This fragmented an already constrained browsing area.

The revised desktop layout fits category navigation without vertical scrolling at the tested desktop size. Results own the main browsing scroll. Search remains available above them. Thin, low-contrast scrollbar thumbs reduce visual noise where scrolling is still needed.

Do not disable necessary overflow to remove a scrollbar. Short viewports, browser zoom, larger text, and longer labels can all require scrolling. The design must continue to allow access to every item.

For the input editor, manual editing is compact. Component picking uses a bounded result region because it may contain many options. Long content should not push essential controls beyond reach.

Scrollbar styling is a secondary refinement. The primary improvement is deciding which region should scroll and how much room it receives.

## 11. Keep contextual actions separate from navigation

Jump to component and Arrange affect navigation or the organization of the graph. Copy, Delete, grouping, and Save as composite act on a selection. These are different contexts.

The previous design placed a large wrapping selection panel beneath the navigation controls. This consumed graph space and made a simple selection feel like opening another form.

The current selection actions appear in a compact bottom toolbar. The selection count anchors the meaning of the actions. A clear-selection control provides an explicit exit alongside Escape. Navigation remains in a small surface at the top right.

Selection must not cause the graph to shift underneath the pointer. Floating controls preserve the spatial stability needed for repeated clicks, dragging, and wiring.

At narrower widths, the selection toolbar moves above the camera controls and can wrap. Compactness must not create overlap or make actions unreachable.

## 12. Responsive behavior should preserve the task

Responsive design changes arrangement to retain the same priorities.

On desktop, the library uses a category column and multiple card columns. On mobile, categories become a horizontal strip and cards become a single column. Search retains a prominent position; utility actions occupy a separate compact row.

The manual value form places the field and Apply value side by side when there is room. On narrow screens, the action moves below the field and spans the form width. The input modes remain recognizable rather than collapsing into unexplained icons.

Current implementation reference points include a 700px mobile breakpoint, additional selection-toolbar positioning through 1100px, a library width up to 1120px, and a library height bounded by the viewport. These values should evolve when content or device testing demonstrates a need.

Test more than page-level horizontal overflow. A page can fit the viewport while a dialog’s footer, category navigation, or result region is still difficult to use.

## 13. Accessibility is part of interaction quality

The implementation uses native controls where they provide useful behavior: buttons, inputs, selects, disclosure elements, fieldsets, and modal dialogs. Selected modes expose their state with `aria-pressed`; the filter trigger exposes `aria-expanded` and identifies its controlled region.

Visible focus treatment matters, especially in the graph. Every essential action should remain reachable without pointer precision. Input labels, action names, and dialog titles should make sense when encountered independently.

Thin scrollbars should not become a substitute for keyboard scrolling. Icon-only actions need accessible names. Disclosure chevrons indicate state; the accompanying text explains what opens.

The current interface uses compact utility controls, some below 44px tall, while the primary value action is at least 44px and component-choice rows are at least 48px. This is an implementation tradeoff to review on touch devices, not evidence that all controls meet every target-size guideline.

Future accessibility reviews should include focus restoration after closing dialogs, focus order, zoom and text scaling, contrast, reduced motion, touch targets, and screen-reader announcements. Browser interaction tests cover only part of that work.

## 14. Lessons from the revisions

The first styling pass improved borders, spacing, and chevrons but left structural problems in place. User feedback exposed three concrete failures:

- The completion action in the input form lacked visible primary styling.
- Expanded filter controls consumed too much library space before browsing began.
- Selection actions formed a bulky panel that competed with the canvas.

The subsequent changes altered the flows: separate input modes, optional filter disclosure, and independent contextual selection tools. Styling then reinforced those decisions.

The lesson is to diagnose the interaction before adjusting visual details. When a surface feels crowded, ask how many decisions it presents at once. When an action feels weak, inspect both its visual emphasis and its position in the task. When a toolbar feels intrusive, examine its relationship to the content and other controls.

A successful screenshot is useful evidence, but the transition into and out of that screenshot matters just as much.

## 15. Implementation guidance and evidence

Keep styling close to its intended scope. The builder has broad base rules, component styles, and shared forms. A shared form’s submit button can inherit a treatment that is appropriate elsewhere but wrong for a particular task. Use deliberate component selectors and inspect computed styles for critical controls.

As these patterns spread, consolidate repeated styles into shared variants instead of accumulating competing overrides. Shared controls should support explicit intent, such as a configurable submit label or a quiet dialog footer, while keeping validation and behavior reusable.

Relevant sources:

| Area | Source |
| --- | --- |
| Application colors | [globals.css](../../../src/web/src/app/globals.css) |
| Builder baseline controls | [builder.css](../../../src/web/src/simulations/builder/builder.css) |
| Dialog, library, and contextual styles | [composition.css](../../../src/web/src/simulations/builder/composition/composition.css) |
| Input editing and compatible choices | [InputEditor.tsx](../../../src/web/src/simulations/builder/composition/InputEditor.tsx) |
| Library discovery and filters | [CompositionLibrary.tsx](../../../src/web/src/simulations/builder/composition/CompositionLibrary.tsx) |
| Graph selection and wiring | [CompositionGraph.tsx](../../../src/web/src/simulations/builder/composition/CompositionGraph.tsx) |
| Modal behavior | [ComponentDialog.tsx](../../../src/web/src/simulations/builder/ComponentDialog.tsx) |
| Shared schema-driven forms | [SchemaForm.tsx](../../../src/web/src/simulations/registry/controls/SchemaForm.tsx) |
| Focused flow regression test | [verify-builder-input-editor-browser.cjs](../../../src/web/scripts/verify-builder-input-editor-browser.cjs) |
| Broader builder UX regression test | [verify-builder-ux-reliability-browser.cjs](../../../src/web/scripts/verify-builder-ux-reliability-browser.cjs) |

The recent verification included TypeScript and lint checks, browser tests for manual editing and add-and-connect, undo, mode switching with draft preservation, filter visibility, desktop navigation overflow, mobile page overflow, and the broader builder UX suite. Desktop and mobile screenshots were also inspected.

These checks provide regression evidence for the tested scenarios. They do not establish usability across all users, devices, input methods, or document sizes.

## 16. Questions for future design reviews

Before considering a builder change complete, review the actual flow with these questions:

- Does the surface have a clear purpose and an identifiable completion action?
- Does the common task require avoidable scrolling or mode changes?
- Is optional configuration occupying space before it is needed?
- Can the author distinguish current state, hover, focus, and disabled state?
- Are labels describing actions and consequences in familiar language?
- Does changing context preserve unfinished work appropriately?
- Does the operation produce a valid, undoable document change?
- Can the author recover from an empty result, invalid value, or wrong selection?
- Are contextual controls visible without covering essential content or shifting the graph?
- Does the layout remain usable with narrow screens, short viewports, and longer text?
- Have both the appearance and the interaction been checked in a running browser?

The guiding standard is a builder that makes experimentation feel understandable and recoverable. Every new control should earn its space by helping the author make or inspect a meaningful decision.
