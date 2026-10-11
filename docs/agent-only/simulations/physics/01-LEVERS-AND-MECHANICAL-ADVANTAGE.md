# Levers and mechanical advantage

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-01

## Human prompt

> Why is it easier to lift something with a longer crowbar? Let me move the pivot around.

## What the simulation does

Show how the position of a fulcrum changes the effort needed to balance or slowly lift a load. A crowbar/seesaw scene makes force, torque, and movement distances visible together.

## Learner experience

Start with a rigid bar, a load on one side, and an effort handle on the other. Move the fulcrum and inspect perpendicular lever arms. In slow-lift mode, show that the effort end moves farther when its required force becomes smaller.

## Learning goals

- Use torque rather than force alone to explain a lever.
- Recognize the force/distance tradeoff of an ideal machine.

## Objects and controls

- Load mass, effort position, fulcrum position, and applied force.
- Force arrows and perpendicular-arm overlays.
- Balance, perform a small slow lift, compare, and reset.

## Model and observations

For perpendicular forces, balance requires F_effort l_effort = F_load l_load. Thus ideal mechanical advantage is l_effort/l_load. For a small common rotation, end travel scales with radius; input and output work match in the ideal slow-lift case. [OpenStax — Torque](https://openstax.org/books/university-physics-volume-1/pages/10-6-torque), [OpenStax — Work and Power for Rotational Motion](https://openstax.org/books/university-physics-volume-1/pages/10-8-work-and-power-for-rotational-motion).

## Example investigation

A 100 N load at a 0.2 m arm balances a 20 N effort at a 1.0 m arm. During a small rotation, the effort end travels five times as far as the load end.

## Scope and limitations

Start with a massless rigid bar and frictionless pivot. Actual arm length is the perpendicular distance to the force's line of action. Balance calculations do not establish the strength of a real crowbar or support.

## Relationship to the existing application

The truss bridge model does not represent a pivoted lever or its force/displacement relationship. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Torque](https://openstax.org/books/university-physics-volume-1/pages/10-6-torque) — Torque and the perpendicular lever arm; basis for the balance calculation.
- [OpenStax — Work and Power for Rotational Motion](https://openstax.org/books/university-physics-volume-1/pages/10-8-work-and-power-for-rotational-motion) — Work from torque and rotation; basis for the ideal work comparison.
