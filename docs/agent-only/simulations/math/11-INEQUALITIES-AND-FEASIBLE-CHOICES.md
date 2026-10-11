# Inequalities and feasible choices

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-11

## Human prompt

> I’m buying notebooks and pens with a fixed budget. Show me all the combinations I can afford.

## What the simulation does

Make multiple constraints visible as a region of allowed choices. Learners see why an answer can be a collection of possibilities rather than one number.

## Learner experience

Start with a shopping budget and two item prices. A coordinate grid uses notebook count and pen count as axes. Highlight affordable integer combinations and link a selected point to an illustrated basket and remaining budget.

## Learning goals

- Interpret an inequality as a set of choices.
- Combine budget, minimum-quantity, and stock constraints.

## Objects and controls

- Budget, item prices, and optional minimum/maximum counts.
- Select a basket on the integer grid.
- Toggle each constraint and inspect why a point is excluded; reset.

## Model and observations

Evaluate c_n n + c_p p ≤ B with nonnegative integer n and p. Add explicit constraints such as n ≥ n_min or p ≤ stock. Draw a continuous feasible region for explanation but independently enumerate valid lattice points for purchasable baskets. [OpenStax — Systems of Nonlinear Equations and Inequalities: Two Variables](https://openstax.org/books/college-algebra-2e/pages/7-3-systems-of-nonlinear-equations-and-inequalities-two-variables).

## Example investigation

With a budget of 100 units, notebooks costing 30 and pens costing 10, two notebooks and four pens use exactly 100. Two notebooks and five pens violate the budget.

## Scope and limitations

Do not treat fractional stationery as a purchasable choice. Strict inequalities exclude their boundary; inclusive inequalities include it. Empty feasible sets must be explained rather than replaced with a guessed solution.

## Relationship to the existing application

Line intersection and equation solving do not model regions satisfying several inequalities or enumerate integer choices. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Systems of Nonlinear Equations and Inequalities: Two Variables](https://openstax.org/books/college-algebra-2e/pages/7-3-systems-of-nonlinear-equations-and-inequalities-two-variables) — Intersecting inequality regions and feasible sets.

