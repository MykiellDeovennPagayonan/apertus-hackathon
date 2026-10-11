# Pulley systems and lifting effort

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-02

## Human prompt

> Does adding more pulleys really make a heavy box easier to lift? Show me what I give up in return.

## What the simulation does

Compare rope arrangements that lift the same load. Learners count the strands supporting the moving load and connect reduced pulling force with increased rope travel.

## Learner experience

Offer a fixed pulley, one movable pulley, and a small block-and-tackle preset. Pull a rope handle while tracking the load's rise. Colour each continuous rope consistently and highlight only the strands that support the moving assembly.

## Learning goals

- Distinguish a direction-changing fixed pulley from a force-multiplying arrangement.
- Explain why the number of supporting strands matters more than pulley count.

## Objects and controls

- Validated rope-routing preset and load mass.
- Pull distance, slow-motion playback, and rope-tension overlay.
- Support-strand highlights; compare arrangements; reset.

## Model and observations

For a validated arrangement with n vertical supporting strands, a massless rope has uniform tension T and quasi-static balance requires nT = mg. Pulling rope distance s raises the load by s/n. A fixed overhead pulley with one supporting strand has n = 1. [OpenStax — Simple Machines](https://openstax.org/books/college-physics-2e/pages/9-5-simple-machines).

## Example investigation

For a 200 N load and four supporting strands, ideal pull force is 50 N. Raising the load 0.25 m requires pulling 1 m of rope.

## Scope and limitations

Use explicit preset topology; do not infer advantage from decorative pulley count. Start with frictionless pulleys, inextensible rope, negligible pulley mass, and no acceleration. Angled strands require vertical tension components.

## Relationship to the existing application

There is no existing rope-routing or pulley mechanical-advantage model. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Simple Machines](https://openstax.org/books/college-physics-2e/pages/9-5-simple-machines) — Pulley support strands and ideal mechanical advantage.

