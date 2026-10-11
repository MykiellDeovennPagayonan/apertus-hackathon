# Decimal place value

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-01

## Human prompt

> Why does moving the decimal point change the number so much? Show me with blocks.

## What the simulation does

Make the value of each digit visible through a place-value board and linked base-ten blocks. This helps learners interpret prices, measurements, and calculator results without relying on a rule about moving a dot.

## Learner experience

Start at 12.34 with columns for tens, ones, tenths, and hundredths. Select a digit to highlight its contribution. Exchange one whole for ten tenths, then apply multiplication or division by ten and watch every digit move relative to a fixed decimal marker. Keep a before-and-after board visible.

## Learning goals

- Connect a digit's position with its numerical contribution.
- Distinguish regrouping that preserves a number from scaling that changes it.

## Objects and controls

- Number entry with up to two fractional places; digit selection.
- Exchange ten smaller blocks for one larger block, and reverse.
- Multiply/divide by ten, compare, and reset.

## Model and observations

Represent the initial bounded decimals as integer hundredths. A digit in position k contributes digit × 10^k. Value-preserving exchanges must leave the total unchanged; scaling multiplies or divides the total. Extend precision explicitly before permitting operations that introduce thousandths. The rendered blocks follow the numerical state. [OpenStax — Decimals](https://openstax.org/books/prealgebra-2e/pages/5-1-decimals).

## Example investigation

Exchange the three tenths in 12.34 for thirty hundredths: the value remains 12.34. Multiplying the original number by ten gives 123.4.

## Scope and limitations

Use a clearly labelled whole as the reference block. Limit block counts and zoom into fractional units rather than shrinking blocks beyond readability. Do not frame decimal multiplication as an arbitrary movement of punctuation.

## Relationship to the existing application

Existing counting and fraction boards do not model positional decimal digits or regrouping across powers of ten. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Decimals](https://openstax.org/books/prealgebra-2e/pages/5-1-decimals) — Place values, powers of ten, and decimal notation.

