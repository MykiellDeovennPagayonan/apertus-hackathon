# Trigonometry for measuring heights

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-03

## Human prompt

> How could I work out how tall a tree is without climbing it?

## What the simulation does

Turn a measured angle and a horizontal distance into a height estimate. A visible observer, sight line, and triangle connect trigonometric ratios to surveying.

## Learner experience

Place an observer on level ground facing a tree. Move the observer, aim a sight line at the top, and inspect the triangle above eye level. Offer measurement mode with the tree height hidden, then reveal the geometric reference height after the learner estimates it.

## Learning goals

- Use tangent as a ratio of opposite to adjacent sides.
- Account for instrument height and distinguish horizontal from sloping distance.

## Objects and controls

- Observer distance, eye/instrument height, and elevation angle.
- Show triangle and side names; hide/reveal tree height.
- Optional bounded angle error for comparing estimates.

## Model and observations

On level ground, H = h_eye + d tan(theta), with d horizontal and 0 < theta < 90 degrees. Define whether the user is measuring a fixed tree or authoring a triangle: changing observer position in measurement mode updates the true sight angle rather than independently changing the tree. [OpenStax — Right Triangle Trigonometry](https://openstax.org/books/algebra-and-trigonometry-2e/pages/7-2-right-triangle-trigonometry).

## Example investigation

At 10 m horizontal distance, a 45-degree angle and 1.5 m eye height imply H = 11.5 m. A small angle error becomes more consequential near a vertical sight line.

## Scope and limitations

Start with a vertical target and level ground. Sloped terrain needs an additional geometry model. Exclude singular angles and state that the scenario is a mathematical estimate rather than a surveying instrument.

## Relationship to the existing application

Existing line and coordinate models lack linked observer geometry, angle measurement, and inferred height. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Right Triangle Trigonometry](https://openstax.org/books/algebra-and-trigonometry-2e/pages/7-2-right-triangle-trigonometry) — Trigonometric ratios and height-measurement applications.

