# Water pressure with depth

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-07

## Human prompt

> Why does water shoot farther out of a hole near the bottom of a bottle?

## What the simulation does

Show increasing hydrostatic pressure below a water surface, then separate that pressure from the trajectory of an escaping jet. Learners discover that a faster outlet is not always the one that lands farthest.

## Learner experience

Use a transparent tank with a pressure probe and an adjustable small hole. Move the probe vertically, inspect gauge pressure, and open one outlet at a time. Trace the jet to the floor while displaying both outlet speed and horizontal landing distance.

## Learning goals

- Relate static pressure to depth below the free surface.
- Distinguish outlet speed from range, which also depends on fall height.

## Objects and controls

- Water-surface height, hole height, and fluid density.
- Move pressure probe; open/close outlet.
- Constant-head comparison mode; pressure/jet overlays; reset.

## Model and observations

Gauge pressure at depth h is rho gh. For an ideal small outlet under constant head, v = sqrt(2gh). If the hole is y above the landing plane, flight time is sqrt(2y/g) and range is v times that time. Keep depth below water and height above ground distinct. [OpenStax — Fluids, Density, and Pressure](https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure).

## Example investigation

A surface 1.0 m above the floor and a hole 0.5 m high give a 1.0 m ideal range. Lowering the hole to 0.1 m increases outlet speed but reduces range to 0.6 m.

## Scope and limitations

The prompt's farther-near-bottom assumption is not universally true. Hold the head fixed explicitly for comparisons; a draining tank needs changing water level. Ignore jet breakup, viscosity, and hole contraction in the first version.

## Relationship to the existing application

Gas pressure exists, but the app lacks hydrostatic depth probes and a pressure-driven water-outlet model. Existing ballistic rendering could be reused for the jet. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Fluids, Density, and Pressure](https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure) — Hydrostatic pressure and depth.
- [OpenStax — Bernoulli's Equation](https://openstax.org/books/university-physics-volume-1/pages/14-6-bernoullis-equation) — Ideal flow pressure, speed, height, and tank outflow applications.

