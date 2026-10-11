# Cooling a hot drink

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-17

## Human prompt

> Show me how a hot drink cools in a warm room compared with a cold room.

## What the simulation does

Compare otherwise identical drinks in different ambient temperatures. Learners watch the cooling rate decline as each drink approaches its surroundings.

## Learner experience

Begin two cups at 80°C, one in a 20°C room and one in a 30°C room. Show linked temperature curves, current temperature difference, and cooling rate. Change one condition at a time and compare the time to a chosen target temperature.

## Learning goals

- Explain why cooling is faster when the temperature difference is larger.
- Recognize that a constant cooling coefficient does not mean a constant temperature drop.

## Objects and controls

- Initial and ambient temperatures; positive effective cooling coefficient.
- Target temperature and baseline comparison.
- Play/pause, step time, curve/rate overlays, and reset.

## Model and observations

Choose k > 0 and use dT/dt = −k(T − T_ambient), with T(t) = T_ambient + (T0 − T_ambient)exp(−kt). The sign convention differs from texts that absorb the minus sign into k. At constant ambient temperature, the solution approaches equilibrium without crossing it. [OpenStax — Separable Equations: Newton's Law of Cooling](https://openstax.org/books/calculus-volume-2/pages/4-3-separable-equations).

## Example investigation

For k = 0.05 per minute, after ten minutes the 20°C-room drink is about 56.4°C; the 30°C-room drink is about 60.3°C.

## Scope and limitations

Assume a well-mixed drink, constant ambient temperature, and constant effective k. Treat k as an illustrative parameter unless measured. Evaporation, changing airflow, cup geometry, and separate cup temperature are omitted rather than attributed to this single law.

## Relationship to the existing application

Existing temperature controls do not implement lumped drink cooling or a Newton-cooling comparison. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Separable Equations: Newton's Law of Cooling](https://openstax.org/books/calculus-volume-2/pages/4-3-separable-equations) — Temperature-difference cooling law and its exponential solution.
