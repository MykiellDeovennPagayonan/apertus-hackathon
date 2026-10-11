# Tessellations and tile patterns

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-06

## Human prompt

> Why do hexagon tiles fit together nicely but regular pentagons don’t?

## What the simulation does

Explore whether repeated polygons cover a surface without gaps or overlaps. This makes tiling, symmetry, and vertex angles visible in an everyday flooring problem.

## Learner experience

Provide a small tile tray and an expandable floor patch. Snap compatible edges together, rotate tiles, and inspect the angles around a selected vertex. Compare regular triangle, square, hexagon, and pentagon presets.

## Learning goals

- Explain why angle sums around an interior vertex matter.
- Separate regular-polygon tilings from tilings using irregular shapes.

## Objects and controls

- Polygon preset, tile rotation, and placement.
- Edge snapping; gap and overlap overlays.
- Repeat a valid tile patch; inspect a vertex; reset.

## Model and observations

For a regular n-gon, the interior angle is (n − 2) × 180/n degrees. A same-polygon edge-to-edge vertex needs an integer number of these angles to total 360 degrees. Verify polygon intersections and exposed edges rather than declaring success from angle arithmetic alone. [Mathigon — Tessellations](https://mathigon.org/course/polyhedra/tessellations).

## Example investigation

Three regular hexagons contribute 3 × 120 = 360 degrees. Three regular pentagons leave a 36-degree gap; four exceed a full turn.

## Scope and limitations

Regular pentagons alone do not tessellate the plane, but some irregular pentagons do. A finite patch demonstrates local compatibility, not automatically a proof of infinite coverage. Start with established periodic presets.

## Relationship to the existing application

Rectangle area calculations do not model polygon placement, shared edges, or complete tiling patches. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [Mathigon — Tessellations](https://mathigon.org/course/polyhedra/tessellations) — Angle arrangements and regular versus irregular polygon tilings.

