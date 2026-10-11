# Floating, sinking, and buoyancy

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-06

## Human prompt

> How can a steel ship float when a small piece of steel sinks?

## What the simulation does

Compare solid and hollow objects by their weight and displaced water. A tank cutaway shows that the relevant quantity is displaced-fluid volume, including the volume excluded by a watertight hull.

## Learner experience

Place a solid steel block and a sealed hollow steel hull in water. Add cargo to the hull and watch its equilibrium draft increase. Display weight and buoyant-force arrows; optionally flood the hull to reveal why watertightness matters.

## Learning goals

- Explain buoyancy through the weight of displaced fluid.
- Distinguish material density from an object's total mass divided by its enclosed volume.

## Objects and controls

- Object mass, external volume/shape, and fluid density.
- Cargo additions and sealed/flooded hull preset.
- Displaced-water overlay, force comparison, and reset.

## Model and observations

Buoyant force is F_B = rho_fluid g V_submerged. Floating equilibrium requires V_submerged = m/rho_fluid, provided the object's geometry allows that displacement before flooding. Solve draft from a simple box-hull geometry; classify sinking when available displacement cannot balance weight. [OpenStax — Archimedes' Principle and Buoyancy](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy).

## Example investigation

A 10 kg sealed hull in water of density 1000 kg/m³ needs 0.010 m³ of displacement to float. Adding 5 kg of cargo raises the required displacement to 0.015 m³.

## Scope and limitations

Start with quasi-static equilibrium in still water and simple hulls. A flooded hull cannot count flooded interior space as water-excluding displacement. Omit waves, dynamic stability, surface tension, and hull engineering.

## Relationship to the existing application

Gas pressure and water-cycle stores do not calculate submerged geometry or buoyant equilibrium. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Archimedes' Principle and Buoyancy](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy) — Displaced-fluid weight and floating equilibrium.

