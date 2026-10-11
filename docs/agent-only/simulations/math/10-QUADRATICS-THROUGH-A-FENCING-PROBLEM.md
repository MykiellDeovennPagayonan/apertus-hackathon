# Quadratics through a fencing problem

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-10

## Human prompt

> I have 20 metres of fencing. Let me change the shape and see which rectangle gives me the most space.

## What the simulation does

Connect a changing enclosure with a quadratic area curve. A fixed amount of fence couples the two dimensions, making the maximum more than an ordinary area calculation.

## Learner experience

Drag one side of a fenced garden and watch the opposite dimension adjust automatically. A marker moves along the linked area graph. Save two shapes with equal fencing and compare how much ground they enclose.

## Learning goals

- Build a quadratic from a geometric constraint.
- Recognize a vertex as a maximum within the permitted domain.

## Objects and controls

- Fence length and adjustable side.
- Four fenced sides or three sides against an existing wall.
- Show graph, compare layouts, reveal maximum, and reset.

## Model and observations

With all four sides fenced, 2x + 2y = P, so A(x) = x(P/2 − x), for 0 < x < P/2. The vertex is x = y = P/4. In wall mode, 2x + y = P and the optimum becomes x = P/4, y = P/2. [OpenStax — Quadratic Functions](https://openstax.org/books/college-algebra-2e/pages/5-1-quadratic-functions).

## Example investigation

For P = 20 m, a 2 × 8 m rectangle encloses 16 m². A 5 × 5 m rectangle uses the same fence and encloses 25 m².

## Scope and limitations

Keep the wall and fully fenced cases visibly distinct. Ignore gate gaps, fence thickness, irregular terrain, and construction costs. Zero-side endpoints are collapsed shapes, not usable gardens.

## Relationship to the existing application

Rectangle metrics already exist; this adds a fixed resource constraint, linked dimensions, a quadratic curve, and an optimization investigation. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Quadratic Functions](https://openstax.org/books/college-algebra-2e/pages/5-1-quadratic-functions) — Parabolas, vertices, and area applications.

