# Dynamic systems provisional UX review

Date: 2026-10-04. This is a source/semantic review before integrated browser inspection. Scores are intentionally withheld until the normal creation flow renders these views at both required viewports.

| Prompt | Observation | Learner impact | Implemented response | Retest after integration |
| --- | --- | --- | --- | --- |
| GROW-001 | Percent-as-decimal model input can be easy to misread. | A learner could enter 10 for 10%, outside the safe schema. | Primary action uses 10% directly; exact control says `0.10 = 10%`; result cards show totals and selected rate/duration. | Create with exact prompt; set zero rate; use primary two-year scenario; enter invalid rate; inspect 1440×900 and 390×844. |
| TRAFFIC-001 | Motion alone can conceal whether the jam comes from vehicle state. | A decorative wave would teach the wrong causal story. | Ring dots use authoritative positions and speed-derived amber state. Numeric average/minimum speed, slow-car count, and minimum gap remain visible. Pause and step preserve access under reduced motion. | Trigger brake, pause, step, increase headway, reset, and compare lower density. Confirm backwards follower propagation from snapshots. |
| QUEUE-001 | “Shorter line” can mean fewer waiting now or less waiting time. | One visual count can overstate a random short run. | Results distinguish mean wait, maximum line, completed, waiting, and in service. The view states that schedules are held fixed. | Compare one/two cashiers, confirm schedule identity and accounting, inspect long labels and customer dots on mobile. |

All essential buttons and inputs use semantic controls, 44 px minimum target height, visible shared focus treatment, live feedback, and a non-drag interaction path. The layouts collapse to one column and then one result column on narrow screens. Browser focus order, clipping, contrast, reduced-motion clock behavior, and actual first-action clarity remain to be measured after Agent A’s shared integration.
