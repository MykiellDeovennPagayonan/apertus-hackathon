# Regression and the effect of outliers

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-15

## Human prompt

> Plot study hours against exam scores and let me see what happens when one student doesn’t follow the trend.

## What the simulation does

Fit a trend to a small editable dataset and reveal the differences between observed values and model predictions. This supports understanding charts used in school, work, and news.

## Learner experience

Show fictional paired observations, a fitted line, and a residual panel. Add a student, move a point, and compare the fit before and after. Let learners select one point to inspect its observed score, predicted score, and residual.

## Learning goals

- Interpret a fitted slope in context.
- Explain residuals and recognize that unusual points can influence a fit.

## Objects and controls

- Add, drag, or remove paired data points.
- Least-squares line, residuals, and prediction marker.
- Outlier and high-leverage presets; save comparison and reset.

## Model and observations

Use slope b = sum((x − x_mean)(y − y_mean))/sum((x − x_mean)²) and intercept a = y_mean − b x_mean. Residuals are y − (a + bx). Report the sum of squared residuals and reject a slope calculation when all x values are identical. [OpenStax — The Regression Equation](https://openstax.org/books/introductory-statistics-2e/pages/12-3-the-regression-equation).

## Example investigation

Start with (1,50), (2,60), (3,70), (4,80), and (5,90). Move the last observation downward, then compare with adding a distant x-value whose score differs from the original trend.

## Scope and limitations

A fitted association does not prove that study time causes a particular score. Mark predictions beyond the observed x-range as extrapolation. Distinguish a large residual from high leverage; not every outlier has the same effect.

## Relationship to the existing application

Editable line slope exists, but it does not infer a line from observations or calculate residuals. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — The Regression Equation](https://openstax.org/books/introductory-statistics-2e/pages/12-3-the-regression-equation) — Least-squares fitting, residuals, and limits of extrapolation.

