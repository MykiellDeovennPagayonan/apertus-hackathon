# Scale drawings and similar shapes

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-04

## Human prompt

> If I double the size of this floor plan, does the area double too? Let me try it.

## What the simulation does

Show how uniform scaling affects a whole shape rather than just a numerical ratio. Learners compare a floor plan with an enlarged copy and inspect corresponding features.

## Learner experience

Begin with an L-shaped room drawn on a grid. Keep the original visible while scaling a copy about a chosen centre. Overlay matching corners and fill the enlarged floor with copies of the original unit squares.

## Learning goals

- Recognize preserved angles and proportional corresponding lengths.
- Distinguish linear scale from area scale.

## Objects and controls

- Positive scale factor and centre of dilation.
- Corresponding-side highlights and unit-square overlay.
- Optional nonuniform stretch for comparison; reset.

## Model and observations

Transform each vertex by p_new = centre + k(p_old − centre). For uniform k > 0, perimeter scales by k and area by k²; the area result follows by scaling both dimensions of each constituent rectangle. Use polygon area for the room outline. [Mathigon — Dilations](https://mathigon.org/course/transformations/dilations).

## Example investigation

A 3 m by 4 m room has area 12 m². Doubling both lengths gives a 6 m by 8 m room and area 48 m², four times the original.

## Scope and limitations

Different horizontal and vertical factors produce a stretch rather than a similar copy. Keep physical plan scale separate from display zoom, and keep all length labels in a consistent unit.

## Relationship to the existing application

The ratio board reports a numerical proportion; it does not transform a linked shape or compare its length and area scaling. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [Mathigon — Dilations](https://mathigon.org/course/transformations/dilations) — Scaling about a centre and interpreting the scale factor.
- [OpenStax — Volume and Surface Area](https://openstax.org/books/prealgebra-2e/pages/9-6-solve-geometry-applications-volume-and-surface-area) — Prism and cylinder volume and surface-area formulas.

