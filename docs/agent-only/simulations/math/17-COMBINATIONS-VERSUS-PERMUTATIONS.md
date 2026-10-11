# Combinations versus permutations

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-17

## Human prompt

> Why is choosing three teammates different from choosing first, second, and third place?

## What the simulation does

Compare selecting a group with assigning ordered positions. The same people appear in both scenes, making repeated versions of one unordered group easy to recognize.

## Learner experience

Start with five labelled people and three slots. In podium mode, swapping two people creates a new outcome. In team mode, those arrangements collapse into the same group. A small gallery and branching tree reveal the counting structure.

## Learning goals

- Determine when order matters.
- Explain why an unordered selection removes repeated orderings.

## Objects and controls

- Number of distinct people and number selected.
- Ordered podium or unordered team mode.
- Enumerate a small case, group equivalent outcomes, and reset.

## Model and observations

Without repetition, P(n,k) = n!/(n − k)! and C(n,k) = n!/[k!(n − k)!], for integer 0 ≤ k ≤ n. Canonically sort person IDs to deduplicate teams. Keep exact counts separate from the capped visual gallery. [OpenStax — Counting Principles](https://openstax.org/books/college-algebra-2e/pages/9-5-counting-principles).

## Example investigation

From five people, there are 60 ordered podiums but 10 three-person teams. Each team appears in 3! = 6 possible podium orders.

## Scope and limitations

Start with distinct people and no repeated selections. Repetition and indistinguishable objects require other formulas. The empty selection counts as one outcome; choosing more people than exist is impossible.

## Relationship to the existing application

Equal grouping teaches division and sharing; it does not enumerate selections or distinguish ordered and unordered outcomes. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Counting Principles](https://openstax.org/books/college-algebra-2e/pages/9-5-counting-principles) — Permutation and combination counting.

