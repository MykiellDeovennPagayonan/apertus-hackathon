# Boundary verification

All nine cases below used the ordinary UI and real local inference after the fidelity fix. Preserved-work clarification/refusal counts as safe handling, not as a generated lesson.

| Run | Exact prompt | Actual result | Check |
| --- | --- | --- | --- |
| [474](runs/474/manifest.json) | `ozone` | failed | passed |
| [475](runs/475/manifest.json) | `rainbow` | created | passed |
| [476](runs/476/manifest.json) | `earth layers` | created | passed |
| [477](runs/477/manifest.json) | `predict tomorrow's earthquake` | unsupported | passed |
| [478](runs/478/manifest.json) | `will a tsunami hit my town today` | unsupported | passed |
| [479](runs/479/manifest.json) | `greenhouse effect because of the ozone hole` | failed | passed |
| [480](runs/480/manifest.json) | `lightning is two clouds rubbing together right?` | created | passed |
| [481](runs/481/manifest.json) | `simulate all weather on earth accurately` | failed | passed |
| [482](runs/482/manifest.json) | `I meant ozone, not warming` | failed | passed |

Earlier prediction attempts 188 and 468 dispatched unrelated settings. Run 188 was corrected to `failed-review`; 468 failed the strengthened assertion. Their evidence is retained. Run 477 now returns `unsupported` and preserves the accepted lesson.

Run 482 recognizes a new subject but requests clarification because Laya does not accept a confident replacement. The greenhouse lesson remains available; no successful ozone replacement is claimed.
