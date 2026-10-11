# Time-limited final verification

Completed on 2026-10-11 within the user’s 15-minute wrap-up. Seven ordinary-UI primary generations and seven generated-recipe builder checks passed. The 91-request acceptance suite remains incomplete.

Source fingerprint: `693c7d58e5229cb592cc568181f5e1fba70b5958d064df47fa9a0e02af2783f9`. All fourteen runs share this fingerprint.

| Topic | Exact primary prompt | Generation | Generated builder / guest persistence |
| --- | --- | --- | --- |
| earthquake | `how do earthquakes happen?` | [656](runs/656/manifest.json) · passed | [663](runs/663/manifest.json) · passed |
| tsunami | `how does a tsunami form?` | [657](runs/657/manifest.json) · passed | [664](runs/664/manifest.json) · passed |
| atmosphere | `what are the layers of the atmosphere?` | [658](runs/658/manifest.json) · passed-with-repair | [665](runs/665/manifest.json) · passed |
| greenhouse | `how does the greenhouse effect work?` | [659](runs/659/manifest.json) · passed | [666](runs/666/manifest.json) · passed |
| lightning | `how does lightning form?` | [660](runs/660/manifest.json) · passed | [667](runs/667/manifest.json) · passed |
| rainbow | `how do rainbows form?` | [661](runs/661/manifest.json) · passed | [668](runs/668/manifest.json) · passed |
| weather | `how is weather formed?` | [662](runs/662/manifest.json) · passed | [669](runs/669/manifest.json) · passed |

Six generations passed without flagged repair; atmosphere run 658 passed after two authoring schema-failure/repair events. These failures remain in its diagnostics. Every generation records an accepted actual Laya decision, actual Apertus authoring, request correlation, the accepted graph, controls/stages and screenshots.

Builder checks use those actual generated recipes through native import. They exercise independent component edits, invalid-value rejection, Undo/Redo, placement/resize, guest save/reopen, Try lesson, native download and import. They do not constitute new generation attempts.

Not completed: the five-primary-per-topic and repeated alternative/follow-up acceptance counts, complete final-source boundary rerun, authenticated persistence, and first-time participant usability testing. Earlier checkpoint results, failures and interrupted runs are retained and separately described in REPORT.md.
