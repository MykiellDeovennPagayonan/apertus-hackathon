# Loan repayment and amortization

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: MATH-18

## Human prompt

> Show me where each loan payment goes and what changes if I pay a little extra every month.

## What the simulation does

Follow a fictional fixed-rate loan through its payment schedule. The lesson makes the changing interest/principal split visible and compares equal starting loans with different extra payments.

## Learner experience

Use a balance bar and a month-by-month timeline. Step one payment at a time; split it into interest and principal. Run the baseline and extra-payment schedule side by side and inspect the payoff month and total interest.

## Learning goals

- Explain why a fixed payment has a changing interest/principal split.
- Trace how extra principal payments affect later interest and payoff time.

## Objects and controls

- Starting principal, nominal annual rate, term in months.
- Extra monthly principal payment and baseline comparison.
- Step month, inspect schedule, play, and reset.

## Model and observations

Let i be the nominal annual rate divided by 12. For i > 0, fixed payment M = P i/[1 − (1 + i)^(-N)]; at i = 0 use P/N. Each month, interest = i × opening balance. Apply the payment to interest first and then principal, limiting the final payment to what is owed. [OpenStax — The Basics of Loans](https://openstax.org/books/contemporary-mathematics/pages/6-8-the-basics-of-loans).

## Example investigation

For principal 1200, a nominal annual rate of 12%, and 12 payments, M is approximately 106.62. First-month interest is 12, so approximately 94.62 reduces principal before any extra payment.

## Scope and limitations

State the compounding and payment timing assumptions. Use neutral currency units, full internal precision, and rounded displays; real lenders can apply different rounding and day-count rules. Omit fees, penalties, taxes, variable rates, and missed payments in the first version.

## Relationship to the existing application

Compound growth exists but excludes withdrawals and payments; it does not provide amortization or a principal/interest schedule. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — The Basics of Loans](https://openstax.org/books/contemporary-mathematics/pages/6-8-the-basics-of-loans) — Installment payments and the interest/principal split.

