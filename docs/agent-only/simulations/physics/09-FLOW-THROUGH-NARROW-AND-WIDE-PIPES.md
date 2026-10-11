# Flow through narrow and wide pipes

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-09

## Human prompt

> Show me what happens to water speed and pressure when a pipe gets narrower.

## What the simulation does

Link pipe width with flow speed and pressure under a stated ideal flow condition. Moving tracer dots and pressure taps make continuity and energy conservation visible.

## Learner experience

Show a horizontal pipe with one adjustable constriction and a prescribed flow rate. Move pressure probes between the wide and narrow sections. A tracer parcel speeds up in the constriction while the pressure readout falls under the ideal assumptions.

## Learning goals

- Distinguish volume flow rate from local fluid speed.
- Explain the ideal speed/pressure tradeoff without treating it as a universal rule.

## Objects and controls

- Wide/narrow cross-sectional areas and imposed volume flow rate.
- Reference pressure and fluid density.
- Tracer, pressure-tap, and energy overlays; reset.

## Model and observations

For steady incompressible flow, Q = Av. Along a streamline, p + rho v²/2 + rho gz is constant in the inviscid model. At equal height, p2 = p1 + rho(v1² − v2²)/2. Select a reference pressure and reject settings outside the liquid model's valid pressure range. [OpenStax — Bernoulli's Equation](https://openstax.org/books/university-physics-volume-1/pages/14-6-bernoullis-equation).

## Example investigation

Halving cross-sectional area at fixed Q doubles local speed. For water speeding from 1 to 2 m/s at the same height, the ideal pressure difference is a decrease of 1500 Pa.

## Scope and limitations

Holding Q fixed presumes an external flow driver. A real constriction can instead reduce total flow when the pump or pressure difference is fixed. Omit viscous losses, turbulence, compressibility, and cavitation; do not animate invalid negative absolute pressure.

## Relationship to the existing application

There is no pipe continuity or Bernoulli-flow model; environmental water stores do not resolve flow along a pipe. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Bernoulli's Equation](https://openstax.org/books/university-physics-volume-1/pages/14-6-bernoullis-equation) — Ideal flow pressure, speed, height, and tank outflow applications.
- [OpenStax — Fluid Dynamics](https://openstax.org/books/university-physics-volume-1/pages/14-5-fluid-dynamics) — Volumetric flow and the continuity equation.

