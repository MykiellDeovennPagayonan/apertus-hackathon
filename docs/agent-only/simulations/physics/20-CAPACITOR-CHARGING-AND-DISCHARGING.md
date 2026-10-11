# Capacitor charging and discharging

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-20

## Human prompt

> Why does a capacitor take time to charge, and why does it keep powering something briefly after the battery is disconnected?

## What the simulation does

Follow stored charge and voltage in a simple resistor-capacitor circuit. Separate charge and discharge wiring makes the temporary energy supply after source removal understandable.

## Learner experience

Start with an uncharged capacitor, a battery, resistor, and three-position switch. Charge it, isolate it, then connect it to a resistor load. Show voltage and current graphs with charge on each plate and stored energy.

## Learning goals

- Interpret the RC time constant.
- Distinguish charging current, stored energy, and discharge through a closed load path.

## Objects and controls

- Positive resistance/capacitance, source voltage, and initial capacitor voltage.
- Charge, isolate, or discharge switch state.
- Play/pause, time step, voltage/current/energy views, and reset.

## Model and observations

The time constant is tau = RC. Charging from zero gives V_C(t) = V_source(1 − exp(−t/tau)); discharge from V0 gives V_C(t) = V0 exp(−t/tau). Compute charge Q = CV_C and energy E = CV_C²/2. Preserve capacitor voltage when switching topology; adjust the new analytic segment's initial condition. [OpenStax — RC Circuits](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits).

## Example investigation

With R = 10 kΩ and C = 100 microfarads, tau = 1 s. After one second, charging voltage is about 63.2% of the source; after one second of discharge it is about 36.8% of its starting value.

## Scope and limitations

Disconnecting the battery does not automatically discharge an ideal isolated capacitor; a load path is required. Use a resistor load first. Omit leakage, dielectric breakdown, equivalent series resistance, and nonlinear LEDs. Finite-time curves approach their limits asymptotically.

## Relationship to the existing application

Existing circuits contain only constant-resistance bulbs and an ideal source; they have no capacitor state or time-dependent charge storage. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — RC Circuits](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits) — Charging/discharging curves and the RC time constant.
