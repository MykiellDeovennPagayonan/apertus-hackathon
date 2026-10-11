# Gears and bicycle ratios

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-03

## Human prompt

> Show me why a low gear makes cycling uphill easier but doesn’t get me very far with each pedal turn.

## What the simulation does

Explain the link between tooth counts, rotation rate, and torque. A bicycle drivetrain provides the familiar application, while a separate direct-gear view clarifies why meshing gears reverse direction.

## Learner experience

Start with a front chainring, rear sprocket, chain, and wheel. Turn the pedals at a fixed cadence and swap tooth counts. Compare wheel rotation and distance per pedal revolution; optionally apply a resisting wheel torque to see the required pedal torque.

## Learning goals

- Interpret a speed ratio from the driver and driven tooth counts.
- Connect lower wheel speed per pedal turn with greater ideal wheel torque.

## Objects and controls

- Compatible front/rear tooth-count presets and pedal cadence.
- Wheel radius and optional resisting torque.
- Chain versus direct-mesh explanation; rotation markers; reset.

## Model and observations

A no-slip chain advances the same number of teeth at each sprocket: wheel angular speed/pedal angular speed = N_front/N_rear. Ideal power conservation gives wheel torque/pedal torque = N_rear/N_front. A direct external gear pair reverses direction; a normal uncrossed bicycle chain preserves it. [KHK — Internal Gears Technical Information](https://khkgears.net/pdf/internal-tech.pdf).

## Example investigation

With a 30-tooth chainring and 30-tooth rear sprocket, the wheel turns once per pedal turn. With a 30-tooth chainring and 15-tooth rear sprocket, it turns twice but has half the ideal wheel torque for equal pedal torque.

## Scope and limitations

KHK's tooth-ratio reference concerns gears; the chain application is a no-slip kinematic extension. Ignore drivetrain losses, tyre slip, shifting dynamics, and tooth interference by using compatible presets. Avoid calling a larger numerical front/rear ratio a lower gear.

## Relationship to the existing application

Existing motion models have no coupled drivetrain or tooth-count-controlled speed/torque transfer. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [KHK — Internal Gears Technical Information](https://khkgears.net/pdf/internal-tech.pdf) — Manufacturer reference for the relation between tooth-count ratio and rotational-speed ratio; not a bicycle-chain model.
- [OpenStax — Work and Power for Rotational Motion](https://openstax.org/books/university-physics-volume-1/pages/10-8-work-and-power-for-rotational-motion) — Rotational work and power, supporting the ideal torque/speed tradeoff.

