# Centre of mass and tipping

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-04

## Human prompt

> Why does a tall cabinet tip over more easily? Let me change its height and where the weight sits.

## What the simulation does

Show how support geometry and weight distribution determine whether a slowly tilted object returns upright or tips further. A cabinet cutaway makes the hidden centre of mass inspectable.

## Learner experience

Start with a cabinet on a level floor. Move a removable load between low and high shelves, change base width, and tilt the cabinet about a lower edge. Show a vertical line through its centre of mass and the restoring or overturning torque.

## Learning goals

- Relate stability to the centre of mass and support boundary.
- Explain why lowering a load or widening a base can increase the tipping angle.

## Objects and controls

- Cabinet width/height, body mass, and movable load mass/position.
- Manual tilt and critical-angle marker.
- Centre-of-mass and gravity-line overlays; compare and reset.

## Model and observations

Compute combined centre of mass as sum(m_i r_i)/sum(m_i). Transform it with the cabinet's tilt and calculate gravity's torque about the contact edge. For a centred uniform cabinet of width b and centre-of-mass height h, the critical angle satisfies tan(theta_c) = (b/2)/h. [OpenStax — Stability](https://openstax.org/books/college-physics-2e/pages/9-3-stability).

## Example investigation

For b = 0.6 m and h = 1.0 m, the ideal critical angle is about 16.7 degrees. Lowering the centre of mass to 0.5 m increases it to about 31.0 degrees.

## Scope and limitations

Assume sufficient static friction to prevent sliding and a rigid object tilted quasi-statically. A flat-floor cabinet is stable until perturbed or externally loaded; height alone does not make it tip spontaneously. Omit anchoring, deformation, and real furniture assessment.

## Relationship to the existing application

Bridge response and authored buildings do not calculate centre of mass, contact-edge torque, or tipping thresholds. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Stability](https://openstax.org/books/college-physics-2e/pages/9-3-stability) — Centre of gravity, support boundaries, and stable versus unstable equilibrium.

