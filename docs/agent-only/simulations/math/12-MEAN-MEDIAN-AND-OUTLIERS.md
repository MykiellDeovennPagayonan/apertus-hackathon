# Mean, median, and outliers

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-12

## Human prompt

> Why does one really expensive house make the average house price look so high?

## What the simulation does

Let learners edit a small dataset and compare two measures of its centre. Visible individual observations explain which summaries react strongly to an extreme value.

## Learner experience

Show seven fictional house prices as labelled points on a number line. Move one price upward and observe the mean marker move while the median may stay put. An ordered row highlights the middle observation; a balance view explains the mean.

## Learning goals

- Calculate and interpret mean and median.
- Explain their different responses to changing individual observations.

## Objects and controls

- Drag values; add or remove an observation.
- Sort data and select the extreme-value preset.
- Show balance point, middle values, and before/after comparison; reset.

## Model and observations

Compute mean = sum(values)/n. For sorted odd-sized data, use the middle value; for even-sized data, average the two middle values. Preserve observation identities when reordering so learners can track the edited house. [OpenStax — Measures of the Center of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data).

## Example investigation

For 100, 110, 120, 130, 140, 150, 160, both summaries are 130. Changing 160 to 1000 moves the mean to 250 while the median stays 130.

## Scope and limitations

Use fictional values and neutral currency units. The median is less sensitive to magnitude changes at an extreme, but it can change when ranks or sample size change. An empty dataset has no defined mean or median.

## Relationship to the existing application

Existing random-trial frequencies and histogram displays do not compute or teach editable dataset centres. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Measures of the Center of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data) — Mean and median definitions.

