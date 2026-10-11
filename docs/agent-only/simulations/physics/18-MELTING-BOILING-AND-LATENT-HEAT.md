# Melting, boiling, and latent heat

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-18

## Human prompt

> Why does ice stop getting warmer while it melts, even though I’m still heating it?

## What the simulation does

Track energy added to a sample through temperature changes and phase transitions. A heating curve and phase-fraction display explain why continuing energy input can coexist with a temperature plateau.

## Learner experience

Begin with ice below its melting temperature at a specified constant pressure. Apply constant heating power, watch it warm and melt, then continue toward boiling. Inspect the sample's temperature, solid/liquid/vapour fractions, and cumulative energy.

## Learning goals

- Distinguish sensible heating from latent heat.
- Explain phase-transition plateaus under the model's stated pressure.

## Objects and controls

- Sample mass, initial temperature, and heater power.
- Material/pressure preset with matched transition properties.
- Play/pause, advance an energy increment, show heating curve, and reset.

## Model and observations

Within one phase, energy change is Q = mc delta_T. During a transition, added energy changes phase fraction through Q = mL while temperature stays at the prescribed transition temperature. Store total enthalpy and derive temperature and phase fractions from it to avoid losing energy at stage boundaries. [OpenStax — Phase Changes](https://openstax.org/books/university-physics-volume-2/pages/1-5-phase-changes).

## Example investigation

Using an illustrative fusion latent heat of 334 kJ/kg, melting 0.1 kg of ice already at 0°C requires 33.4 kJ. An ideal 100 W heater takes 334 s if no heat escapes.

## Scope and limitations

Use constant-pressure pure-water presets; 0°C melting and approximately 100°C boiling refer to about one atmosphere. Real mixtures, gradients, and heat loss change behaviour. If the sample leaves an open container as vapour, track the exported mass and energy.

## Relationship to the existing application

The water-cycle lesson moves water between stores but does not provide an enthalpy-driven heating curve or phase-fraction plateaus. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Phase Changes](https://openstax.org/books/university-physics-volume-2/pages/1-5-phase-changes) — Latent heat and heating through phase transitions.
