# Packing boxes into a container

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-09

## Human prompt

> Help me see how many of these boxes fit in a storage bin if I turn some sideways.

## What the simulation does

Explore spatial fit rather than assuming that dividing container volume by box volume answers a packing problem. Learners arrange rigid boxes and inspect otherwise unusable gaps.

## Learner experience

Show a transparent rectangular bin, identical boxes, and a top/front view toggle. Rotate a box by quarter turns, place it on a grid, and compare a uniform layout with a mixed-orientation layout. Keep the number packed and remaining free space visible.

## Learning goals

- Distinguish a volume upper bound from an achievable arrangement.
- Explain how dimensions and orientation constrain packing.

## Objects and controls

- Container and box dimensions; allowed axis-aligned orientations.
- Drag placement, rotate, duplicate, and remove.
- Try uniform-grid layouts; compare with manual placement; reset.

## Model and observations

Each box must remain fully inside the container and avoid positive-volume overlap with every other box. Permit the distinct permutations of its three dimensions. For a uniform orientation, count floor(L/l) × floor(W/w) × floor(H/h). The volume ratio gives only an upper bound. [Practical constraints in the container loading problem](https://doi.org/10.1016/j.cor.2020.105186).

## Example investigation

A 10 × 10 × 10 cm bin and 6 × 6 × 6 cm boxes have a volume upper bound of four, but only one box fits when all boxes remain axis-aligned.

## Scope and limitations

Do not label a heuristic or manual arrangement optimal without a proof or a completed bounded search. Start with identical rigid cuboids; omit stacking strength, weight distribution, and real packing friction. Distinguish geometric container loading from capacity-only bin packing.

## Relationship to the existing application

Existing geometry boards have no containment, orientation, or box non-overlap model. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [Practical constraints in the container loading problem](https://doi.org/10.1016/j.cor.2020.105186) — Indexed abstract reviewed for orthogonal placement, containment, and non-overlap constraints; full article was not accessible.
- [Google OR-Tools — The Bin Packing Problem](https://developers.google.com/optimization/pack/bin_packing) — Capacity constraints and optimization objectives. Its example is capacity-based, not a 3D geometry solver.
