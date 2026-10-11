# Fibre optics and total internal reflection

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-13

## Human prompt

> How does light stay inside a fibre-optic cable instead of leaking out the sides?

## What the simulation does

Trace light inside a higher-index core and reveal the conditions for confinement at its boundary. Learners distinguish the entry angle from the internal angle measured relative to a surface normal.

## Learner experience

Start with a straight transparent core surrounded by cladding. Aim a ray into the end face, then follow its internal path. At a selected boundary hit, show the normal, incidence angle, critical angle, and either a reflected path or an escaping refracted ray.

## Learning goals

- Explain the index ordering required for total internal reflection.
- Distinguish an interface critical angle from an entry-angle acceptance condition.

## Objects and controls

- Core/cladding refractive indices and external entry angle.
- Ray tracing, normal/angle overlays, and boundary inspection.
- Higher/lower-index comparison presets and reset.

## Model and observations

Total internal reflection requires n_core > n_cladding and internal incidence theta greater than theta_c = asin(n_cladding/n_core). Calculate the internal entry direction using Snell's law before tracing subsequent hits. Below critical incidence, show transmitted-ray direction and a reflected branch if intensity is modelled. [OpenStax — Total Internal Reflection](https://openstax.org/books/university-physics-volume-3/pages/1-4-total-internal-reflection).

## Example investigation

With n_core = 1.50 and n_cladding = 1.45, theta_c is about 75.2 degrees from the normal. An internal incidence of 80 degrees is confined at that interface; 70 degrees is not.

## Scope and limitations

Start with straight planar boundaries and geometric rays. Real fibres have modes, attenuation, dispersion, and bend losses beyond this first version. Do not make all subcritical light disappear: partial reflection can still occur.

## Relationship to the existing application

The rainbow model traces a droplet's optical path; it does not provide repeated core/cladding confinement or fibre entry geometry. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Total Internal Reflection](https://openstax.org/books/university-physics-volume-3/pages/1-4-total-internal-reflection) — Critical-angle conditions and fibre-optic applications.
