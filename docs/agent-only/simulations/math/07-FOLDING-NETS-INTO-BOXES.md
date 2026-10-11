# Folding nets into boxes

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-07

## Human prompt

> Can you show me which flat shapes actually fold into a cube?

## What the simulation does

Connect a flat arrangement of panels with the surfaces of a closed box. Learners predict which edges meet and why some six-square arrangements overlap instead of closing.

## Learner experience

Display a labelled six-panel net beside a 3D fold preview. Select a known valid or invalid arrangement, predict closure, and slowly fold it. Highlight colliding faces or a missing final face rather than silently fixing the arrangement.

## Learning goals

- Trace face and edge correspondence between a net and a solid.
- Recognize that six connected squares alone do not guarantee a cube net.

## Objects and controls

- Preset net and fold progress.
- Face/edge labels; rotate preview; inspect opposite faces.
- Arrange a bounded set of grid-connected panels; unfold and reset.

## Model and observations

Represent faces with explicit edge adjacency and propagate 90-degree hinge transforms from an anchored face. For a cube, validate that final panels occupy six distinct face positions and form the intended closed surface. Use curated fold orders initially to avoid mistaking a bad motion sequence for an invalid net. [University of Cambridge NRICH — Cut Nets](https://nrich.maths.org/problems/cut-nets).

## Example investigation

Compare a valid cross-shaped cube net with six squares in a straight strip. Follow face A and identify the face opposite it after a successful fold.

## Scope and limitations

Panels have zero thickness in the first version. Exclude paper flexibility, glue tabs, and manufacturing tolerances. Separate geometric net validity from whether a chosen folding animation collides midway.

## Relationship to the existing application

The app has no panel adjacency, hinge-folding model, or net-to-solid lesson. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [University of Cambridge NRICH — Cut Nets](https://nrich.maths.org/problems/cut-nets) — Spatial reasoning about joining and folding nets.

