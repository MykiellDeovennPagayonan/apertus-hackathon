# Conditional probability and hidden origins

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-16

## Human prompt

> If I already know the marble is blue, how does that change the chance it came from the first bag?

## What the simulation does

Make the changed reference group in a conditional probability visible. Learners connect a revealed observation with the possible origins that remain compatible with it.

## Learner experience

Show two bags, their labelled contents, and the probability of selecting each bag. Draw from a hidden selected bag, reveal only the colour, and highlight the relevant branches in a probability tree. Compare the prior and updated probabilities.

## Learning goals

- Identify the event being conditioned on.
- Distinguish P(bag A given blue) from P(blue given bag A).

## Objects and controls

- Each bag's blue/red counts and bag-selection probability.
- Reveal colour, inspect the tree, or run seeded repeated trials.
- Toggle the conditional reference group; reset.

## Model and observations

Compute P(A | blue) = P(blue | A)P(A)/P(blue), where P(blue) includes contributions from both bags. The first version replaces the marble after every trial so bag contents remain fixed. Use exact branch probabilities rather than treating differently weighted marbles as equally likely. [OpenStax — Independent and Mutually Exclusive Events](https://openstax.org/books/introductory-statistics-2e/pages/3-2-independent-and-mutually-exclusive-events).

## Example investigation

Bag A contains 8 blue and 2 red; bag B contains 2 blue and 8 red. With equal bag-selection probabilities, seeing blue makes the probability of A equal to 0.8.

## Scope and limitations

If blue is impossible, the conditional probability is undefined. Changing the bag-selection weights changes the answer even when contents stay the same. Sampling without replacement needs updated contents and a separate mode.

## Relationship to the existing application

Uniform coin/die experiments do not represent hidden origins, weighted branches, or probability updates after evidence. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Independent and Mutually Exclusive Events](https://openstax.org/books/introductory-statistics-2e/pages/3-2-independent-and-mutually-exclusive-events) — Conditional probabilities, dependence, and replacement.

