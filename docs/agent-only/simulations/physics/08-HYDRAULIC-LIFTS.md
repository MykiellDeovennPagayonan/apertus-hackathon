# Hydraulic lifts and piston areas

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-08

## Human prompt

> How can a small push lift a car in a hydraulic jack?

## What the simulation does

Connect pressure transmission with unequal piston areas. Two cylinders and a fluid link show why force multiplication comes with reduced travel at the larger piston.

## Learner experience

Start with a small input piston and a larger output piston carrying a load. Press slowly, inspect pressure change, and compare forces and piston displacements. Resize one piston and repeat with the same load.

## Learning goals

- Explain Pascal's principle as transmission of a pressure change.
- Recognize that equal pressure does not imply equal force on different areas.

## Objects and controls

- Input/output piston areas, load mass, and input force.
- Input stroke with output movement.
- Pressure, force, and displaced-volume overlays; reset.

## Model and observations

At matched piston heights, delta_p = F_in/A_in and F_out = delta_p A_out. For an ideal incompressible fluid, A_in delta_x_in = A_out delta_x_out. Include the load threshold before allowing a lift; input/output work agree in the lossless quasi-static case. [OpenStax — Pascal's Principle and Hydraulics](https://openstax.org/books/university-physics-volume-1/pages/14-3-pascals-principle-and-hydraulics).

## Example investigation

With A_in = 1 cm² and A_out = 20 cm², 100 N input supports 2000 N output. A 20 cm input stroke moves the output piston 1 cm.

## Scope and limitations

Begin at equal hydraulic head and omit piston weight, friction, leaks, and fluid compression. Different heights add hydrostatic pressure differences. This is an ideal two-piston press, not the complete pumping/check-valve mechanism of a real jack.

## Relationship to the existing application

The gas container model has no coupled pistons, displacement conservation, or hydraulic force transfer. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Pascal's Principle and Hydraulics](https://openstax.org/books/university-physics-volume-1/pages/14-3-pascals-principle-and-hydraulics) — Transmitted pressure changes and piston force ratios.

