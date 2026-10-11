# Integration as accumulated quantity

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-20

## Human prompt

> If a tap runs faster and slower over time, how can I work out how much water ended up in the tank?

## What the simulation does

Connect a changing flow rate with accumulated water. Adjustable rectangles under a curve show why adding small contributions estimates an integral.

## Learner experience

Display an editable flow-rate curve beside a tank. Play through time while the accumulated region fills. Compare left-endpoint, right-endpoint, and midpoint rectangle estimates with the exact result for supported presets.

## Learning goals

- Interpret area under a rate curve as accumulated quantity.
- Explain how partition size and evaluation rule affect an approximation.

## Objects and controls

- Constant, linear, and simple piecewise-linear inflow presets.
- Time interval, partition count, and rectangle rule.
- Play/pause, inspect a rectangle, reveal exact total, and reset.

## Model and observations

For inflow q(t) in L/min, V(t) = V0 + integral from 0 to t of q(u) du. A rectangle contributes q(t_i) × delta_t litres. Use an analytic or exact piecewise integral as the reference so the lesson's estimate is not compared with another hidden approximation. [OpenStax — Integration Formulas and the Net Change Theorem](https://openstax.org/books/calculus-volume-1/pages/5-4-integration-formulas-and-the-net-change-theorem).

## Example investigation

For q(t) = 2 + t L/min over three minutes, total inflow is 10.5 L. Three left-endpoint rectangles give 9 L, while three right-endpoint rectangles give 12 L.

## Scope and limitations

Begin with nonnegative inflow and sufficient tank capacity. A drain or overflow requires explicit outflow accounting; do not silently clamp the tank and still claim all integrated inflow is retained. More rectangles need not improve every possible curve monotonically.

## Relationship to the existing application

The water-cycle model tracks environmental stores; it does not teach editable rate curves, Riemann sums, or integral approximation. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Integration Formulas and the Net Change Theorem](https://openstax.org/books/calculus-volume-1/pages/5-4-integration-formulas-and-the-net-change-theorem) — Accumulation from a changing rate.

