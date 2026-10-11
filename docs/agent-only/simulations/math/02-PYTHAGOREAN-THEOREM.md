# Pythagorean theorem and ladder length

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-02

## Human prompt

> Show me how to figure out the ladder length if the wall is 4 metres high and the bottom is 3 metres away.

## What the simulation does

Connect a practical length problem with the area relationship between the three squares on a right triangle. Learners see why the hypotenuse calculation uses squared lengths.

## Learner experience

Show a ladder against a vertical wall with a right-angle marker at the ground. Drag its foot or change the wall contact height. In a linked diagram, squares on the three sides resize together; an optional dissection overlay explains how the two smaller areas combine.

## Learning goals

- Identify the hypotenuse and the right-angle requirement.
- Relate side lengths to square areas and calculate an unknown length.

## Objects and controls

- Horizontal distance and vertical height in metres.
- Select the unknown side; show square areas.
- Switch between practical scene and geometric explanation; reset.

## Model and observations

For perpendicular legs a and b, calculate c = sqrt(a² + b²). When solving for a leg, require c to exceed the other leg and use the positive root. Square areas, labels, and the ladder geometry read the same side lengths. [OpenStax — Angles, Triangles, and the Pythagorean Theorem](https://openstax.org/books/prealgebra-2e/pages/9-3-use-properties-of-angles-triangles-and-the-pythagorean-theorem).

## Example investigation

With a = 3 m and b = 4 m, the two smaller squares have areas 9 m² and 16 m²; their sum is 25 m², so c = 5 m.

## Scope and limitations

The theorem applies to right triangles in Euclidean geometry. A geometric ladder length does not establish a safe real ladder placement. Any rearrangement animation must preserve the area of its pieces.

## Relationship to the existing application

Coordinate placement and rectangle metrics do not supply a right-triangle constraint or a Pythagorean area demonstration. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Angles, Triangles, and the Pythagorean Theorem](https://openstax.org/books/prealgebra-2e/pages/9-3-use-properties-of-angles-triangles-and-the-pythagorean-theorem) — Right-triangle side relationships.

