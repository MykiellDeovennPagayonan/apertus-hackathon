# Spatial board implementation and verification

Date: 2026-10-05. Implements the spatial presentation feature described in 011 against design guides 001 and 002. This report distinguishes automated evidence from device testing that has not been performed.

## Delivered behavior

- New canvas experiments use spatial presentation. Legacy authored documents and historical recipes retain flow presentation. Build offers a preview, explicit conversion commit, cancellation, undo, and a return to the original flow order.
- Presentation is an optional, independently versioned `presentation` block (`mode: board`, `version: 1`) in canonical format 3. Old documents do not require migration. Graph positions, board rectangles, board camera, and simulation state remain separate.
- Semantic groups, tabs, disclosures, repeaters, visibility, disabled bindings, and typography remain layout subtrees. Unlabelled structural rows/stacks/grids become separate logical content hosts. Attached canvas objects and nonpresentational model/resource/behavior leaves do not become board tiles.
- Board tools provide pan, pointer-centered Alt-wheel zoom, touch pinch on neutral workspace, zoom buttons/status, fit, starting view, and searchable content navigation. Browser Ctrl/Command-wheel zoom is preserved. Explicit Pan claims content gestures; otherwise content owns its interaction and internal scrolling.
- Authors have explicit move/resize handles, numeric placement, keyboard movement, Shift selection, snapping, placement locks, grouping/ungrouping, left alignment, horizontal distribution, stacking, copy/paste/duplicate/delete, and atomic undo for completed drags. Escape and pointer cancellation discard previews. Camera navigation is not authored history.
- Learner area editing provides a visible dimmed boundary, move/resize handles, numeric fields, content-derived bounds, and explicit starting-view capture. Running/sharing rejects content outside a configured learner area with an actionable explanation. Bounds constrain pan, zoom, resize, focus navigation, and immersive return. Outside content is clipped; larger viewports center and letterbox.
- Fixed mode never silently enables navigation. If its authored frame would shrink native controls below their original size, it displays a readable explanation. Authors can return to editing, preview a smaller target viewport, and capture a suitable frame.
- Supported standalone `canvases/town` and `canvases/World` hosts expand into the experiment viewport. Existing DOM/React hosts change geometry in place: there is no duplicated scene, runtime, or overlay controller. Entry/exit restores board camera and focus. Startup in a scene and learner board-return policy are configurable; the author always retains Return to builder.
- Explicit overlays accept supported control, display, and instructional/layout subtrees, with left/right/bottom anchors, collapse defaults, and reserved scene space. Mobile provides panel selection and compact/expanded controls rather than stacking tiny panels. Content errors have a local retry surface.
- A mounted Build renderer retains its runtime and author camera across Connections/Build navigation. Memoized layout hosts avoid unnecessary child rendering during board-only gestures.
- Build uses the full viewport below the shared builder navigation, matching Connections. The canvas has no outer preview frame or lesson heading/footer. Camera controls float at the lower left; content navigation and settings float at the upper right. Selection has a compact floating bar, with advanced actions under More and numeric geometry under Placement. Settings and boundary-editing tools overlay the workspace without changing its dimensions.
- Each directly hosted component has one neutral heading with a move handle and an accessible Edit button. Resize handles appear on hover, selection, or keyboard focus. The learner-area outline appears during boundary editing. Runtime reset/capture and starting-view recovery live in the navigation disclosure; immersive authoring also exposes experiment actions. Deliberate mobile preview and learner presentation retain their presentation framing.
- Author initial/fit camera zoom never magnifies beyond 100%; explicit zoom remains available. Canvas dots track camera position and zoom. Blank clicks and Escape clear selection; arrow keys pan, +/- zoom, and Home fits content. Settings and disclosures support Escape with focus restoration. Utility targets remain at least 44px on narrow screens.

## Numerical and compatibility decisions

Coordinates and frame dimensions must be finite and within practical limits (absolute coordinates up to 1,000,000; item dimensions 160–10,000). Camera zoom is bounded to 0.1–4, with authored learner limits inside that range. Default learner limits are 0.25–2. Stable item IDs are distinct from node IDs; validation enforces one normal host per presented subtree, valid group membership, supported scene references, and valid overlay references.

Known command paths reconcile spatial references after insertion, canvas reuse, attachment, deletion, and layout edits. Composite selection/remapping and paste preserve/remap spatial identities and offset copies. Serialization rejects malformed metadata rather than repairing imported data silently. Conversion retains the original flow tree; returning to flow restores its order and bindings, not arbitrary overlap geometry.

## Verification performed

From `src/web`:

| Command | Outcome |
| --- | --- |
| `pnpm test` | Passed: simulations, integration, builder, composition, graph, canvas, parity, architecture, public/spatial catalog, unified builder, UX reliability, and board contracts. |
| `pnpm exec tsc --noEmit` | Passed. |
| Scoped `pnpm exec biome check` over modified/new TypeScript, TSX, CSS and tests | Passed. |
| `pnpm test:board:browser` | Passed: conversion, keyboard placement, cancellation without document edits, duplicate/undo/redo, mode switching, persistence, learner navigation without authored mutations, fixed mobile readability, responsive widths, immersive entry/exit, same connected canvas, preserved unsubmitted numeric draft, overlay collapse, mobile panel selection/expansion, scene startup and author escape. |
| `node scripts/verify-board-workspace-browser.cjs` (included in `test:board:browser`) | Passed at 1440×900, 1024×548, 390×844 and 320×844: full viewport canvas with no page scroll, reachable floating controls/popovers/settings, no content shift when settings open, keyboard focus recovery, accessible component editing, lock/unlock and numeric placement, undo, unbounded camera navigation without document edits, runtime-action disclosure and one live host across tab switches. |
| `pnpm test:builder:browser` | Passed after adapting the existing test to open the already-collapsed Filters panel and focus an offscreen spatial control before clicking it. |
| `node scripts/verify-builder-input-editor-browser.cjs` | Passed. |
| `node scripts/verify-public-catalog-browser.cjs` | Passed. |
| `APERTUS_BROWSER_TEST_DIR=.next-spatial-build pnpm exec next build --webpack` | Passed, including TypeScript and static page generation. |
| `pnpm test:board:performance` | Passed representative 28-host scenario; measurements below. |
| `git diff --check` | Passed. |

The standalone legacy `verify-composition-browser.cjs` was also attempted with `BUILDER_BASE_URL=http://127.0.0.1:43002`. It stops at its obsolete `document.scene.workspace` assertion (line 118): the current builder produces canonical `document.authored` documents. It is not claimed as passing. The maintained composition model, unified builder, spatial catalog, and UX browser suites cover the canonical implementation.

The default Turbopack production build failed while creating local worker ports (`Operation not permitted`), including a permission-reviewed retry. The supported webpack production path completed successfully. The preview and builds used isolated Next output directories. Generated `tsconfig.json` additions were removed afterward.

## Visual review and performance

Inspected browser captures of board authoring at 1440, 1024, 390 and 320 pixels, plus desktop/mobile immersive presentation. Review found and corrected a compressed inherited canvas column, insufficient scene sizing, poor mobile overlay allocation, and overlapping builder navigation at 320 pixels. Focus/selected styling uses the application accent; controls use existing panel/background/border tokens. Placement and content interactions remain visually distinct.

Captures produced during verification: `/tmp/spatial-board-desktop.png`, `/tmp/spatial-board-1024.png`, `/tmp/spatial-board-390.png`, `/tmp/spatial-board-320.png`, `/tmp/spatial-immersive-desktop.png`, `/tmp/spatial-immersive-mobile.png`.

After feedback on the boxed Build UX, reviewed the same empty physical canvas used in the user's reference. Updated captures: `/tmp/build-workspace-{1440,1024,390,320}.png`, `/tmp/build-workspace-clean-{1440,1024,390,320}.png`, and `/tmp/build-workspace-connections.png`. The maintained UX test now asserts full workspace width and disclosed runtime actions rather than the superseded 1240px preview frame and permanent footer.

Performance sample: macOS arm64, Apple M5, Chrome 154.0.8037.93, headless development server, 1440×1000 viewport. Four Cartesian views plus 24 instruction hosts produced 633 elements inside the workspace. After ten warmup frames, keyboard-pan sampling measured median frame interval **16.8 ms**, p95 **20.2 ms**. This is a local development benchmark, not a universal performance guarantee. No state-discarding offscreen culling was introduced.

Repeat after the workspace revision: **577** workspace elements, median frame interval **17.1 ms**, p95 **24.4 ms**, using the same development/headless scenario. Host memoization remains intact; removing repeated component chrome reduced the element count.

## Deliberate limits and remaining device review

- Immersive promotion targets standalone supported scene hosts. Scenes nested inside a semantic group retain that group's layout rather than being extracted and losing inherited behavior.
- The author's camera is remembered for the mounted editing session, including tab and learner-preview transitions; reload uses the authored starting view. Learner camera changes never enter the exported document.
- Browser fullscreen is not implemented; immersive presentation fills the experiment viewport and leaves browser/OS navigation intact.
- Automated keyboard, pointer, narrow-screen, state-continuity, and DOM checks are evidence for those scenarios only. Physical touch-device testing, VoiceOver/NVDA review, real browser/text zoom, and low-end GPU benchmarking remain manual review items. No universal accessibility certification is claimed.
