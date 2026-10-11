# Spread and standard deviation

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-13

## Human prompt

> Can two classes have the same average score but very different results? Show me.

## What the simulation does

Compare datasets with the same centre but different dispersion. Learners see distances from the mean and how squaring those distances weights large deviations.

## Learner experience

Open two fictional classes with mean score 70. One has tightly clustered scores and the other widely spread scores. Move pairs of points symmetrically to keep the mean fixed; inspect deviation bars and squares.

## Learning goals

- Distinguish centre from variability.
- Interpret standard deviation in the original unit and variance in squared units.

## Objects and controls

- Dataset selection, editable values, and keep-mean-fixed mode.
- Population versus sample formula.
- Deviation and squared-deviation overlays; compare and reset.

## Model and observations

Population variance is sum((x − mean)²)/N and standard deviation is its square root. Sample variance uses n − 1 and is undefined for n < 2. Label which population or sample interpretation is active. [OpenStax — Measures of the Spread of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-7-measures-of-the-spread-of-the-data).

## Example investigation

Treat 68, 69, 70, 71, 72 and 50, 60, 70, 80, 90 as complete fictional populations. Both means are 70; their standard deviations are approximately 1.41 and 14.14 points.

## Scope and limitations

Spread alone does not establish why a class differs. Do not describe standard deviation as the ordinary average absolute distance. Avoid mixing sample and population denominators under the same label.

## Relationship to the existing application

The app has frequency charts but no explicit variance model, deviation geometry, or matched-mean comparison. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Measures of the Spread of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-7-measures-of-the-spread-of-the-data) — Variance, sample and population standard deviation, and dispersion.

