# Packaging with the least material

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-08

## Human prompt

> Why are some cans tall and skinny and others short and wide? Which shape uses less metal for the same amount?

## What the simulation does

Compare closed cylindrical cans with equal capacity but different proportions. A live surface-area display makes the tradeoff between the side wall and the two ends tangible.

## Learner experience

Begin with two 500 cm³ cans. Drag one radius while its height adjusts to preserve volume. Unwrap the curved wall into a rectangle and display the two circular ends; link each part to its area contribution.

## Learning goals

- Distinguish capacity from material area.
- Find and explain a minimum subject to a fixed-volume constraint.

## Objects and controls

- Fixed volume and radius; linked height.
- Closed-can surface breakdown and area-versus-radius graph.
- Compare saved proportions; reveal the mathematical minimum; reset.

## Model and observations

For a closed cylinder, V = πr²h and S = 2πr² + 2πrh. Enforce h = V/(πr²). Minimizing S with positive dimensions gives h = 2r. Show the minimum on the same curve used by the adjustable can. [University of Waterloo CEMC — Optimizing Surface Area of Cylinders and Square-Based Prisms](https://courseware.cemc.uwaterloo.ca/46/assignments/1227/2).

## Example investigation

At V = 500 cm³, the minimum occurs at r approximately 4.30 cm and h approximately 8.60 cm. Learners can compare that shape with a taller can of the same volume.

## Scope and limitations

This minimizes ideal surface area with equal material cost per area. Real packages also depend on seams, thickness, strength, stacking, handling, and production constraints. An open container has a different optimum.

## Relationship to the existing application

Circle circumference and rectangle metrics do not impose a fixed cylinder volume or optimize material area. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [University of Waterloo CEMC — Optimizing Surface Area of Cylinders and Square-Based Prisms](https://courseware.cemc.uwaterloo.ca/46/assignments/1227/2) — Fixed-volume cylinder optimization; minimum surface area at height equal to diameter.
- [OpenStax — Volume and Surface Area](https://openstax.org/books/prealgebra-2e/pages/9-6-solve-geometry-applications-volume-and-surface-area) — Prism and cylinder volume and surface-area formulas.

