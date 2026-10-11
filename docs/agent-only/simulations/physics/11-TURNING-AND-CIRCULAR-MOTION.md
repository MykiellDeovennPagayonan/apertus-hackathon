# Turning and circular motion

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-11

## Human prompt

> Why is it harder to take a sharp turn on a bike when I’m going fast?

## What the simulation does

Compare the sideways force required by a turn with the grip available at the ground. A top-down path makes it clear that changing velocity direction requires acceleration.

## Learner experience

Show a simplified bike-and-rider marker following a chosen radius. Increase speed and watch the required force grow. Offer a linked lean-angle diagram and mark when the requested circular path exceeds the assumed traction budget.

## Learning goals

- Explain why a turn requires inward acceleration.
- Understand the squared effect of speed and the role of radius.

## Objects and controls

- Speed, turn radius, combined mass, and friction coefficient.
- Required/available force overlay and ideal lean-angle view.
- Compare two speeds or radii; play and reset.

## Model and observations

For a level steady turn, required inward force is mv²/r. Available static friction is at most mu_s mg in the simplified model, so the traction limit is v ≤ sqrt(mu_s gr). An ideal balanced lean satisfies tan(theta) = v²/(rg). [OpenStax — Centripetal Force](https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force).

## Example investigation

At radius 10 m, doubling speed from 5 to 10 m/s increases required sideways force fourfold. With mu_s = 0.5 and g = 9.81 m/s², the model's speed limit is approximately 7.0 m/s.

## Scope and limitations

A traction-limit marker is sufficient for version one; do not fabricate a realistic skid path without a dynamic tyre model. Omit braking, banking, steering transients, tyre deformation, and rider control. This is an ideal explanation, not cycling advice.

## Relationship to the existing application

Traffic rings include following behaviour, but do not calculate tyre grip, centripetal force, or rider lean. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Centripetal Force](https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force) — Circular motion and the sideways force required for a turn.
