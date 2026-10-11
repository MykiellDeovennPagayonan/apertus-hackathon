# Heat conduction through materials

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-16

## Human prompt

> Why does a metal spoon get hot in soup much faster than a wooden one?

## What the simulation does

Compare heat spreading along equal-sized objects made from different materials. A temperature field reveals why conductivity matters while also showing the role of density and heat capacity.

## Learner experience

Place one end of three idealized rods in a hot bath. Play the warming process and inspect the temperature at each handle. Keep dimensions and bath temperature shared while selecting clearly labelled material-property presets.

## Learning goals

- Explain conduction as energy transfer down a temperature gradient.
- Distinguish steady heat flow from the rate at which an object warms.

## Objects and controls

- Material preset, rod length/cross-section, and hot-bath temperature.
- Shared initial temperature and time controls.
- Temperature profile, heat-flow arrows, handle probe, and reset.

## Model and observations

For a uniform rod, use the 1D heat equation dT/dt = alpha d²T/dx², with alpha = k/(rho c_p). Hold the immersed end at bath temperature and initially insulate the side walls and far end. The local flux follows Fourier's law; steady end-to-end power is kA delta_T/L when both end temperatures are fixed. [OpenStax — Mechanisms of Heat Transfer](https://openstax.org/books/university-physics-volume-2/pages/1-6-mechanisms-of-heat-transfer).

## Example investigation

Compare identical rods with the same rho c_p but conductivities 1 and 100 W/(m K) to isolate conductivity. Then use separate material presets to reveal that actual warming also depends on thermal storage.

## Scope and limitations

The rods are teaching approximations to utensils. State the end and side boundary conditions. Do not present steady conduction alone as a transient warming model; use a stable spatial time-stepping scheme or an analytic solution.

## Relationship to the existing application

Greenhouse heating tracks radiation and environmental stores; it does not model temperature diffusion through a solid rod. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Mechanisms of Heat Transfer](https://openstax.org/books/university-physics-volume-2/pages/1-6-mechanisms-of-heat-transfer) — Conductivity and the effects of geometry and temperature difference.
