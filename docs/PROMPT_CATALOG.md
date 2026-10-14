# Prompt catalog

Last reviewed: 2026-10-03. One catalog for all creation prompts and their verification status. Submit the exact prompt through the normal creation input; opening a premade card does not verify a prompt. Planned entries remain in this table so implementation and verification progress can be tracked in one place.

## Prompts

Preserve wording, punctuation, and explicit quantities when testing. The fifteen prompts assigned to Agents A–E have implementation and acceptance contracts in [plan 006](agent-only/implementation/006-COMPOSABLE_SIMULATION_EXPANSION.md). Defaults and component names belong to the implementation, not to the user's prompt.

| ID | Simulation | Exact creation prompt | Owner | Status | Round 1 | Round 2 | Evidence / qualification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DIV-001 | Division | Show me how division works | Unassigned | Previously reported / reverify | Reported / reverify | Reported / reverify | [005, acceptance table](agent-only/implementation/005-SHORT_PROMPT_SIMULATION_CREATION.md#17-evidence-and-reporting) reports two passes on `0c619d422d09`; not revalidated in this documentation task. |
| BALL-001 | Throwing a ball | Show me how throwing a ball works | Unassigned | Previously reported / reverify | Reported / reverify | Reported / reverify | Same reported candidate and qualification as DIV-001. |
| GAS-001 | Gas pressure | Show me how gas pressure works | Unassigned | Previously reported / reverify | Reported / reverify | Reported / reverify | Same reported candidate and qualification as DIV-001. |
| COUNT-001 | Counting | Help me count 8 circles. | Unassigned | Implemented / unverified | Not run | Not run | Counting family exists; exact prompt acceptance not established here. |
| ARITH-001 | Addition and subtraction | Show me how to add 3 and 4. | Unassigned | Implemented / unverified | Not run | Not run | Arithmetic family exists; exact prompt acceptance not established here. |
| FRAC-001 | Fraction builder | Show me what three quarters looks like. | Unassigned | Implemented / unverified | Not run | Not run | Fraction builder exists; exact prompt acceptance not established here. |
| FLINE-001 | Fraction number line | Show me one half on a number line. | Unassigned | Implemented / unverified | Not run | Not run | Fraction number line exists; exact prompt acceptance not established here. |
| RATIO-001 | Ratios and percentages | Show me how ratios become percentages. | Unassigned | Implemented / unverified | Not run | Not run | Ratio family exists; exact prompt acceptance not established here. |
| AREA-001 | Area and perimeter | Show me the area and perimeter of a rectangle. | Unassigned | Implemented / unverified | Not run | Not run | Rectangle family exists; exact prompt acceptance not established here. |
| COORD-001 | Coordinates | Show me how coordinates work. | Unassigned | Implemented / unverified | Not run | Not run | Coordinate family exists; exact prompt acceptance not established here. |
| PROB-001 | Probability | Show me what happens when I flip a coin many times. | Unassigned | Implemented / unverified | Not run | Not run | Probability family exists; exact prompt acceptance not established here. |
| BRIDGE-001 | Bridge response | Show me what happens when a truck crosses a bridge. | Unassigned | Implemented / unverified | Not run | Not run | Heuristic bridge response exists; exact prompt acceptance not established here. |
| TOWN-001 | Town routines | Show me people going about their day in a town. | Unassigned | Implemented / unverified | Not run | Not run | Town routines exist; exact prompt acceptance not established here. |
| ALG-001 | Balancing equations | Show me how to solve 2x + 3 = 11. | Agent A | Planned | Not run | Not run | — |
| LINE-001 | Slope and intercept | What happens to a line when I change its slope? | Agent A | Planned | Not run | Not run | — |
| PI-001 | Discovering pi | Why is pi the same for every circle? | Agent A | Planned | Not run | Not run | — |
| GROW-001 | Compound growth | Show me how $100 grows with compound interest. | Agent E | Planned | Not run | Not run | — |
| PEND-001 | Pendulum motion | Does a longer swing move more slowly? | Agent B | Planned | Not run | Not run | — |
| FRIC-001 | Friction on a ramp | Why does a toy car roll farther on a smooth floor? | Agent B | Planned | Not run | Not run | — |
| CIRC-001 | Simple electric circuits | What happens if I add another bulb to a circuit? | Agent B | Planned | Not run | Not run | — |
| DIL-001 | Mixing solutions | What happens to salt water when I add more water? | Agent C | Planned | Not run | Not run | — |
| CHEM-001 | Balancing chemical reactions | Help me see why chemical equations need balancing. | Agent C | Planned | Not run | Not run | — |
| RATE-001 | Reaction speed | Why do reactions happen faster when it’s warmer? | Agent C | Planned | Not run | Not run | — |
| DIFF-001 | Diffusion | Show me how a drop of dye spreads through water. | Agent D | Planned | Not run | Not run | — |
| ECO-001 | Predator and prey populations | What happens to foxes when there are fewer rabbits? | Agent D | Planned | Not run | Not run | — |
| PLANT-001 | Plant growth and limiting resources | Will a plant keep growing faster if I give it more light? | Agent D | Planned | Not run | Not run | — |
| TRAFFIC-001 | Traffic jams | How can a traffic jam start when there’s no accident? | Agent E | Planned | Not run | Not run | — |
| QUEUE-001 | Queues and service speed | Would a second cashier make the line much shorter? | Agent E | Planned | Not run | Not run | — |

## Status conventions

- **Planned:** requested capability; no implementation or acceptance claim.
- **Implementing:** work has started; not accepted.
- **Implemented / unverified:** relevant runtime capability exists; this exact prompt has not met the acceptance gate.
- **Previously reported / reverify:** an earlier document reports success; evidence and the current candidate have not been rechecked.
- **Verifying (1/2):** one complete qualifying round passed on the identified frozen candidate.
- **Working (2/2):** two consecutive complete live-model + Playwright MCP rounds passed on the same candidate, with an analyzed results report linked here.
- **Blocked:** a named dependency prevents work; record the blocker and next action.
- **Regressed:** a previously accepted prompt now fails; link the failure summary and stop advertising it as working.

“Working” applies to the recorded build, models, configuration, and tested scope. A change affecting those invalidates the acceptance streak. Do not promote status from source inspection, screenshots, unit tests, or mocked responses alone.

## Updating this catalog

The integration owner is the sole editor during parallel development. Each domain agent supplies a status proposal with prompt ID, candidate fingerprint, date, model configuration, result, limitations, and evidence paths. Record failures as well as passes. Preserve compact analyzed result summaries instead of overwriting them. Delete analyzed raw Playwright data according to plan 006; catalog links must point to retained reports, not deleted artifacts.

For every Working entry, link a report covering both rounds and record the candidate and verification date. A per-prompt local pass is provisional until the complete 006 suite passes twice after integration. Existing baseline prompts retain their separate 005 or baseline acceptance scope; do not claim they were retested by testing only the fifteen new prompts.

No new simulations or live acceptance tests were executed while creating this catalog. The authoritative capability sources inspected were [creation planner](../src/web/src/lib/planner/creation.ts), [capabilities](../src/web/src/simulations/legacy/runtime/capabilities.ts), and [recipe resolver](../src/web/src/simulations/legacy/runtime/resolver.ts).
