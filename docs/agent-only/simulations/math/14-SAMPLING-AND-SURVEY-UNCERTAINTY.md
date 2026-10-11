# Sampling and survey uncertainty

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-14

## Human prompt

> Why might a survey of 20 people give a different answer from a survey of 500?

## What the simulation does

Show how estimates vary across repeated samples from the same population. A deliberately biased sampling mode reveals why collecting more responses is not enough on its own.

## Learner experience

Use a fictional population with 60% choosing option A. Draw repeated random samples of 20 or 500 and place each sample proportion on a distribution plot. Reveal the population value, then compare random selection with oversampling one subgroup.

## Learning goals

- Separate an individual sample estimate from the underlying population value.
- Distinguish sampling variation from systematic selection bias.

## Objects and controls

- Sample size, population proportion, and subgroup composition.
- Random or explicitly biased selection; draw once or repeat.
- Shared seed, distribution overlay, reveal truth, and reset.

## Model and observations

Use independent Bernoulli draws for the first random-sampling mode, explicitly representing sampling with replacement from an effectively large population. Record each estimate as successes/n. Its theoretical standard error is sqrt(p(1 − p)/n). Biased mode changes the selection probabilities, not the population truth. [OpenStax — Data, Sampling, and Variation in Data and Sampling](https://openstax.org/books/introductory-statistics-2e/pages/1-2-data-sampling-and-variation-in-data-and-sampling).

## Example investigation

At p = 0.60, theoretical standard errors are about 11.0 percentage points for n = 20 and 2.2 points for n = 500. Individual samples can still be unusually far from 60%.

## Scope and limitations

Do not promise that a larger sample is closer in every run. Without-replacement sampling from a finite population requires a separate correction. First-version plots show repeated estimates; confidence intervals need a stated method and valid conditions.

## Relationship to the existing application

Coin trials exist, but they do not offer repeated survey estimates, sample-size comparisons, or subgroup selection bias. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Data, Sampling, and Variation in Data and Sampling](https://openstax.org/books/introductory-statistics-2e/pages/1-2-data-sampling-and-variation-in-data-and-sampling) — Sampling methods, variation, and sources of bias.
- [OpenStax — A Population Proportion](https://openstax.org/books/introductory-statistics-2e/pages/8-3-a-population-proportion) — Sampling uncertainty and proportion estimation.

