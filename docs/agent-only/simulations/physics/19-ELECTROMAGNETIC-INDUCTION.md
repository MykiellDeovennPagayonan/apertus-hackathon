# Electromagnetic induction

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-19

## Human prompt

> Can you show me how moving a magnet can generate electricity?

## What the simulation does

Show how a changing magnetic flux through a coil produces an induced voltage. Reversing the motion or the magnet makes the voltage direction change, while stopping the magnet removes the motion-induced voltage.

## Learner experience

Move a bar magnet along the axis of a coil connected to a resistive loop and meter. Record magnet position, coil flux, induced voltage, and loop current on synchronized plots. Compare slow and fast traversals of the same path.

## Learning goals

- Distinguish magnetic flux from the rate at which it changes.
- Connect induced-voltage direction with opposition to the flux change.

## Objects and controls

- Magnet position, prescribed motion speed, pole orientation, and coil turn count.
- Fixed loop resistance and voltage/current plots.
- Flux overlay, play/pause, motion reversal, and reset.

## Model and observations

Use an explicitly bounded teaching flux profile phi(x) per turn. Induced voltage is epsilon = −N dphi/dt = −N(dphi/dx)v. With negligible self-inductance, loop current is epsilon/R. Show Lenz's-law direction and record electrical dissipation; prescribe motion as externally driven. [OpenStax — Faraday's Law](https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law).

## Example investigation

If per-turn flux changes by 0.002 Wb in 0.1 s through 100 turns, average induced-voltage magnitude is 2 V. Reversing the same flux change reverses its sign.

## Scope and limitations

A magnet's presence alone does not supply continuous current. State that the field/flux profile is a teaching approximation, not a detailed bar-magnet solver. External work maintains prescribed motion; omit self-inductance and detailed back-force rather than implying free energy.

## Relationship to the existing application

Lightning charge separation and static resistive circuits do not model magnetic flux or Faraday induction. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Faraday's Law](https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law) — Changing magnetic flux and induced electromotive force.
