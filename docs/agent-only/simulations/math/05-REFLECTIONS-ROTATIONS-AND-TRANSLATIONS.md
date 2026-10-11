# Reflections, rotations, and translations

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-05

## Human prompt

> I keep mixing up flipping and rotating shapes. Can you show me the difference?

## What the simulation does

Let learners manipulate an asymmetric shape and inspect how its vertices move under three rigid transformations. An asymmetric example makes orientation changes easy to see.

## Learner experience

Start with a labelled arrow-shaped polygon on a grid. Predict its image, then apply a translation, reflection, or rotation. Preserve a faint original and animate the correspondence of each labelled corner.

## Learning goals

- Distinguish a slide, a turn, and a reflection.
- Identify preserved distances and angles, and the orientation reversal of a reflection.

## Objects and controls

- Translation vector; reflection line chosen from simple presets.
- Rotation centre and signed angle.
- Show vertex paths, compose two transformations, undo, and reset.

## Model and observations

Translate by adding a vector. Rotate relative coordinates about the selected centre with the 2D rotation matrix. For a reflection, project each point onto the chosen line and place its image equally far on the opposite side. Store operation order when composing transformations. [Mathigon — Rigid Transformations](https://mathigon.org/course/transformations/rigid).

## Example investigation

Rotate a labelled arrow 90 degrees around its tail, then reflect it across the vertical axis. Compare with applying the same operations in the opposite order.

## Scope and limitations

Do not use a symmetric square as the only example: it can conceal which transformation occurred. Interpolated animation illustrates an operation; distances and correspondence are evaluated at the actual transformed states.

## Relationship to the existing application

Existing point and line editors do not provide shape-wide rigid transformations, correspondence, or operation composition. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [Mathigon — Rigid Transformations](https://mathigon.org/course/transformations/rigid) — Translations, reflections, and rotations.

