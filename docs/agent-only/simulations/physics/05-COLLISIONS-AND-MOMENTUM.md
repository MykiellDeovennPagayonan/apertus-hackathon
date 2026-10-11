# Collisions and momentum

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-05

## Human prompt

> What happens when a heavy cart hits a lighter one? Let me try it with different speeds.

## What the simulation does

Follow two carts before and after a collision and compare their momentum and kinetic energy. The same setup can bounce elastically, partially rebound, or stick together.

## Learner experience

Place carts on a straight frictionless track. Set masses and initial velocities, play to impact, then pause immediately afterward. Preserve before/after arrows and display total momentum alongside kinetic energy transferred into an unresolved internal-energy store.

## Learning goals

- Apply momentum conservation to the two-cart system.
- Distinguish elastic collisions from collisions that lose kinetic energy.

## Objects and controls

- Each cart's mass and signed velocity.
- Restitution coefficient from 0 to 1; explicit sticking preset.
- Play, step through impact, momentum/energy overlays, and reset.

## Model and observations

For an isolated 1D collision, conserve m1u1 + m2u2 = m1v1 + m2v2 and impose v2 − v1 = e(u1 − u2) for approaching cart 1. Solve both equations at the impact event. With e = 1 kinetic energy is conserved; with e = 0 the carts share a velocity. [OpenStax — Types of Collisions](https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions).

## Example investigation

A 2 kg cart moving at 3 m/s hits a stationary 1 kg cart. If they stick, both move at 2 m/s; total momentum stays 6 kg m/s while kinetic energy drops from 9 J to 6 J.

## Scope and limitations

The system's momentum is conserved only when external impulse is negligible. Energy lost from motion is not destroyed. Start with rigid carts and instantaneous collisions; omit deformation timing, injury interpretation, and multidimensional contact.

## Relationship to the existing application

Projectile launches do not support collisions; the existing traffic model follows vehicles without modelling physical impacts. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Types of Collisions](https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions) — Momentum conservation and elastic versus inelastic collisions.

