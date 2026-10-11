# Alternate voting systems

Date: 2026-10-10  
Status: Proposed simulation concept.

## Concept

Can the same people, with the same preferences, elect different winners under different voting rules?

Learners see a population of little dots, with each dot representing one individual voter. Candidates have distinct colors and labels. Dots show each person's vote, and change color when a different candidate receives that person's counted vote. The learner switches voting systems while keeping the electorate and underlying preferences fixed.

The main investigation compares first-past-the-post, instant-runoff voting, and approval voting for one elected position. Learners watch votes accumulate, inspect individual ballots, and step through elimination and vote transfers. Later experiments can introduce strategic voting, turnout, or changes in candidate choice.

The simulation should reveal how rules translate preferences into outcomes without declaring one system universally best. Who wins, how broadly they are supported, and how voters express their preferences are distinct questions.

## Dot-based experience

Keep every voter in a stable position across comparisons so learners can follow the same person. Use a neutral grid by default; spatial clusters should only carry social or policy meaning if that meaning is explicitly configured. Candidate colors and labels stay consistent across systems.

- **First-past-the-post:** each dot takes the color of the candidate receiving that person's single vote.
- **Instant-runoff:** each dot starts with its highest-ranked candidate's color. When that candidate is eliminated, animate a change to the next ranked candidate still in contention. Highlight only the dots transferring in that round.
- **Approval:** an individual can approve several candidates. Use colored segments within the dot, or a segmented ring, to show all approvals rather than forcing the ballot into one candidate's color. A candidate-focus view can highlight everyone approving that candidate.
- **Exhausted or blank ballots:** use distinct neutral styles and explicit labels. Do not color these dots as votes for the winner.

Selecting a dot reveals its voter ID, preference ranking, approval choices, submitted ballot, and current counted allocation. A short event explanation can say, “C was eliminated; this ballot now counts for B.” Vote transfers follow an existing ballot; a color change does not mean the voter changed their mind.

Candidate labels, patterns, an accessible legend, and numeric totals supplement color. Keep final ballot colors visible when a winner is announced; do not recolor the entire electorate as though everyone supported that winner.

## Voting rules

| System | Ballot | Counting rule |
| --- | --- | --- |
| First-past-the-post | One selected candidate | The candidate with the most votes wins; an absolute majority is not required. |
| Instant-runoff voting, also called the alternative vote | An ordered list of candidates | Count each ballot for its highest-ranked remaining candidate. If nobody has more than half of active ballots, eliminate the candidate with the fewest votes and transfer those ballots. Repeat until a winner is found. |
| Approval voting | Any number of approved candidates | Each approved candidate receives one vote from that ballot. The candidate with the most approvals wins. |

For instant-runoff, an active ballot is one that still ranks a remaining candidate. A ballot with no remaining ranked candidate becomes exhausted and leaves the active-ballot majority denominator. Eliminate one candidate per round. Resolve elimination ties using a visible, recorded tie-break order; resolve final winner ties the same way. If there are no active ballots, report no result rather than inventing a majority.

Approval totals can exceed the voter count because each person may approve multiple candidates. Rankings alone do not uniquely determine approvals. Store explicit approval choices or use a visible configurable approval rule. Keep candidate identities, ballot-generation rules, turnout, and tie-break policy with each recorded run.

These teaching definitions draw on [UK Parliament's explanation of voting systems](https://www.parliament.uk/about/how/elections-and-voting/voting-systems/) and the [Center for Election Science's approval voting definition](https://electionscience.org/education/approval-voting). The latter advocates for approval voting; use its ballot definition without adopting its claims of superiority. Real election procedures vary by jurisdiction; this simulation uses the explicit rules above.

## Starting electorate

Begin with 100 voters and three fictional candidates, A, B, and C:

| Voters | Preference ranking | Explicit approvals for this example |
| --- | --- | --- |
| 40 | A, then B, then C | A and B |
| 35 | B, then C, then A | B and C |
| 25 | C, then B, then A | C and B |

Under sincere first-choice voting, A wins first-past-the-post with 40 votes. Under instant-runoff, C is eliminated first and its 25 ballots transfer to B, which wins with 60 votes. Under the specified approval ballots, B receives 100 approvals, C receives 60, and A receives 40. This illustrates a possible difference, not a typical outcome or proof of a system's superiority.

Animate the 25 C-colored dots turning B-colored during the instant-runoff transfer. In approval mode, those same voters show both C and B as approved. The individual's preferences remain unchanged throughout the comparison.

## Learner controls and human behavior

Learners can select the voting system, edit group sizes and preferences, inspect or edit individual ballots, and step through counting. Offer a same-electorate comparison, restart, and replay. Counting is deterministic for fixed ballots and tie-break rules; random electorate generation uses a recorded seed.

Begin with sincere ballots: first choice for first-past-the-post, the stored ranking for instant-runoff, and explicit approvals for approval voting. Keep a later strategic-voting mode separate. In that mode, voters may respond to published polls by backing a perceived viable candidate or changing their approval choices. Show both underlying preferences and submitted ballots so learners can distinguish a changed preference from a strategic decision.

Other experiments can vary turnout across groups, introduce a similar candidate to investigate vote splitting, or change approval thresholds. Change one factor at a time. Model these behaviors with documented rules rather than assuming all voters respond identically or making unrecorded random choices.

## Observation and learning goals

Show candidate totals, counting round, active and exhausted ballot counts, transfers, and the winner. Optional comparisons include how many voters rank the winner first and how many explicitly approve the winner. Do not treat a transferred vote as an approval or use approval totals as a first-choice share.

- Explain why the same electorate can produce different winners under different rules.
- Distinguish a plurality from an absolute majority.
- Follow an individual ballot through elimination and transfer.
- Recognize the difference between rankings, approvals, preferences, and strategic ballots.
- Explore vote splitting, turnout, and incentives without assuming a universal outcome.
- Read a dot visualization without confusing vote allocation with a change of opinion.
