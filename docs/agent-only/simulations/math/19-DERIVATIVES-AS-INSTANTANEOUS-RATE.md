# Derivatives as an instantaneous rate

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-19

## Human prompt

> If this graph shows how far a car has travelled, how do I tell how fast it’s going at one exact moment?

## What the simulation does

Explain instantaneous rate through a position graph and a shrinking time interval. A moving car and linked secant/tangent lines connect calculus notation to something observable.

## Learner experience

Show a car moving along a straight road with position s(t). Select a time, place a second time marker nearby, and shrink the interval. Compare average velocity over the interval with the tangent's slope at the selected moment.

## Learning goals

- Distinguish average velocity from instantaneous velocity.
- Interpret the derivative as a limit rather than division by a zero time interval.

## Objects and controls

- Smooth motion preset and selected time.
- Signed time increment with a positive minimum magnitude.
- Secant/tangent overlays, motion playback, and reset.

## Model and observations

Compute the secant slope [s(t + h) − s(t)]/h for h ≠ 0 and the analytic derivative for a supported smooth preset. For s(t) = t² metres, v(t) = 2t m/s. Keep graph axis units visible and compare signed velocity with speed when motion reverses. [OpenStax — Defining the Derivative](https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative).

## Example investigation

At t = 3 s for s(t) = t², h = 1 s gives an average velocity of 7 m/s; h = 0.1 s gives 6.1 m/s. The instantaneous velocity is 6 m/s.

## Scope and limitations

Use position, not cumulative path length, if negative velocities are allowed. A sharp corner can lack a derivative and should be a separately labelled example. Do not claim a finite-difference estimate is the exact derivative.

## Relationship to the existing application

Line slopes are implemented, but local slopes of a curve and the secant-to-tangent limit are not. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Defining the Derivative](https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative) — Secant limits, tangents, and instantaneous velocity.

