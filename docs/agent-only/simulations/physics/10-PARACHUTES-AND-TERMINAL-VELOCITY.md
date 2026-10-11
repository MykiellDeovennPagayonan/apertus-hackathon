# Parachutes and terminal velocity

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-10

## Human prompt

> Why does a bigger parachute make someone fall more slowly? Let me compare two sizes.

## What the simulation does

Show how a falling object's speed changes as air drag builds toward a balance with weight. Comparing canopy areas isolates why the final descent speed differs.

## Learner experience

Start two simplified descending loads with identical masses but different fixed canopy areas. Follow them in side-by-side vertical scenes and linked speed graphs. At each moment, compare the downward weight arrow with the upward drag arrow.

## Learning goals

- Explain terminal speed as zero net force, not zero motion.
- Relate canopy area and load mass to descent speed.

## Objects and controls

- Load mass, projected canopy area, drag coefficient, and air density.
- Shared initial speed and gravity; play/pause and time step.
- Force arrows, speed curve, terminal-speed marker, and reset.

## Model and observations

With downward velocity v positive, m dv/dt = mg − (rho C_D A/2)v|v|. Terminal downward speed is sqrt(2mg/(rho C_D A)). Integrate position and velocity consistently and end the run at ground contact. Compare measured speed with the theoretical limit. [OpenStax — Drag Force and Terminal Speed](https://openstax.org/books/university-physics-volume-1/pages/6-4-drag-force-and-terminal-speed).

## Example investigation

For m = 80 kg, rho = 1.2 kg/m³, C_D = 1.5, and A = 20 m², terminal speed is about 6.60 m/s. Increasing area to 40 m² reduces it to about 4.67 m/s.

## Scope and limitations

Use a fully deployed, constant-shape canopy with fixed drag coefficient. Deployment shock, wind, changing atmosphere, canopy collapse, and human-body dynamics are outside scope. These illustrative values are not parachute design specifications.

## Relationship to the existing application

Projectile motion currently omits drag, and ramp resistance does not model velocity-dependent aerodynamic forces. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Drag Force and Terminal Speed](https://openstax.org/books/university-physics-volume-1/pages/6-4-drag-force-and-terminal-speed) — Quadratic drag and the force balance at terminal speed.
