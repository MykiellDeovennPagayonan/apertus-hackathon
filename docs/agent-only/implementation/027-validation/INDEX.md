# Numbered Earth and atmosphere verification

Every attempt is retained. Browser evidence uses standalone Playwright; MCP is unavailable. Screenshot inspection is reported separately from capture.

| Run | Kind | Topic / exact prompt | Result | Evidence |
| --- | --- | --- | --- | --- |
| 001 | premade-browser | earthquake ·  | interrupted · Verification server lacked NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS; no screenshots reached. Retest receives a new run number. | [manifest](runs/001/manifest.json) |
| 002 | premade-browser | tsunami ·  | failed · page.waitForFunction: Target page, context or browser has been closed | [manifest](runs/002/manifest.json) |
| 003 | premade-browser | earthquake ·  | passed | [manifest](runs/003/manifest.json) |
| 004 | premade-browser | tsunami ·  | passed | [manifest](runs/004/manifest.json) |
| 005 | premade-browser | atmosphere ·  | passed | [manifest](runs/005/manifest.json) |
| 006 | premade-browser | greenhouse ·  | passed | [manifest](runs/006/manifest.json) |
| 007 | premade-browser | lightning ·  | passed | [manifest](runs/007/manifest.json) |
| 008 | premade-browser | rainbow ·  | passed | [manifest](runs/008/manifest.json) |
| 009 | premade-browser | weather ·  | passed | [manifest](runs/009/manifest.json) |
| 010 | premade-browser | earthquake ·  | passed | [manifest](runs/010/manifest.json) |
| 011 | premade-browser | tsunami ·  | failed · locator.click: Timeout 60000ms exceeded. | [manifest](runs/011/manifest.json) |
| 012 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/012/manifest.json) |
| 013 | premade-browser | atmosphere ·  | passed | [manifest](runs/013/manifest.json) |
| 014 | premade-browser | greenhouse ·  | passed | [manifest](runs/014/manifest.json) |
| 015 | premade-browser | lightning ·  | passed | [manifest](runs/015/manifest.json) |
| 016 | live-prompt | tsunami · how does a tsunami form? | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/016/manifest.json) |
| 017 | premade-browser | rainbow ·  | passed | [manifest](runs/017/manifest.json) |
| 018 | premade-browser | weather ·  | passed | [manifest](runs/018/manifest.json) |
| 019 | live-prompt | atmosphere · what are the layers of the atmosphere? | passed | [manifest](runs/019/manifest.json) |
| 020 | live-prompt | greenhouse · how does the greenhouse effect work? | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/020/manifest.json) |
| 021 | live-prompt | lightning · how does lightning form? | passed | [manifest](runs/021/manifest.json) |
| 022 | api-diagnostic | tsunami · how does a tsunami form? | diagnostic-captured | [manifest](runs/022/manifest.json) |
| 023 | api-diagnostic | tsunami · how does a tsunami form? | diagnostic-captured | [manifest](runs/023/manifest.json) |
| 024 | api-diagnostic | tsunami · how does a tsunami form? | diagnostic-captured | [manifest](runs/024/manifest.json) |
| 025 | api-diagnostic | greenhouse · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/025/manifest.json) |
| 026 | api-diagnostic | greenhouse · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/026/manifest.json) |
| 027 | api-diagnostic | greenhouse · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/027/manifest.json) |
| 028 | api-diagnostic | rainbow · how do rainbows form? | diagnostic-captured | [manifest](runs/028/manifest.json) |
| 029 | api-diagnostic | rainbow · how do rainbows form? | diagnostic-captured | [manifest](runs/029/manifest.json) |
| 030 | api-diagnostic | rainbow · how do rainbows form? | diagnostic-captured | [manifest](runs/030/manifest.json) |
| 031 | api-diagnostic | lightning · how does lightning form? | diagnostic-captured | [manifest](runs/031/manifest.json) |
| 032 | api-diagnostic | lightning · how does lightning form? | diagnostic-captured | [manifest](runs/032/manifest.json) |
| 033 | api-diagnostic | lightning · how does lightning form? | diagnostic-captured | [manifest](runs/033/manifest.json) |
| 034 | api-diagnostic | weather · how is weather formed? | diagnostic-captured | [manifest](runs/034/manifest.json) |
| 035 | api-diagnostic | weather · how is weather formed? | diagnostic-captured | [manifest](runs/035/manifest.json) |
| 036 | api-diagnostic | weather · how is weather formed? | diagnostic-captured | [manifest](runs/036/manifest.json) |
| 037 | live-prompt | rainbow · how do rainbows form? | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/037/manifest.json) |
| 038 | live-prompt | weather · how is weather formed? | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/038/manifest.json) |
| 039 | premade-browser | earthquake ·  | passed | [manifest](runs/039/manifest.json) |
| 040 | premade-browser | tsunami ·  | passed | [manifest](runs/040/manifest.json) |
| 041 | premade-browser | atmosphere ·  | passed | [manifest](runs/041/manifest.json) |
| 042 | premade-browser | greenhouse ·  | passed | [manifest](runs/042/manifest.json) |
| 043 | premade-browser | lightning ·  | passed | [manifest](runs/043/manifest.json) |
| 044 | premade-browser | rainbow ·  | passed | [manifest](runs/044/manifest.json) |
| 045 | premade-browser | weather ·  | passed | [manifest](runs/045/manifest.json) |
| 046 | live-prompt | earthquake · how do earthquakes happen? | passed-with-repair | [manifest](runs/046/manifest.json) |
| 047 | live-prompt | tsunami · how does a tsunami form? | failed · page.waitForFunction: Timeout 300000ms exceeded. | [manifest](runs/047/manifest.json) |
| 048 | builder-persistence | rainbow ·  | failed · locator.fill: Timeout 30000ms exceeded. | [manifest](runs/048/manifest.json) |
| 049 | builder-persistence | rainbow ·  | failed · page.waitForFunction: Timeout 30000ms exceeded. | [manifest](runs/049/manifest.json) |
| 050 | builder-persistence | rainbow ·  | passed | [manifest](runs/050/manifest.json) |
| 051 | live-prompt | atmosphere · what are the layers of the atmosphere? | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"3d6bec74-7536-4208-91be-c7f302f89e39","message":"Apertus returned invalid stage arguments: value: unknown field configure","retryable":true} | [manifest](runs/051/manifest.json) |
| 052 | live-prompt | greenhouse · how does the greenhouse effect work? | passed-with-repair | [manifest](runs/052/manifest.json) |
| 053 | live-prompt | lightning · how does lightning form? | passed | [manifest](runs/053/manifest.json) |
| 054 | builder-persistence | earthquake ·  | passed | [manifest](runs/054/manifest.json) |
| 055 | builder-persistence | tsunami ·  | passed | [manifest](runs/055/manifest.json) |
| 056 | builder-persistence | atmosphere ·  | passed | [manifest](runs/056/manifest.json) |
| 057 | builder-persistence | greenhouse ·  | passed | [manifest](runs/057/manifest.json) |
| 058 | live-prompt | rainbow · how do rainbows form? | passed | [manifest](runs/058/manifest.json) |
| 059 | builder-persistence | lightning ·  | passed | [manifest](runs/059/manifest.json) |
| 060 | builder-persistence | rainbow ·  | passed | [manifest](runs/060/manifest.json) |
| 061 | motion-keyboard-recovery | earthquake ·  | passed | [manifest](runs/061/manifest.json) |
| 062 | motion-keyboard-recovery | tsunami ·  | passed | [manifest](runs/062/manifest.json) |
| 063 | builder-persistence | weather ·  | passed | [manifest](runs/063/manifest.json) |
| 064 | motion-keyboard-recovery | atmosphere ·  | passed | [manifest](runs/064/manifest.json) |
| 065 | motion-keyboard-recovery | greenhouse ·  | passed | [manifest](runs/065/manifest.json) |
| 066 | motion-keyboard-recovery | lightning ·  | passed | [manifest](runs/066/manifest.json) |
| 067 | motion-keyboard-recovery | rainbow ·  | passed | [manifest](runs/067/manifest.json) |
| 068 | motion-keyboard-recovery | weather ·  | passed | [manifest](runs/068/manifest.json) |
| 069 | premade-browser | earthquake ·  | passed | [manifest](runs/069/manifest.json) |
| 070 | live-prompt | weather · how is weather formed? | passed-with-repair | [manifest](runs/070/manifest.json) |
| 071 | premade-browser | tsunami ·  | passed | [manifest](runs/071/manifest.json) |
| 072 | premade-browser | atmosphere ·  | passed | [manifest](runs/072/manifest.json) |
| 073 | premade-browser | greenhouse ·  | passed | [manifest](runs/073/manifest.json) |
| 074 | premade-browser | lightning ·  | passed | [manifest](runs/074/manifest.json) |
| 075 | premade-browser | rainbow ·  | passed | [manifest](runs/075/manifest.json) |
| 076 | premade-browser | weather ·  | passed | [manifest](runs/076/manifest.json) |
| 077 | live-prompt | rainbow · how do rainbows form? | passed | [manifest](runs/077/manifest.json) |
| 078 | live-followup | rainbow · show a double rainbow | failed · page.waitForFunction: Timeout 300000ms exceeded. | [manifest](runs/078/manifest.json) |
| 079 | premade-browser | greenhouse ·  | passed | [manifest](runs/079/manifest.json) |
| 080 | builder-persistence | rainbow ·  | failed · AssertionError [ERR_ASSERTION]: Expected "actual" not to be strictly deep-equal to: | [manifest](runs/080/manifest.json) |
| 081 | builder-persistence | rainbow ·  | failed · AssertionError [ERR_ASSERTION]: Expected "actual" not to be strictly deep-equal to: | [manifest](runs/081/manifest.json) |
| 082 | builder-persistence | rainbow ·  | failed · AssertionError [ERR_ASSERTION]: Expected "actual" not to be strictly deep-equal to: | [manifest](runs/082/manifest.json) |
| 083 | live-followup | rainbow · make the sun higher | failed · AssertionError [ERR_ASSERTION]: Missing actual Apertus authoring | [manifest](runs/083/manifest.json) |
| 084 | builder-persistence | rainbow ·  | passed | [manifest](runs/084/manifest.json) |
| 085 | live-prompt | rainbow · how do rainbows form? | passed | [manifest](runs/085/manifest.json) |
| 086 | builder-persistence | earthquake ·  | passed | [manifest](runs/086/manifest.json) |
| 087 | builder-persistence | tsunami ·  | passed | [manifest](runs/087/manifest.json) |
| 088 | builder-persistence | atmosphere ·  | passed | [manifest](runs/088/manifest.json) |
| 089 | builder-persistence | greenhouse ·  | passed | [manifest](runs/089/manifest.json) |
| 090 | builder-persistence | lightning ·  | passed | [manifest](runs/090/manifest.json) |
| 091 | builder-persistence | rainbow ·  | passed | [manifest](runs/091/manifest.json) |
| 092 | builder-persistence | weather ·  | passed | [manifest](runs/092/manifest.json) |
| 093 | motion-keyboard-recovery | earthquake ·  | passed | [manifest](runs/093/manifest.json) |
| 094 | live-followup | rainbow · show a double rainbow | failed · AssertionError [ERR_ASSERTION]: Missing actual Apertus authoring | [manifest](runs/094/manifest.json) |
| 095 | motion-keyboard-recovery | tsunami ·  | passed | [manifest](runs/095/manifest.json) |
| 096 | motion-keyboard-recovery | atmosphere ·  | passed | [manifest](runs/096/manifest.json) |
| 097 | motion-keyboard-recovery | greenhouse ·  | passed | [manifest](runs/097/manifest.json) |
| 098 | motion-keyboard-recovery | lightning ·  | passed | [manifest](runs/098/manifest.json) |
| 099 | motion-keyboard-recovery | rainbow ·  | passed | [manifest](runs/099/manifest.json) |
| 100 | live-followup | rainbow · make the sun higher | failed · AssertionError [ERR_ASSERTION]: Missing actual Apertus authoring | [manifest](runs/100/manifest.json) |
| 101 | motion-keyboard-recovery | weather ·  | passed | [manifest](runs/101/manifest.json) |
| 102 | premade-browser | earthquake ·  | passed | [manifest](runs/102/manifest.json) |
| 103 | premade-browser | tsunami ·  | passed | [manifest](runs/103/manifest.json) |
| 104 | premade-browser | atmosphere ·  | passed | [manifest](runs/104/manifest.json) |
| 105 | premade-browser | greenhouse ·  | passed | [manifest](runs/105/manifest.json) |
| 106 | premade-browser | lightning ·  | passed | [manifest](runs/106/manifest.json) |
| 107 | premade-browser | rainbow ·  | passed | [manifest](runs/107/manifest.json) |
| 108 | premade-browser | weather ·  | passed | [manifest](runs/108/manifest.json) |
| 109 | api-diagnostic | context-selection · make the sun higher
Current simulation topic: Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. | diagnostic-captured | [manifest](runs/109/manifest.json) |
| 110 | api-diagnostic | context-selection · Active lesson: Rainbow formation. The learner asks: make the sun higher. This is a follow-up within the active lesson. | diagnostic-captured | [manifest](runs/110/manifest.json) |
| 111 | api-diagnostic | context-selection · In the rainbow formation simulation, make the Sun higher. | diagnostic-captured | [manifest](runs/111/manifest.json) |
| 112 | api-diagnostic | context-selection · show a double rainbow
Current simulation topic: Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. | diagnostic-captured | [manifest](runs/112/manifest.json) |
| 113 | live-prompt | rainbow · how do rainbows form? | passed | [manifest](runs/113/manifest.json) |
| 114 | builder-persistence | earthquake ·  | failed · locator.waitFor: Timeout 30000ms exceeded. | [manifest](runs/114/manifest.json) |
| 115 | builder-persistence | tsunami ·  | failed · AssertionError [ERR_ASSERTION]: Need an actual accepted inference recipe | [manifest](runs/115/manifest.json) |
| 116 | builder-persistence | atmosphere ·  | failed · locator.waitFor: Timeout 30000ms exceeded. | [manifest](runs/116/manifest.json) |
| 117 | live-followup | rainbow · show a double rainbow | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"6a974c24-3c07-43f2-b4d1-cc7241aabf95","message":"Apertus returned invalid stage arguments: Output was truncated; return only the requested small arguments","retryable":true} | [manifest](runs/117/manifest.json) |
| 118 | builder-persistence | greenhouse ·  | failed · locator.click: Timeout 30000ms exceeded. | [manifest](runs/118/manifest.json) |
| 119 | live-followup | rainbow · make the sun higher | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"e2604684-004d-4c81-a52c-2c3484d59fc1","message":"Apertus returned invalid stage arguments: Output was truncated; return only the requested small arguments","retryable":true} | [manifest](runs/119/manifest.json) |
| 120 | builder-persistence | lightning ·  | failed · locator.click: Timeout 30000ms exceeded. | [manifest](runs/120/manifest.json) |
| 121 | builder-persistence | rainbow ·  | failed · locator.waitFor: Timeout 30000ms exceeded. | [manifest](runs/121/manifest.json) |
| 122 | builder-persistence | weather ·  | failed · locator.waitFor: Timeout 30000ms exceeded. | [manifest](runs/122/manifest.json) |
| 123 | live-followup-diagnostic | rainbow · show a double rainbow | failed · response.text: Protocol error (Network.getResponseBody): No data found for resource with given identifier | [manifest](runs/123/manifest.json) |
| 124 | live-followup-diagnostic | rainbow · make the sun higher | failed · response.text: Protocol error (Network.getResponseBody): No data found for resource with given identifier | [manifest](runs/124/manifest.json) |
| 125 | live-followup-diagnostic | rainbow · show a double rainbow | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/125/manifest.json) |
| 126 | builder-persistence | rainbow ·  | passed | [manifest](runs/126/manifest.json) |
| 127 | live-followup-diagnostic | rainbow · make the sun higher | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/127/manifest.json) |
| 128 | live-followup-diagnostic | rainbow · show a double rainbow | passed | [manifest](runs/128/manifest.json) |
| 129 | live-followup-diagnostic | rainbow · make the sun higher | passed | [manifest](runs/129/manifest.json) |
| 130 | premade-browser | earthquake ·  | passed | [manifest](runs/130/manifest.json) |
| 131 | premade-browser | tsunami ·  | passed | [manifest](runs/131/manifest.json) |
| 132 | premade-browser | atmosphere ·  | passed | [manifest](runs/132/manifest.json) |
| 133 | premade-browser | greenhouse ·  | passed | [manifest](runs/133/manifest.json) |
| 134 | premade-browser | lightning ·  | passed | [manifest](runs/134/manifest.json) |
| 135 | premade-browser | rainbow ·  | passed | [manifest](runs/135/manifest.json) |
| 136 | premade-browser | weather ·  | passed | [manifest](runs/136/manifest.json) |
| 137 | live-boundary | atmosphere · ozone | passed | [manifest](runs/137/manifest.json) |
| 138 | live-boundary | rainbow · rainbow | passed | [manifest](runs/138/manifest.json) |
| 139 | premade-browser | earthquake ·  | passed | [manifest](runs/139/manifest.json) |
| 140 | premade-browser | tsunami ·  | passed | [manifest](runs/140/manifest.json) |
| 141 | premade-browser | atmosphere ·  | passed | [manifest](runs/141/manifest.json) |
| 142 | premade-browser | greenhouse ·  | passed | [manifest](runs/142/manifest.json) |
| 143 | premade-browser | lightning ·  | passed | [manifest](runs/143/manifest.json) |
| 144 | premade-browser | rainbow ·  | passed | [manifest](runs/144/manifest.json) |
| 145 | premade-browser | weather ·  | passed | [manifest](runs/145/manifest.json) |
| 146 | live-boundary | InsideEarth · earth layers | passed | [manifest](runs/146/manifest.json) |
| 147 | premade-browser | atmosphere ·  | passed | [manifest](runs/147/manifest.json) |
| 148 | live-boundary | earthquake-formation · predict tomorrow's earthquake | passed | [manifest](runs/148/manifest.json) |
| 149 | live-boundary | tsunami-formation · will a tsunami hit my town today | passed | [manifest](runs/149/manifest.json) |
| 150 | live-boundary | greenhouse · greenhouse effect because of the ozone hole | passed | [manifest](runs/150/manifest.json) |
| 151 | premade-browser | earthquake ·  | passed | [manifest](runs/151/manifest.json) |
| 152 | live-boundary | lightning · lightning is two clouds rubbing together right? | passed | [manifest](runs/152/manifest.json) |
| 153 | premade-browser | tsunami ·  | passed | [manifest](runs/153/manifest.json) |
| 154 | premade-browser | atmosphere ·  | passed | [manifest](runs/154/manifest.json) |
| 155 | premade-browser | greenhouse ·  | passed | [manifest](runs/155/manifest.json) |
| 156 | premade-browser | lightning ·  | passed | [manifest](runs/156/manifest.json) |
| 157 | premade-browser | rainbow ·  | passed | [manifest](runs/157/manifest.json) |
| 158 | premade-browser | weather ·  | passed | [manifest](runs/158/manifest.json) |
| 159 | motion-keyboard-recovery | earthquake ·  | passed | [manifest](runs/159/manifest.json) |
| 160 | motion-keyboard-recovery | tsunami ·  | passed | [manifest](runs/160/manifest.json) |
| 161 | motion-keyboard-recovery | atmosphere ·  | passed | [manifest](runs/161/manifest.json) |
| 162 | motion-keyboard-recovery | greenhouse ·  | passed | [manifest](runs/162/manifest.json) |
| 163 | motion-keyboard-recovery | lightning ·  | passed | [manifest](runs/163/manifest.json) |
| 164 | live-boundary | scope · simulate all weather on earth accurately | passed | [manifest](runs/164/manifest.json) |
| 165 | motion-keyboard-recovery | rainbow ·  | passed | [manifest](runs/165/manifest.json) |
| 166 | motion-keyboard-recovery | weather ·  | passed | [manifest](runs/166/manifest.json) |
| 167 | live-boundary | greenhouse-effect · I meant ozone, not warming | failed-review | [manifest](runs/167/manifest.json) |
| 168 | builder-persistence | earthquake ·  | passed | [manifest](runs/168/manifest.json) |
| 169 | builder-persistence | tsunami ·  | passed | [manifest](runs/169/manifest.json) |
| 170 | builder-persistence | atmosphere ·  | passed | [manifest](runs/170/manifest.json) |
| 171 | builder-persistence | greenhouse ·  | passed | [manifest](runs/171/manifest.json) |
| 172 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/172/manifest.json) |
| 173 | builder-persistence | lightning ·  | passed | [manifest](runs/173/manifest.json) |
| 174 | builder-persistence | rainbow ·  | passed | [manifest](runs/174/manifest.json) |
| 175 | builder-persistence | weather ·  | passed | [manifest](runs/175/manifest.json) |
| 176 | live-followup | earthquake · show sideways movement | failed · page.waitForFunction: Target page, context or browser has been closed | [manifest](runs/176/manifest.json) |
| 177 | api-diagnostic | topic-switch · The learner asks: I meant ozone, not warming. Active lesson for contextual changes: Greenhouse effect. A correction naming a different topic replaces the lesson. | diagnostic-captured | [manifest](runs/177/manifest.json) |
| 178 | api-diagnostic | topic-switch · Active lesson: Greenhouse effect. The learner asks: I meant ozone, not warming. Interpret changes in context. A correction such as "I meant X, not Y" requests topic X instead of the current lesson. | diagnostic-captured | [manifest](runs/178/manifest.json) |
| 179 | api-diagnostic | topic-switch · The learner asks: make the sun higher. Active lesson for contextual changes: Rainbow formation. A correction naming a different topic replaces the lesson. | diagnostic-captured | [manifest](runs/179/manifest.json) |
| 180 | api-diagnostic | topic-switch · Active lesson: Rainbow formation. The learner asks: make the sun higher. Interpret changes in context. A correction such as "I meant X, not Y" requests topic X instead of the current lesson. | diagnostic-captured | [manifest](runs/180/manifest.json) |
| 181 | api-diagnostic | topic-switch · The learner asks: show a double rainbow. Active lesson for contextual changes: Rainbow formation. A correction naming a different topic replaces the lesson. | diagnostic-captured | [manifest](runs/181/manifest.json) |
| 182 | api-diagnostic | topic-switch · Active lesson: Rainbow formation. The learner asks: show a double rainbow. Interpret changes in context. A correction such as "I meant X, not Y" requests topic X instead of the current lesson. | diagnostic-captured | [manifest](runs/182/manifest.json) |
| 183 | live-boundary | atmosphere · ozone | passed | [manifest](runs/183/manifest.json) |
| 184 | live-boundary | rainbow · rainbow | passed | [manifest](runs/184/manifest.json) |
| 185 | mobile-3d-review | earthquake ·  | passed | [manifest](runs/185/manifest.json) |
| 186 | mobile-3d-review | rainbow ·  | passed | [manifest](runs/186/manifest.json) |
| 187 | live-boundary | InsideEarth · earth layers | passed | [manifest](runs/187/manifest.json) |
| 188 | live-boundary | earthquake-formation · predict tomorrow's earthquake | failed-review | [manifest](runs/188/manifest.json) |
| 189 | mobile-3d-review | earthquake ·  | passed | [manifest](runs/189/manifest.json) |
| 190 | mobile-3d-review | rainbow ·  | passed | [manifest](runs/190/manifest.json) |
| 191 | live-boundary | tsunami-formation · will a tsunami hit my town today | passed | [manifest](runs/191/manifest.json) |
| 192 | live-boundary | greenhouse · greenhouse effect because of the ozone hole | passed | [manifest](runs/192/manifest.json) |
| 193 | live-boundary | lightning · lightning is two clouds rubbing together right? | passed | [manifest](runs/193/manifest.json) |
| 194 | live-boundary | scope · simulate all weather on earth accurately | passed | [manifest](runs/194/manifest.json) |
| 195 | live-boundary | greenhouse-effect · I meant ozone, not warming | passed | [manifest](runs/195/manifest.json) |
| 196 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/196/manifest.json) |
| 197 | live-followup | earthquake · show sideways movement | passed-with-repair | [manifest](runs/197/manifest.json) |
| 198 | live-followup | earthquake · show it slower | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/198/manifest.json) |
| 199 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/199/manifest.json) |
| 200 | live-followup | earthquake · show sideways movement | passed-with-repair | [manifest](runs/200/manifest.json) |
| 201 | live-followup | earthquake · show it slower | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/201/manifest.json) |
| 202 | live-prompt | earthquake · how do earthquakes happen? | failed · page.waitForFunction: Target page, context or browser has been closed | [manifest](runs/202/manifest.json) |
| 203 | live-followup-diagnostic | earthquake · show sideways movement | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"fa0fdc5d-3def-4358-b4e7-d8f86e1bd8b1","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/203/manifest.json) |
| 204 | live-followup-diagnostic | earthquake · show it slower | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"41c28248-ddb8-4803-ba49-b454c5570019","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/204/manifest.json) |
| 205 | live-followup-diagnostic | tsunami · what if the ocean is deeper | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"db22bc6a-ea0f-4ac3-aecd-4da495dc815a","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/205/manifest.json) |
| 206 | live-followup-diagnostic | tsunami · show the next wave | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"b9dbd5a4-e84f-48f7-92a1-8f385e727ed8","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/206/manifest.json) |
| 207 | live-followup-diagnostic | atmosphere · where is the ozone layer | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"a6ec7763-684f-446c-bac3-e9e41ae31b56","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/207/manifest.json) |
| 208 | live-followup-diagnostic | atmosphere · what if there is less ozone | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"edf576ab-9a9e-4ffc-bfb1-70758dc9a6e1","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/208/manifest.json) |
| 209 | live-followup-diagnostic | greenhouse · add more greenhouse gas | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/209/manifest.json) |
| 210 | live-followup-diagnostic | greenhouse · keep the sunlight the same | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"f59bc93c-94c2-4b39-ad31-db2a111abfc9","message":"Laya could not select a supported composition confidently. Please clarify the experiment.","retryable":false} | [manifest](runs/210/manifest.json) |
| 211 | live-followup-diagnostic | lightning · show lightning inside the cloud | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"2f51ebd6-42d2-4e9b-a848-e7f6c6baefb2","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/211/manifest.json) |
| 212 | live-followup-diagnostic | lightning · why is thunder later | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"1991c05a-811c-4aa1-bcec-41c811a0bbb7","message":"Apertus returned invalid stage arguments: value: unknown field arguments","retryable":true} | [manifest](runs/212/manifest.json) |
| 213 | live-followup-diagnostic | rainbow · show a double rainbow | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"05fc3c81-0c4a-4b79-a524-a10453b4e3f3","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/213/manifest.json) |
| 214 | live-followup-diagnostic | rainbow · make the sun higher | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"826cb603-3cdb-4fda-ad3d-91026fd290c3","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/214/manifest.json) |
| 215 | live-followup-diagnostic | weather · what happens over a mountain | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"9cfd2e61-71a0-4f63-808f-0ed899fd3ce6","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/215/manifest.json) |
| 216 | live-followup-diagnostic | weather · make the air drier | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"9cd2caaa-78f5-4fba-979a-51280396586d","message":"The requested change is unclear. Your current lesson is preserved; please specify the condition to change.","retryable":false} | [manifest](runs/216/manifest.json) |
| 217 | api-diagnostic | context-all · Active lesson: How earthquakes form. The learner asks: show sideways movement. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/217/manifest.json) |
| 218 | api-diagnostic | context-all · In the How earthquakes form simulation, show sideways movement | diagnostic-captured | [manifest](runs/218/manifest.json) |
| 219 | api-diagnostic | context-all · Active lesson: How earthquakes form. The learner asks: show it slower. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/219/manifest.json) |
| 220 | api-diagnostic | context-all · In the How earthquakes form simulation, show it slower | diagnostic-captured | [manifest](runs/220/manifest.json) |
| 221 | api-diagnostic | context-all · Active lesson: How tsunamis form. The learner asks: what if the ocean is deeper. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/221/manifest.json) |
| 222 | api-diagnostic | context-all · In the How tsunamis form simulation, what if the ocean is deeper | diagnostic-captured | [manifest](runs/222/manifest.json) |
| 223 | api-diagnostic | context-all · Active lesson: How tsunamis form. The learner asks: show the next wave. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/223/manifest.json) |
| 224 | api-diagnostic | context-all · In the How tsunamis form simulation, show the next wave | diagnostic-captured | [manifest](runs/224/manifest.json) |
| 225 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. The learner asks: where is the ozone layer. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/225/manifest.json) |
| 226 | api-diagnostic | context-all · In the Atmosphere layers and ozone simulation, where is the ozone layer | diagnostic-captured | [manifest](runs/226/manifest.json) |
| 227 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. The learner asks: what if there is less ozone. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/227/manifest.json) |
| 228 | api-diagnostic | context-all · In the Atmosphere layers and ozone simulation, what if there is less ozone | diagnostic-captured | [manifest](runs/228/manifest.json) |
| 229 | api-diagnostic | context-all · Active lesson: The greenhouse effect. The learner asks: add more greenhouse gas. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/229/manifest.json) |
| 230 | api-diagnostic | context-all · In the The greenhouse effect simulation, add more greenhouse gas | diagnostic-captured | [manifest](runs/230/manifest.json) |
| 231 | api-diagnostic | context-all · Active lesson: The greenhouse effect. The learner asks: keep the sunlight the same. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/231/manifest.json) |
| 232 | api-diagnostic | context-all · In the The greenhouse effect simulation, keep the sunlight the same | diagnostic-captured | [manifest](runs/232/manifest.json) |
| 233 | api-diagnostic | context-all · Active lesson: How lightning forms. The learner asks: show lightning inside the cloud. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/233/manifest.json) |
| 234 | api-diagnostic | context-all · In the How lightning forms simulation, show lightning inside the cloud | diagnostic-captured | [manifest](runs/234/manifest.json) |
| 235 | api-diagnostic | context-all · Active lesson: How lightning forms. The learner asks: why is thunder later. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/235/manifest.json) |
| 236 | api-diagnostic | context-all · In the How lightning forms simulation, why is thunder later | diagnostic-captured | [manifest](runs/236/manifest.json) |
| 237 | api-diagnostic | context-all · Active lesson: How rainbows form. The learner asks: show a double rainbow. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/237/manifest.json) |
| 238 | api-diagnostic | context-all · In the How rainbows form simulation, show a double rainbow | diagnostic-captured | [manifest](runs/238/manifest.json) |
| 239 | api-diagnostic | context-all · Active lesson: How rainbows form. The learner asks: make the sun higher. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/239/manifest.json) |
| 240 | api-diagnostic | context-all · In the How rainbows form simulation, make the sun higher | diagnostic-captured | [manifest](runs/240/manifest.json) |
| 241 | api-diagnostic | context-all · Active lesson: How weather forms. The learner asks: what happens over a mountain. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/241/manifest.json) |
| 242 | api-diagnostic | context-all · In the How weather forms simulation, what happens over a mountain | diagnostic-captured | [manifest](runs/242/manifest.json) |
| 243 | api-diagnostic | context-all · Active lesson: How weather forms. The learner asks: make the air drier. Interpret changes in the context of the active lesson unless the learner explicitly requests a different topic. | diagnostic-captured | [manifest](runs/243/manifest.json) |
| 244 | api-diagnostic | context-all · In the How weather forms simulation, make the air drier | diagnostic-captured | [manifest](runs/244/manifest.json) |
| 245 | api-diagnostic | context-all · In the Earthquakes: fault slip releases elastic energy and makes the ground shake. simulation, show sideways movement | diagnostic-captured | [manifest](runs/245/manifest.json) |
| 246 | api-diagnostic | context-all · Active lesson: How earthquakes form. Follow-up within this lesson: show sideways movement | diagnostic-captured | [manifest](runs/246/manifest.json) |
| 247 | api-diagnostic | context-all · In the Earthquakes: fault slip releases elastic energy and makes the ground shake. simulation, show it slower | diagnostic-captured | [manifest](runs/247/manifest.json) |
| 248 | api-diagnostic | context-all · Active lesson: How earthquakes form. Follow-up within this lesson: show it slower | diagnostic-captured | [manifest](runs/248/manifest.json) |
| 249 | api-diagnostic | context-all · In the Tsunamis: seabed movement displaces water and long waves travel toward a coast. simulation, what if the ocean is deeper | diagnostic-captured | [manifest](runs/249/manifest.json) |
| 250 | api-diagnostic | context-all · Active lesson: How tsunamis form. Follow-up within this lesson: what if the ocean is deeper | diagnostic-captured | [manifest](runs/250/manifest.json) |
| 251 | api-diagnostic | context-all · In the Tsunamis: seabed movement displaces water and long waves travel toward a coast. simulation, show the next wave | diagnostic-captured | [manifest](runs/251/manifest.json) |
| 252 | api-diagnostic | context-all · Active lesson: How tsunamis form. Follow-up within this lesson: show the next wave | diagnostic-captured | [manifest](runs/252/manifest.json) |
| 253 | api-diagnostic | context-all · In the Atmospheric layers and stratospheric ozone: altitude, layers of air and ultraviolet absorption. simulation, where is the ozone layer | diagnostic-captured | [manifest](runs/253/manifest.json) |
| 254 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. Follow-up within this lesson: where is the ozone layer | diagnostic-captured | [manifest](runs/254/manifest.json) |
| 255 | api-diagnostic | context-all · In the Atmospheric layers and stratospheric ozone: altitude, layers of air and ultraviolet absorption. simulation, what if there is less ozone | diagnostic-captured | [manifest](runs/255/manifest.json) |
| 256 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. Follow-up within this lesson: what if there is less ozone | diagnostic-captured | [manifest](runs/256/manifest.json) |
| 257 | api-diagnostic | context-all · In the Greenhouse effect: greenhouse gases absorb and emit infrared, warming Earth. simulation, add more greenhouse gas | diagnostic-captured | [manifest](runs/257/manifest.json) |
| 258 | api-diagnostic | context-all · Active lesson: The greenhouse effect. Follow-up within this lesson: add more greenhouse gas | diagnostic-captured | [manifest](runs/258/manifest.json) |
| 259 | api-diagnostic | context-all · In the Greenhouse effect: greenhouse gases absorb and emit infrared, warming Earth. simulation, keep the sunlight the same | diagnostic-captured | [manifest](runs/259/manifest.json) |
| 260 | api-diagnostic | context-all · Active lesson: The greenhouse effect. Follow-up within this lesson: keep the sunlight the same | diagnostic-captured | [manifest](runs/260/manifest.json) |
| 261 | api-diagnostic | context-all · In the Lightning formation: storm-cloud ice collisions separate charges before an electrical discharge. simulation, show lightning inside the cloud | diagnostic-captured | [manifest](runs/261/manifest.json) |
| 262 | api-diagnostic | context-all · Active lesson: How lightning forms. Follow-up within this lesson: show lightning inside the cloud | diagnostic-captured | [manifest](runs/262/manifest.json) |
| 263 | api-diagnostic | context-all · In the Lightning formation: storm-cloud ice collisions separate charges before an electrical discharge. simulation, why is thunder later | diagnostic-captured | [manifest](runs/263/manifest.json) |
| 264 | api-diagnostic | context-all · Active lesson: How lightning forms. Follow-up within this lesson: why is thunder later | diagnostic-captured | [manifest](runs/264/manifest.json) |
| 265 | api-diagnostic | context-all · In the Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. simulation, show a double rainbow | diagnostic-captured | [manifest](runs/265/manifest.json) |
| 266 | api-diagnostic | context-all · Active lesson: How rainbows form. Follow-up within this lesson: show a double rainbow | diagnostic-captured | [manifest](runs/266/manifest.json) |
| 267 | api-diagnostic | context-all · In the Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. simulation, make the sun higher | diagnostic-captured | [manifest](runs/267/manifest.json) |
| 268 | api-diagnostic | context-all · Active lesson: How rainbows form. Follow-up within this lesson: make the sun higher | diagnostic-captured | [manifest](runs/268/manifest.json) |
| 269 | api-diagnostic | context-all · In the Weather formation: unequal heating, moving air, cloud condensation and rain. simulation, what happens over a mountain | diagnostic-captured | [manifest](runs/269/manifest.json) |
| 270 | api-diagnostic | context-all · Active lesson: How weather forms. Follow-up within this lesson: what happens over a mountain | diagnostic-captured | [manifest](runs/270/manifest.json) |
| 271 | api-diagnostic | context-all · In the Weather formation: unequal heating, moving air, cloud condensation and rain. simulation, make the air drier | diagnostic-captured | [manifest](runs/271/manifest.json) |
| 272 | api-diagnostic | context-all · Active lesson: How weather forms. Follow-up within this lesson: make the air drier | diagnostic-captured | [manifest](runs/272/manifest.json) |
| 273 | live-followup-diagnostic | earthquake · show sideways movement | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"ea66a0d1-810d-424c-9bc0-61a679a49ce0","message":"Apertus returned invalid stage arguments: value: unknown field arguments","retryable":true} | [manifest](runs/273/manifest.json) |
| 274 | live-followup-diagnostic | earthquake · show it slower | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"cec7a928-7daa-454e-ab62-b97dd86bb0dc","message":"Apertus returned invalid stage arguments: value: unknown field command_arguments","retryable":true} | [manifest](runs/274/manifest.json) |
| 275 | live-followup-diagnostic | tsunami · what if the ocean is deeper | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"1dc7bb8b-8c3b-4be7-9c1d-e20728e0a4c9","message":"Apertus returned invalid stage arguments: value: unknown field command","retryable":true} | [manifest](runs/275/manifest.json) |
| 276 | live-followup-diagnostic | tsunami · show the next wave | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"395ef7f4-98f5-4ec1-bf21-767b3b6a8ee8","message":"Apertus returned invalid stage arguments: value: unknown field arguments","retryable":true} | [manifest](runs/276/manifest.json) |
| 277 | live-followup-diagnostic | atmosphere · where is the ozone layer | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"617fff6a-881a-4d3e-80e7-c2e4c024b58f","message":"Apertus returned invalid stage arguments: value: unknown field arguments","retryable":true} | [manifest](runs/277/manifest.json) |
| 278 | live-followup-diagnostic | atmosphere · what if there is less ozone | failed · page.waitForFunction: Target page, context or browser has been closed | [manifest](runs/278/manifest.json) |
| 279 | live-followup-diagnostic | earthquake · show sideways movement | passed | [manifest](runs/279/manifest.json) |
| 280 | live-followup-diagnostic | earthquake · show it slower | passed | [manifest](runs/280/manifest.json) |
| 281 | live-followup-diagnostic | tsunami · what if the ocean is deeper | passed | [manifest](runs/281/manifest.json) |
| 282 | live-followup-diagnostic | tsunami · show the next wave | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"985848f6-c4a3-4a93-b67c-1a23472010df","message":"Apertus returned invalid stage arguments: value: unknown field command","retryable":true} | [manifest](runs/282/manifest.json) |
| 283 | live-followup-diagnostic | atmosphere · where is the ozone layer | passed | [manifest](runs/283/manifest.json) |
| 284 | live-followup-diagnostic | atmosphere · what if there is less ozone | passed | [manifest](runs/284/manifest.json) |
| 285 | live-followup-diagnostic | greenhouse · add more greenhouse gas | passed | [manifest](runs/285/manifest.json) |
| 286 | live-followup-diagnostic | greenhouse · keep the sunlight the same | passed | [manifest](runs/286/manifest.json) |
| 287 | live-followup-diagnostic | lightning · show lightning inside the cloud | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"09443aeb-b5d6-4737-b73d-89d1157fd4b4","message":"Apertus returned invalid stage arguments: value: unknown field node","retryable":true} | [manifest](runs/287/manifest.json) |
| 288 | live-followup-diagnostic | lightning · why is thunder later | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"5ffecdbd-bf58-4dcb-a226-ce1a573aa0ff","message":"Apertus returned invalid stage arguments: value: unknown field node","retryable":true} | [manifest](runs/288/manifest.json) |
| 289 | live-followup-diagnostic | rainbow · show a double rainbow | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"3f0e8760-3406-42eb-b333-e5aa8265b4a3","message":"Apertus returned invalid stage arguments: value: unknown field node","retryable":true} | [manifest](runs/289/manifest.json) |
| 290 | live-followup-diagnostic | rainbow · make the sun higher | passed | [manifest](runs/290/manifest.json) |
| 291 | live-followup-diagnostic | weather · what happens over a mountain | failed · AssertionError [ERR_ASSERTION]: {"protocolVersion":1,"status":"failed","requestId":"52ef697a-89df-4d03-94ec-7dda6703d185","message":"Apertus returned invalid stage arguments: value: unknown field node","retryable":true} | [manifest](runs/291/manifest.json) |
| 292 | live-followup-diagnostic | weather · make the air drier | passed | [manifest](runs/292/manifest.json) |
| 293 | live-followup-diagnostic | earthquake · show sideways movement | passed | [manifest](runs/293/manifest.json) |
| 294 | live-followup-diagnostic | earthquake · show it slower | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/294/manifest.json) |
| 295 | live-followup-diagnostic | tsunami · what if the ocean is deeper | passed | [manifest](runs/295/manifest.json) |
| 296 | live-followup-diagnostic | tsunami · show the next wave | passed | [manifest](runs/296/manifest.json) |
| 297 | live-followup-diagnostic | atmosphere · where is the ozone layer | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/297/manifest.json) |
| 298 | live-followup-diagnostic | atmosphere · what if there is less ozone | passed | [manifest](runs/298/manifest.json) |
| 299 | live-followup-diagnostic | greenhouse · add more greenhouse gas | passed | [manifest](runs/299/manifest.json) |
| 300 | live-followup-diagnostic | greenhouse · keep the sunlight the same | passed | [manifest](runs/300/manifest.json) |
| 301 | live-followup-diagnostic | lightning · show lightning inside the cloud | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/301/manifest.json) |
| 302 | live-followup-diagnostic | lightning · why is thunder later | passed | [manifest](runs/302/manifest.json) |
| 303 | live-followup-diagnostic | rainbow · show a double rainbow | passed | [manifest](runs/303/manifest.json) |
| 304 | live-followup-diagnostic | rainbow · make the sun higher | passed | [manifest](runs/304/manifest.json) |
| 305 | live-followup-diagnostic | weather · what happens over a mountain | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/305/manifest.json) |
| 306 | live-followup-diagnostic | weather · make the air drier | passed | [manifest](runs/306/manifest.json) |
| 307 | live-followup-diagnostic | earthquake · show sideways movement | passed | [manifest](runs/307/manifest.json) |
| 308 | live-followup-diagnostic | earthquake · show it slower | passed | [manifest](runs/308/manifest.json) |
| 309 | live-followup-diagnostic | tsunami · what if the ocean is deeper | passed | [manifest](runs/309/manifest.json) |
| 310 | live-followup-diagnostic | tsunami · show the next wave | passed | [manifest](runs/310/manifest.json) |
| 311 | live-followup-diagnostic | atmosphere · where is the ozone layer | failed · AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | [manifest](runs/311/manifest.json) |
| 312 | live-followup-diagnostic | atmosphere · what if there is less ozone | passed | [manifest](runs/312/manifest.json) |
| 313 | live-followup-diagnostic | greenhouse · add more greenhouse gas | passed | [manifest](runs/313/manifest.json) |
| 314 | live-followup-diagnostic | greenhouse · keep the sunlight the same | passed | [manifest](runs/314/manifest.json) |
| 315 | live-followup-diagnostic | lightning · show lightning inside the cloud | passed | [manifest](runs/315/manifest.json) |
| 316 | live-followup-diagnostic | lightning · why is thunder later | passed | [manifest](runs/316/manifest.json) |
| 317 | live-followup-diagnostic | rainbow · show a double rainbow | passed | [manifest](runs/317/manifest.json) |
| 318 | live-followup-diagnostic | rainbow · make the sun higher | passed | [manifest](runs/318/manifest.json) |
| 319 | live-followup-diagnostic | weather · what happens over a mountain | passed | [manifest](runs/319/manifest.json) |
| 320 | live-followup-diagnostic | weather · make the air drier | passed | [manifest](runs/320/manifest.json) |
| 321 | live-followup-diagnostic | earthquake · show sideways movement | passed | [manifest](runs/321/manifest.json) |
| 322 | live-followup-diagnostic | earthquake · show it slower | passed | [manifest](runs/322/manifest.json) |
| 323 | live-followup-diagnostic | tsunami · what if the ocean is deeper | passed | [manifest](runs/323/manifest.json) |
| 324 | live-followup-diagnostic | tsunami · show the next wave | passed | [manifest](runs/324/manifest.json) |
| 325 | live-followup-diagnostic | atmosphere · where is the ozone layer | passed | [manifest](runs/325/manifest.json) |
| 326 | live-followup-diagnostic | atmosphere · what if there is less ozone | passed | [manifest](runs/326/manifest.json) |
| 327 | live-followup-diagnostic | greenhouse · add more greenhouse gas | passed | [manifest](runs/327/manifest.json) |
| 328 | live-followup-diagnostic | greenhouse · keep the sunlight the same | passed | [manifest](runs/328/manifest.json) |
| 329 | live-followup-diagnostic | lightning · show lightning inside the cloud | passed | [manifest](runs/329/manifest.json) |
| 330 | live-followup-diagnostic | lightning · why is thunder later | passed | [manifest](runs/330/manifest.json) |
| 331 | live-followup-diagnostic | rainbow · show a double rainbow | passed | [manifest](runs/331/manifest.json) |
| 332 | live-followup-diagnostic | rainbow · make the sun higher | passed | [manifest](runs/332/manifest.json) |
| 333 | live-followup-diagnostic | weather · what happens over a mountain | passed | [manifest](runs/333/manifest.json) |
| 334 | live-followup-diagnostic | weather · make the air drier | passed | [manifest](runs/334/manifest.json) |
| 335 | premade-browser | earthquake ·  | passed | [manifest](runs/335/manifest.json) |
| 336 | premade-browser | tsunami ·  | passed | [manifest](runs/336/manifest.json) |
| 337 | premade-browser | atmosphere ·  | passed | [manifest](runs/337/manifest.json) |
| 338 | premade-browser | greenhouse ·  | passed | [manifest](runs/338/manifest.json) |
| 339 | premade-browser | lightning ·  | passed | [manifest](runs/339/manifest.json) |
| 340 | premade-browser | rainbow ·  | passed | [manifest](runs/340/manifest.json) |
| 341 | premade-browser | weather ·  | passed | [manifest](runs/341/manifest.json) |
| 342 | motion-keyboard-recovery | earthquake ·  | passed | [manifest](runs/342/manifest.json) |
| 343 | motion-keyboard-recovery | tsunami ·  | passed | [manifest](runs/343/manifest.json) |
| 344 | motion-keyboard-recovery | atmosphere ·  | passed | [manifest](runs/344/manifest.json) |
| 345 | motion-keyboard-recovery | greenhouse ·  | passed | [manifest](runs/345/manifest.json) |
| 346 | motion-keyboard-recovery | lightning ·  | passed | [manifest](runs/346/manifest.json) |
| 347 | motion-keyboard-recovery | rainbow ·  | passed | [manifest](runs/347/manifest.json) |
| 348 | motion-keyboard-recovery | weather ·  | passed | [manifest](runs/348/manifest.json) |
| 349 | builder-persistence | earthquake ·  | passed | [manifest](runs/349/manifest.json) |
| 350 | builder-persistence | tsunami ·  | passed | [manifest](runs/350/manifest.json) |
| 351 | builder-persistence | atmosphere ·  | passed | [manifest](runs/351/manifest.json) |
| 352 | builder-persistence | greenhouse ·  | passed | [manifest](runs/352/manifest.json) |
| 353 | builder-persistence | lightning ·  | passed | [manifest](runs/353/manifest.json) |
| 354 | builder-persistence | rainbow ·  | passed | [manifest](runs/354/manifest.json) |
| 355 | builder-persistence | weather ·  | passed | [manifest](runs/355/manifest.json) |
| 356 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/356/manifest.json) |
| 357 | live-followup | earthquake · show sideways movement | passed | [manifest](runs/357/manifest.json) |
| 358 | live-followup | earthquake · show it slower | passed | [manifest](runs/358/manifest.json) |
| 359 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/359/manifest.json) |
| 360 | live-followup | earthquake · show sideways movement | passed | [manifest](runs/360/manifest.json) |
| 361 | live-followup | earthquake · show it slower | passed | [manifest](runs/361/manifest.json) |
| 362 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/362/manifest.json) |
| 363 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/363/manifest.json) |
| 364 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/364/manifest.json) |
| 365 | live-prompt | earthquake · why does the ground shake | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/365/manifest.json) |
| 366 | live-prompt | earthquake · why does the ground shake | failed · AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | [manifest](runs/366/manifest.json) |
| 367 | live-prompt | earthquake · how earth quakes form | passed | [manifest](runs/367/manifest.json) |
| 368 | live-prompt | earthquake · how earth quakes form | interrupted · page.waitForFunction: Target page, context or browser has been closed | [manifest](runs/368/manifest.json) |
| 369 | api-diagnostic | routing-calibration · how do earthquakes happen? | diagnostic-captured | [manifest](runs/369/manifest.json) |
| 370 | api-diagnostic | routing-calibration · why does the ground shake | diagnostic-captured | [manifest](runs/370/manifest.json) |
| 371 | api-diagnostic | routing-calibration · how earth quakes form | diagnostic-captured | [manifest](runs/371/manifest.json) |
| 372 | api-diagnostic | routing-calibration · how does a tsunami form? | diagnostic-captured | [manifest](runs/372/manifest.json) |
| 373 | api-diagnostic | routing-calibration · what causes tsunamis | diagnostic-captured | [manifest](runs/373/manifest.json) |
| 374 | api-diagnostic | routing-calibration · show me tsunami | diagnostic-captured | [manifest](runs/374/manifest.json) |
| 375 | api-diagnostic | routing-calibration · what are the layers of the atmosphere? | diagnostic-captured | [manifest](runs/375/manifest.json) |
| 376 | api-diagnostic | routing-calibration · show the atmosphere and ozone layer | diagnostic-captured | [manifest](runs/376/manifest.json) |
| 377 | api-diagnostic | routing-calibration · earth air layers | diagnostic-captured | [manifest](runs/377/manifest.json) |
| 378 | api-diagnostic | routing-calibration · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/378/manifest.json) |
| 379 | api-diagnostic | routing-calibration · why do greenhouse gases warm earth | diagnostic-captured | [manifest](runs/379/manifest.json) |
| 380 | api-diagnostic | routing-calibration · green house effect | diagnostic-captured | [manifest](runs/380/manifest.json) |
| 381 | api-diagnostic | routing-calibration · how does lightning form? | diagnostic-captured | [manifest](runs/381/manifest.json) |
| 382 | api-diagnostic | routing-calibration · where does lightning come from | diagnostic-captured | [manifest](runs/382/manifest.json) |
| 383 | api-diagnostic | routing-calibration · how is lighting made in a storm | diagnostic-captured | [manifest](runs/383/manifest.json) |
| 384 | api-diagnostic | routing-calibration · how do rainbows form? | diagnostic-captured | [manifest](runs/384/manifest.json) |
| 385 | api-diagnostic | routing-calibration · why do we see a rainbow | diagnostic-captured | [manifest](runs/385/manifest.json) |
| 386 | api-diagnostic | routing-calibration · show me rainbows | diagnostic-captured | [manifest](runs/386/manifest.json) |
| 387 | api-diagnostic | routing-calibration · how is weather formed? | diagnostic-captured | [manifest](runs/387/manifest.json) |
| 388 | api-diagnostic | routing-calibration · why do clouds and rain happen | diagnostic-captured | [manifest](runs/388/manifest.json) |
| 389 | api-diagnostic | routing-calibration · how weather works | diagnostic-captured | [manifest](runs/389/manifest.json) |
| 390 | api-diagnostic | routing-calibration · how do earthquakes happen? | diagnostic-captured | [manifest](runs/390/manifest.json) |
| 391 | api-diagnostic | routing-calibration · why does the ground shake | diagnostic-captured | [manifest](runs/391/manifest.json) |
| 392 | api-diagnostic | routing-calibration · how earth quakes form | diagnostic-captured | [manifest](runs/392/manifest.json) |
| 393 | api-diagnostic | routing-calibration · how does a tsunami form? | diagnostic-captured | [manifest](runs/393/manifest.json) |
| 394 | api-diagnostic | routing-calibration · what causes tsunamis | diagnostic-captured | [manifest](runs/394/manifest.json) |
| 395 | api-diagnostic | routing-calibration · show me tsunami | diagnostic-captured | [manifest](runs/395/manifest.json) |
| 396 | api-diagnostic | routing-calibration · what are the layers of the atmosphere? | diagnostic-captured | [manifest](runs/396/manifest.json) |
| 397 | api-diagnostic | routing-calibration · show the atmosphere and ozone layer | diagnostic-captured | [manifest](runs/397/manifest.json) |
| 398 | api-diagnostic | routing-calibration · earth air layers | diagnostic-captured | [manifest](runs/398/manifest.json) |
| 399 | api-diagnostic | routing-calibration · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/399/manifest.json) |
| 400 | api-diagnostic | routing-calibration · why do greenhouse gases warm earth | diagnostic-captured | [manifest](runs/400/manifest.json) |
| 401 | api-diagnostic | routing-calibration · green house effect | diagnostic-captured | [manifest](runs/401/manifest.json) |
| 402 | api-diagnostic | routing-calibration · how does lightning form? | diagnostic-captured | [manifest](runs/402/manifest.json) |
| 403 | api-diagnostic | routing-calibration · where does lightning come from | diagnostic-captured | [manifest](runs/403/manifest.json) |
| 404 | api-diagnostic | routing-calibration · how is lighting made in a storm | diagnostic-captured | [manifest](runs/404/manifest.json) |
| 405 | api-diagnostic | routing-calibration · how do rainbows form? | diagnostic-captured | [manifest](runs/405/manifest.json) |
| 406 | api-diagnostic | routing-calibration · why do we see a rainbow | diagnostic-captured | [manifest](runs/406/manifest.json) |
| 407 | api-diagnostic | routing-calibration · show me rainbows | diagnostic-captured | [manifest](runs/407/manifest.json) |
| 408 | api-diagnostic | routing-calibration · how is weather formed? | diagnostic-captured | [manifest](runs/408/manifest.json) |
| 409 | api-diagnostic | routing-calibration · why do clouds and rain happen | diagnostic-captured | [manifest](runs/409/manifest.json) |
| 410 | api-diagnostic | routing-calibration · how weather works | diagnostic-captured | [manifest](runs/410/manifest.json) |
| 411 | api-diagnostic | quake-label · why does the ground shake | diagnostic-captured | [manifest](runs/411/manifest.json) |
| 412 | api-diagnostic | quake-label · why does the ground shake | diagnostic-captured | [manifest](runs/412/manifest.json) |
| 413 | api-diagnostic | quake-label · why does the ground shake | diagnostic-captured | [manifest](runs/413/manifest.json) |
| 414 | api-diagnostic | quake-label · why does the ground shake | diagnostic-captured | [manifest](runs/414/manifest.json) |
| 415 | api-diagnostic | quake-label · why does the ground shake | diagnostic-captured | [manifest](runs/415/manifest.json) |
| 416 | api-diagnostic | routing-calibration · how do earthquakes happen? | diagnostic-captured | [manifest](runs/416/manifest.json) |
| 417 | api-diagnostic | routing-calibration · why does the ground shake | diagnostic-captured | [manifest](runs/417/manifest.json) |
| 418 | api-diagnostic | routing-calibration · how earth quakes form | diagnostic-captured | [manifest](runs/418/manifest.json) |
| 419 | api-diagnostic | routing-calibration · how does a tsunami form? | diagnostic-captured | [manifest](runs/419/manifest.json) |
| 420 | api-diagnostic | routing-calibration · what causes tsunamis | diagnostic-captured | [manifest](runs/420/manifest.json) |
| 421 | api-diagnostic | routing-calibration · show me tsunami | diagnostic-captured | [manifest](runs/421/manifest.json) |
| 422 | api-diagnostic | routing-calibration · what are the layers of the atmosphere? | diagnostic-captured | [manifest](runs/422/manifest.json) |
| 423 | api-diagnostic | routing-calibration · show the atmosphere and ozone layer | diagnostic-captured | [manifest](runs/423/manifest.json) |
| 424 | api-diagnostic | routing-calibration · earth air layers | diagnostic-captured | [manifest](runs/424/manifest.json) |
| 425 | api-diagnostic | routing-calibration · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/425/manifest.json) |
| 426 | api-diagnostic | routing-calibration · why do greenhouse gases warm earth | diagnostic-captured | [manifest](runs/426/manifest.json) |
| 427 | api-diagnostic | routing-calibration · green house effect | diagnostic-captured | [manifest](runs/427/manifest.json) |
| 428 | api-diagnostic | routing-calibration · how does lightning form? | diagnostic-captured | [manifest](runs/428/manifest.json) |
| 429 | api-diagnostic | routing-calibration · where does lightning come from | diagnostic-captured | [manifest](runs/429/manifest.json) |
| 430 | api-diagnostic | routing-calibration · how is lighting made in a storm | diagnostic-captured | [manifest](runs/430/manifest.json) |
| 431 | api-diagnostic | routing-calibration · how do rainbows form? | diagnostic-captured | [manifest](runs/431/manifest.json) |
| 432 | api-diagnostic | routing-calibration · why do we see a rainbow | diagnostic-captured | [manifest](runs/432/manifest.json) |
| 433 | api-diagnostic | routing-calibration · show me rainbows | diagnostic-captured | [manifest](runs/433/manifest.json) |
| 434 | api-diagnostic | routing-calibration · how is weather formed? | diagnostic-captured | [manifest](runs/434/manifest.json) |
| 435 | api-diagnostic | routing-calibration · why do clouds and rain happen | diagnostic-captured | [manifest](runs/435/manifest.json) |
| 436 | api-diagnostic | routing-calibration · how weather works | diagnostic-captured | [manifest](runs/436/manifest.json) |
| 437 | api-diagnostic | context-all · In the Ground shaking during earthquakes: tectonic stress and fault slip release seismic waves. simulation, show sideways movement | diagnostic-captured | [manifest](runs/437/manifest.json) |
| 438 | api-diagnostic | context-all · Active lesson: How earthquakes form. Follow-up within this lesson: show sideways movement | diagnostic-captured | [manifest](runs/438/manifest.json) |
| 439 | api-diagnostic | context-all · In the Ground shaking during earthquakes: tectonic stress and fault slip release seismic waves. simulation, show it slower | diagnostic-captured | [manifest](runs/439/manifest.json) |
| 440 | api-diagnostic | context-all · Active lesson: How earthquakes form. Follow-up within this lesson: show it slower | diagnostic-captured | [manifest](runs/440/manifest.json) |
| 441 | api-diagnostic | context-all · In the Tsunamis: seabed movement displaces water and long waves travel toward a coast. simulation, what if the ocean is deeper | diagnostic-captured | [manifest](runs/441/manifest.json) |
| 442 | api-diagnostic | context-all · Active lesson: How tsunamis form. Follow-up within this lesson: what if the ocean is deeper | diagnostic-captured | [manifest](runs/442/manifest.json) |
| 443 | api-diagnostic | context-all · In the Tsunamis: seabed movement displaces water and long waves travel toward a coast. simulation, show the next wave | diagnostic-captured | [manifest](runs/443/manifest.json) |
| 444 | api-diagnostic | context-all · Active lesson: How tsunamis form. Follow-up within this lesson: show the next wave | diagnostic-captured | [manifest](runs/444/manifest.json) |
| 445 | api-diagnostic | context-all · In the Atmospheric layers and stratospheric ozone: altitude, layers of air and ultraviolet absorption. simulation, where is the ozone layer | diagnostic-captured | [manifest](runs/445/manifest.json) |
| 446 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. Follow-up within this lesson: where is the ozone layer | diagnostic-captured | [manifest](runs/446/manifest.json) |
| 447 | api-diagnostic | context-all · In the Atmospheric layers and stratospheric ozone: altitude, layers of air and ultraviolet absorption. simulation, what if there is less ozone | diagnostic-captured | [manifest](runs/447/manifest.json) |
| 448 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. Follow-up within this lesson: what if there is less ozone | diagnostic-captured | [manifest](runs/448/manifest.json) |
| 449 | api-diagnostic | context-all · In the Greenhouse effect: greenhouse gases absorb and emit infrared, warming Earth. simulation, add more greenhouse gas | diagnostic-captured | [manifest](runs/449/manifest.json) |
| 450 | api-diagnostic | context-all · Active lesson: The greenhouse effect. Follow-up within this lesson: add more greenhouse gas | diagnostic-captured | [manifest](runs/450/manifest.json) |
| 451 | api-diagnostic | context-all · In the Greenhouse effect: greenhouse gases absorb and emit infrared, warming Earth. simulation, keep the sunlight the same | diagnostic-captured | [manifest](runs/451/manifest.json) |
| 452 | api-diagnostic | context-all · Active lesson: The greenhouse effect. Follow-up within this lesson: keep the sunlight the same | diagnostic-captured | [manifest](runs/452/manifest.json) |
| 453 | api-diagnostic | context-all · In the Lightning formation: storm-cloud ice collisions separate charges before an electrical discharge. simulation, show lightning inside the cloud | diagnostic-captured | [manifest](runs/453/manifest.json) |
| 454 | api-diagnostic | context-all · Active lesson: How lightning forms. Follow-up within this lesson: show lightning inside the cloud | diagnostic-captured | [manifest](runs/454/manifest.json) |
| 455 | api-diagnostic | context-all · In the Lightning formation: storm-cloud ice collisions separate charges before an electrical discharge. simulation, why is thunder later | diagnostic-captured | [manifest](runs/455/manifest.json) |
| 456 | api-diagnostic | context-all · Active lesson: How lightning forms. Follow-up within this lesson: why is thunder later | diagnostic-captured | [manifest](runs/456/manifest.json) |
| 457 | api-diagnostic | context-all · In the Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. simulation, show a double rainbow | diagnostic-captured | [manifest](runs/457/manifest.json) |
| 458 | api-diagnostic | context-all · Active lesson: How rainbows form. Follow-up within this lesson: show a double rainbow | diagnostic-captured | [manifest](runs/458/manifest.json) |
| 459 | api-diagnostic | context-all · In the Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. simulation, make the sun higher | diagnostic-captured | [manifest](runs/459/manifest.json) |
| 460 | api-diagnostic | context-all · Active lesson: How rainbows form. Follow-up within this lesson: make the sun higher | diagnostic-captured | [manifest](runs/460/manifest.json) |
| 461 | api-diagnostic | context-all · In the Weather formation: unequal heating, moving air, cloud condensation and rain. simulation, what happens over a mountain | diagnostic-captured | [manifest](runs/461/manifest.json) |
| 462 | api-diagnostic | context-all · Active lesson: How weather forms. Follow-up within this lesson: what happens over a mountain | diagnostic-captured | [manifest](runs/462/manifest.json) |
| 463 | api-diagnostic | context-all · In the Weather formation: unequal heating, moving air, cloud condensation and rain. simulation, make the air drier | diagnostic-captured | [manifest](runs/463/manifest.json) |
| 464 | api-diagnostic | context-all · Active lesson: How weather forms. Follow-up within this lesson: make the air drier | diagnostic-captured | [manifest](runs/464/manifest.json) |
| 465 | live-boundary | atmosphere · ozone | passed | [manifest](runs/465/manifest.json) |
| 466 | live-boundary | rainbow · rainbow | passed | [manifest](runs/466/manifest.json) |
| 467 | live-boundary | InsideEarth · earth layers | passed | [manifest](runs/467/manifest.json) |
| 468 | live-boundary | earthquake-formation · predict tomorrow's earthquake | failed · AssertionError [ERR_ASSERTION]: This boundary request requires a scoped lesson, clarification or refusal, not an unrelated runtime command | [manifest](runs/468/manifest.json) |
| 469 | live-boundary | tsunami-formation · will a tsunami hit my town today | passed | [manifest](runs/469/manifest.json) |
| 470 | live-boundary | greenhouse · greenhouse effect because of the ozone hole | passed | [manifest](runs/470/manifest.json) |
| 471 | live-boundary | lightning · lightning is two clouds rubbing together right? | passed | [manifest](runs/471/manifest.json) |
| 472 | live-boundary | scope · simulate all weather on earth accurately | passed | [manifest](runs/472/manifest.json) |
| 473 | live-boundary | greenhouse-effect · I meant ozone, not warming | passed | [manifest](runs/473/manifest.json) |
| 474 | live-boundary | atmosphere · ozone | passed | [manifest](runs/474/manifest.json) |
| 475 | live-boundary | rainbow · rainbow | passed | [manifest](runs/475/manifest.json) |
| 476 | live-boundary | InsideEarth · earth layers | passed | [manifest](runs/476/manifest.json) |
| 477 | live-boundary | earthquake-formation · predict tomorrow's earthquake | passed | [manifest](runs/477/manifest.json) |
| 478 | live-boundary | tsunami-formation · will a tsunami hit my town today | passed | [manifest](runs/478/manifest.json) |
| 479 | live-boundary | greenhouse · greenhouse effect because of the ozone hole | passed | [manifest](runs/479/manifest.json) |
| 480 | live-boundary | lightning · lightning is two clouds rubbing together right? | passed | [manifest](runs/480/manifest.json) |
| 481 | live-boundary | scope · simulate all weather on earth accurately | passed | [manifest](runs/481/manifest.json) |
| 482 | live-boundary | greenhouse-effect · I meant ozone, not warming | passed | [manifest](runs/482/manifest.json) |
| 483 | api-diagnostic | routing-calibration · how do earthquakes happen? | diagnostic-captured | [manifest](runs/483/manifest.json) |
| 484 | api-diagnostic | routing-calibration · why does the ground shake | diagnostic-captured | [manifest](runs/484/manifest.json) |
| 485 | api-diagnostic | routing-calibration · how earth quakes form | diagnostic-captured | [manifest](runs/485/manifest.json) |
| 486 | api-diagnostic | routing-calibration · how does a tsunami form? | diagnostic-captured | [manifest](runs/486/manifest.json) |
| 487 | api-diagnostic | routing-calibration · what causes tsunamis | diagnostic-captured | [manifest](runs/487/manifest.json) |
| 488 | api-diagnostic | routing-calibration · show me tsunami | diagnostic-captured | [manifest](runs/488/manifest.json) |
| 489 | api-diagnostic | routing-calibration · what are the layers of the atmosphere? | diagnostic-captured | [manifest](runs/489/manifest.json) |
| 490 | api-diagnostic | routing-calibration · show the atmosphere and ozone layer | diagnostic-captured | [manifest](runs/490/manifest.json) |
| 491 | api-diagnostic | routing-calibration · earth air layers | diagnostic-captured | [manifest](runs/491/manifest.json) |
| 492 | api-diagnostic | routing-calibration · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/492/manifest.json) |
| 493 | api-diagnostic | routing-calibration · why do greenhouse gases warm earth | diagnostic-captured | [manifest](runs/493/manifest.json) |
| 494 | api-diagnostic | routing-calibration · green house effect | diagnostic-captured | [manifest](runs/494/manifest.json) |
| 495 | api-diagnostic | routing-calibration · how does lightning form? | diagnostic-captured | [manifest](runs/495/manifest.json) |
| 496 | api-diagnostic | routing-calibration · where does lightning come from | diagnostic-captured | [manifest](runs/496/manifest.json) |
| 497 | api-diagnostic | routing-calibration · how is lighting made in a storm | diagnostic-captured | [manifest](runs/497/manifest.json) |
| 498 | api-diagnostic | routing-calibration · how do rainbows form? | diagnostic-captured | [manifest](runs/498/manifest.json) |
| 499 | api-diagnostic | routing-calibration · why do we see a rainbow | diagnostic-captured | [manifest](runs/499/manifest.json) |
| 500 | api-diagnostic | routing-calibration · show me rainbows | diagnostic-captured | [manifest](runs/500/manifest.json) |
| 501 | api-diagnostic | routing-calibration · how is weather formed? | diagnostic-captured | [manifest](runs/501/manifest.json) |
| 502 | api-diagnostic | routing-calibration · why do clouds and rain happen | diagnostic-captured | [manifest](runs/502/manifest.json) |
| 503 | api-diagnostic | routing-calibration · how weather works | diagnostic-captured | [manifest](runs/503/manifest.json) |
| 504 | api-diagnostic | weather-label · why do clouds and rain happen | diagnostic-captured | [manifest](runs/504/manifest.json) |
| 505 | api-diagnostic | weather-label · why do clouds and rain happen | diagnostic-captured | [manifest](runs/505/manifest.json) |
| 506 | api-diagnostic | weather-label · why do clouds and rain happen | diagnostic-captured | [manifest](runs/506/manifest.json) |
| 507 | api-diagnostic | weather-label · why do clouds and rain happen | diagnostic-captured | [manifest](runs/507/manifest.json) |
| 508 | api-diagnostic | weather-label · why do clouds and rain happen | diagnostic-captured | [manifest](runs/508/manifest.json) |
| 509 | api-diagnostic | weather-label · why do clouds and rain happen | diagnostic-captured | [manifest](runs/509/manifest.json) |
| 510 | api-diagnostic | routing-calibration · how do earthquakes happen? | diagnostic-captured | [manifest](runs/510/manifest.json) |
| 511 | api-diagnostic | routing-calibration · why does the ground shake | diagnostic-captured | [manifest](runs/511/manifest.json) |
| 512 | api-diagnostic | routing-calibration · how earth quakes form | diagnostic-captured | [manifest](runs/512/manifest.json) |
| 513 | api-diagnostic | routing-calibration · how does a tsunami form? | diagnostic-captured | [manifest](runs/513/manifest.json) |
| 514 | api-diagnostic | routing-calibration · what causes tsunamis | diagnostic-captured | [manifest](runs/514/manifest.json) |
| 515 | api-diagnostic | routing-calibration · show me tsunami | diagnostic-captured | [manifest](runs/515/manifest.json) |
| 516 | api-diagnostic | routing-calibration · what are the layers of the atmosphere? | diagnostic-captured | [manifest](runs/516/manifest.json) |
| 517 | api-diagnostic | routing-calibration · show the atmosphere and ozone layer | diagnostic-captured | [manifest](runs/517/manifest.json) |
| 518 | api-diagnostic | routing-calibration · earth air layers | diagnostic-captured | [manifest](runs/518/manifest.json) |
| 519 | api-diagnostic | routing-calibration · how does the greenhouse effect work? | diagnostic-captured | [manifest](runs/519/manifest.json) |
| 520 | api-diagnostic | routing-calibration · why do greenhouse gases warm earth | diagnostic-captured | [manifest](runs/520/manifest.json) |
| 521 | api-diagnostic | routing-calibration · green house effect | diagnostic-captured | [manifest](runs/521/manifest.json) |
| 522 | api-diagnostic | routing-calibration · how does lightning form? | diagnostic-captured | [manifest](runs/522/manifest.json) |
| 523 | api-diagnostic | routing-calibration · where does lightning come from | diagnostic-captured | [manifest](runs/523/manifest.json) |
| 524 | api-diagnostic | routing-calibration · how is lighting made in a storm | diagnostic-captured | [manifest](runs/524/manifest.json) |
| 525 | api-diagnostic | routing-calibration · how do rainbows form? | diagnostic-captured | [manifest](runs/525/manifest.json) |
| 526 | api-diagnostic | routing-calibration · why do we see a rainbow | diagnostic-captured | [manifest](runs/526/manifest.json) |
| 527 | api-diagnostic | routing-calibration · show me rainbows | diagnostic-captured | [manifest](runs/527/manifest.json) |
| 528 | api-diagnostic | routing-calibration · how is weather formed? | diagnostic-captured | [manifest](runs/528/manifest.json) |
| 529 | api-diagnostic | routing-calibration · why do clouds and rain happen | diagnostic-captured | [manifest](runs/529/manifest.json) |
| 530 | api-diagnostic | routing-calibration · how weather works | diagnostic-captured | [manifest](runs/530/manifest.json) |
| 531 | api-diagnostic | context-all · In the Ground shaking during earthquakes: tectonic stress and fault slip release seismic waves. simulation, show sideways movement | diagnostic-captured | [manifest](runs/531/manifest.json) |
| 532 | api-diagnostic | context-all · Active lesson: How earthquakes form. Follow-up within this lesson: show sideways movement | diagnostic-captured | [manifest](runs/532/manifest.json) |
| 533 | api-diagnostic | context-all · In the Ground shaking during earthquakes: tectonic stress and fault slip release seismic waves. simulation, show it slower | diagnostic-captured | [manifest](runs/533/manifest.json) |
| 534 | api-diagnostic | context-all · Active lesson: How earthquakes form. Follow-up within this lesson: show it slower | diagnostic-captured | [manifest](runs/534/manifest.json) |
| 535 | api-diagnostic | context-all · In the Tsunamis: seabed movement displaces water and long waves travel toward a coast. simulation, what if the ocean is deeper | diagnostic-captured | [manifest](runs/535/manifest.json) |
| 536 | api-diagnostic | context-all · Active lesson: How tsunamis form. Follow-up within this lesson: what if the ocean is deeper | diagnostic-captured | [manifest](runs/536/manifest.json) |
| 537 | api-diagnostic | context-all · In the Tsunamis: seabed movement displaces water and long waves travel toward a coast. simulation, show the next wave | diagnostic-captured | [manifest](runs/537/manifest.json) |
| 538 | api-diagnostic | context-all · Active lesson: How tsunamis form. Follow-up within this lesson: show the next wave | diagnostic-captured | [manifest](runs/538/manifest.json) |
| 539 | api-diagnostic | context-all · In the Atmospheric layers and stratospheric ozone: altitude, layers of air and ultraviolet absorption. simulation, where is the ozone layer | diagnostic-captured | [manifest](runs/539/manifest.json) |
| 540 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. Follow-up within this lesson: where is the ozone layer | diagnostic-captured | [manifest](runs/540/manifest.json) |
| 541 | api-diagnostic | context-all · In the Atmospheric layers and stratospheric ozone: altitude, layers of air and ultraviolet absorption. simulation, what if there is less ozone | diagnostic-captured | [manifest](runs/541/manifest.json) |
| 542 | api-diagnostic | context-all · Active lesson: Atmosphere layers and ozone. Follow-up within this lesson: what if there is less ozone | diagnostic-captured | [manifest](runs/542/manifest.json) |
| 543 | api-diagnostic | context-all · In the Greenhouse effect: greenhouse gases absorb and emit infrared, warming Earth. simulation, add more greenhouse gas | diagnostic-captured | [manifest](runs/543/manifest.json) |
| 544 | api-diagnostic | context-all · Active lesson: The greenhouse effect. Follow-up within this lesson: add more greenhouse gas | diagnostic-captured | [manifest](runs/544/manifest.json) |
| 545 | api-diagnostic | context-all · In the Greenhouse effect: greenhouse gases absorb and emit infrared, warming Earth. simulation, keep the sunlight the same | diagnostic-captured | [manifest](runs/545/manifest.json) |
| 546 | api-diagnostic | context-all · Active lesson: The greenhouse effect. Follow-up within this lesson: keep the sunlight the same | diagnostic-captured | [manifest](runs/546/manifest.json) |
| 547 | api-diagnostic | context-all · In the Lightning formation: storm-cloud ice collisions separate charges before an electrical discharge. simulation, show lightning inside the cloud | diagnostic-captured | [manifest](runs/547/manifest.json) |
| 548 | api-diagnostic | context-all · Active lesson: How lightning forms. Follow-up within this lesson: show lightning inside the cloud | diagnostic-captured | [manifest](runs/548/manifest.json) |
| 549 | api-diagnostic | context-all · In the Lightning formation: storm-cloud ice collisions separate charges before an electrical discharge. simulation, why is thunder later | diagnostic-captured | [manifest](runs/549/manifest.json) |
| 550 | api-diagnostic | context-all · Active lesson: How lightning forms. Follow-up within this lesson: why is thunder later | diagnostic-captured | [manifest](runs/550/manifest.json) |
| 551 | api-diagnostic | context-all · In the Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. simulation, show a double rainbow | diagnostic-captured | [manifest](runs/551/manifest.json) |
| 552 | api-diagnostic | context-all · Active lesson: How rainbows form. Follow-up within this lesson: show a double rainbow | diagnostic-captured | [manifest](runs/552/manifest.json) |
| 553 | api-diagnostic | context-all · In the Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer. simulation, make the sun higher | diagnostic-captured | [manifest](runs/553/manifest.json) |
| 554 | api-diagnostic | context-all · Active lesson: How rainbows form. Follow-up within this lesson: make the sun higher | diagnostic-captured | [manifest](runs/554/manifest.json) |
| 555 | api-diagnostic | context-all · In the Clouds and rain in weather: rising moist air cools and condenses. simulation, what happens over a mountain | diagnostic-captured | [manifest](runs/555/manifest.json) |
| 556 | api-diagnostic | context-all · Active lesson: How weather forms. Follow-up within this lesson: what happens over a mountain | diagnostic-captured | [manifest](runs/556/manifest.json) |
| 557 | api-diagnostic | context-all · In the Clouds and rain in weather: rising moist air cools and condenses. simulation, make the air drier | diagnostic-captured | [manifest](runs/557/manifest.json) |
| 558 | api-diagnostic | context-all · Active lesson: How weather forms. Follow-up within this lesson: make the air drier | diagnostic-captured | [manifest](runs/558/manifest.json) |
| 559 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/559/manifest.json) |
| 560 | live-followup | earthquake · show sideways movement | failed · AssertionError [ERR_ASSERTION]: Missing actual Apertus authoring | [manifest](runs/560/manifest.json) |
| 561 | live-followup | earthquake · show it slower | failed · AssertionError [ERR_ASSERTION]: Missing actual Apertus authoring | [manifest](runs/561/manifest.json) |
| 562 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/562/manifest.json) |
| 563 | live-followup | earthquake · show sideways movement | failed · AssertionError [ERR_ASSERTION]: Missing actual Apertus authoring | [manifest](runs/563/manifest.json) |
| 564 | live-followup | earthquake · show it slower | interrupted · page.waitForFunction: Target page, context or browser has been closed | [manifest](runs/564/manifest.json) |
| 565 | api-diagnostic | followup-mode · show sideways movement | passed-diagnostic | [manifest](runs/565/manifest.json) |
| 566 | api-diagnostic | followup-mode · show it slower | passed-diagnostic | [manifest](runs/566/manifest.json) |
| 567 | api-diagnostic | followup-mode · what if the ocean is deeper | passed-diagnostic | [manifest](runs/567/manifest.json) |
| 568 | api-diagnostic | followup-mode · show the next wave | failed-diagnostic · Error: Apertus returned invalid stage arguments: Unexpected trailing "]" after the complete JSON object. Stop immediately after the root }; do not append extra brackets. | [manifest](runs/568/manifest.json) |
| 569 | api-diagnostic | followup-mode · where is the ozone layer | passed-diagnostic | [manifest](runs/569/manifest.json) |
| 570 | api-diagnostic | followup-mode · what if there is less ozone | passed-diagnostic | [manifest](runs/570/manifest.json) |
| 571 | api-diagnostic | followup-mode · add more greenhouse gas | passed-diagnostic | [manifest](runs/571/manifest.json) |
| 572 | api-diagnostic | followup-mode · keep the sunlight the same | passed-diagnostic | [manifest](runs/572/manifest.json) |
| 573 | api-diagnostic | followup-mode · show lightning inside the cloud | passed-diagnostic | [manifest](runs/573/manifest.json) |
| 574 | api-diagnostic | followup-mode · why is thunder later | passed-diagnostic | [manifest](runs/574/manifest.json) |
| 575 | api-diagnostic | followup-mode · show a double rainbow | passed-diagnostic | [manifest](runs/575/manifest.json) |
| 576 | api-diagnostic | followup-mode · make the sun higher | passed-diagnostic | [manifest](runs/576/manifest.json) |
| 577 | api-diagnostic | followup-mode · what happens over a mountain | passed-diagnostic | [manifest](runs/577/manifest.json) |
| 578 | api-diagnostic | followup-mode · make the air drier | passed-diagnostic | [manifest](runs/578/manifest.json) |
| 579 | api-diagnostic | followup-mode · predict tomorrow's earthquake | passed-diagnostic | [manifest](runs/579/manifest.json) |
| 580 | api-diagnostic | followup-mode · will a tsunami hit my town today | passed-diagnostic | [manifest](runs/580/manifest.json) |
| 581 | api-diagnostic | followup-mode · predict the weather in my town tomorrow | passed-diagnostic | [manifest](runs/581/manifest.json) |
| 582 | api-diagnostic | followup-mode · show sideways movement | invalid-diagnostic | [manifest](runs/582/manifest.json) |
| 583 | api-diagnostic | followup-mode · show it slower | invalid-diagnostic | [manifest](runs/583/manifest.json) |
| 584 | api-diagnostic | followup-mode · what if the ocean is deeper | invalid-diagnostic | [manifest](runs/584/manifest.json) |
| 585 | api-diagnostic | followup-mode · show the next wave | invalid-diagnostic | [manifest](runs/585/manifest.json) |
| 586 | api-diagnostic | followup-mode · where is the ozone layer | invalid-diagnostic | [manifest](runs/586/manifest.json) |
| 587 | api-diagnostic | followup-mode · what if there is less ozone | invalid-diagnostic | [manifest](runs/587/manifest.json) |
| 588 | api-diagnostic | followup-mode · add more greenhouse gas | invalid-diagnostic | [manifest](runs/588/manifest.json) |
| 589 | api-diagnostic | followup-mode · keep the sunlight the same | invalid-diagnostic | [manifest](runs/589/manifest.json) |
| 590 | api-diagnostic | followup-mode · show lightning inside the cloud | invalid-diagnostic | [manifest](runs/590/manifest.json) |
| 591 | api-diagnostic | followup-mode · why is thunder later | invalid-diagnostic | [manifest](runs/591/manifest.json) |
| 592 | api-diagnostic | followup-mode · show a double rainbow | invalid-diagnostic | [manifest](runs/592/manifest.json) |
| 593 | api-diagnostic | followup-mode · make the sun higher | invalid-diagnostic | [manifest](runs/593/manifest.json) |
| 594 | api-diagnostic | followup-mode · what happens over a mountain | invalid-diagnostic | [manifest](runs/594/manifest.json) |
| 595 | api-diagnostic | followup-mode · make the air drier | invalid-diagnostic | [manifest](runs/595/manifest.json) |
| 596 | api-diagnostic | followup-mode · predict tomorrow's earthquake | invalid-diagnostic | [manifest](runs/596/manifest.json) |
| 597 | api-diagnostic | followup-mode · will a tsunami hit my town today | invalid-diagnostic | [manifest](runs/597/manifest.json) |
| 598 | api-diagnostic | followup-mode · predict the weather in my town tomorrow | invalid-diagnostic | [manifest](runs/598/manifest.json) |
| 599 | api-diagnostic | followup-mode · show sideways movement | invalid-diagnostic | [manifest](runs/599/manifest.json) |
| 600 | api-diagnostic | followup-mode · show it slower | invalid-diagnostic | [manifest](runs/600/manifest.json) |
| 601 | api-diagnostic | followup-mode · what if the ocean is deeper | invalid-diagnostic | [manifest](runs/601/manifest.json) |
| 602 | api-diagnostic | followup-mode · show the next wave | invalid-diagnostic | [manifest](runs/602/manifest.json) |
| 603 | api-diagnostic | followup-mode · where is the ozone layer | invalid-diagnostic | [manifest](runs/603/manifest.json) |
| 604 | api-diagnostic | followup-mode · what if there is less ozone | invalid-diagnostic | [manifest](runs/604/manifest.json) |
| 605 | api-diagnostic | followup-mode · add more greenhouse gas | invalid-diagnostic | [manifest](runs/605/manifest.json) |
| 606 | api-diagnostic | followup-mode · keep the sunlight the same | invalid-diagnostic | [manifest](runs/606/manifest.json) |
| 607 | api-diagnostic | followup-mode · show lightning inside the cloud | invalid-diagnostic | [manifest](runs/607/manifest.json) |
| 608 | api-diagnostic | followup-mode · why is thunder later | invalid-diagnostic | [manifest](runs/608/manifest.json) |
| 609 | api-diagnostic | followup-mode · show a double rainbow | invalid-diagnostic | [manifest](runs/609/manifest.json) |
| 610 | api-diagnostic | followup-mode · make the sun higher | invalid-diagnostic | [manifest](runs/610/manifest.json) |
| 611 | api-diagnostic | followup-mode · what happens over a mountain | invalid-diagnostic | [manifest](runs/611/manifest.json) |
| 612 | api-diagnostic | followup-mode · make the air drier | invalid-diagnostic | [manifest](runs/612/manifest.json) |
| 613 | api-diagnostic | followup-mode · predict tomorrow's earthquake | invalid-diagnostic | [manifest](runs/613/manifest.json) |
| 614 | api-diagnostic | followup-mode · will a tsunami hit my town today | invalid-diagnostic | [manifest](runs/614/manifest.json) |
| 615 | api-diagnostic | followup-mode · predict the weather in my town tomorrow | invalid-diagnostic | [manifest](runs/615/manifest.json) |
| 616 | api-diagnostic | followup-mode · show sideways movement | passed-diagnostic | [manifest](runs/616/manifest.json) |
| 617 | api-diagnostic | followup-mode · show it slower | passed-diagnostic | [manifest](runs/617/manifest.json) |
| 618 | api-diagnostic | followup-mode · what if the ocean is deeper | passed-diagnostic | [manifest](runs/618/manifest.json) |
| 619 | api-diagnostic | followup-mode · show the next wave | passed-diagnostic | [manifest](runs/619/manifest.json) |
| 620 | api-diagnostic | followup-mode · where is the ozone layer | passed-diagnostic | [manifest](runs/620/manifest.json) |
| 621 | api-diagnostic | followup-mode · what if there is less ozone | failed-diagnostic · Error: Apertus timed out. Please try again. | [manifest](runs/621/manifest.json) |
| 622 | api-diagnostic | followup-mode · add more greenhouse gas | passed-diagnostic | [manifest](runs/622/manifest.json) |
| 623 | api-diagnostic | followup-mode · keep the sunlight the same | passed-diagnostic | [manifest](runs/623/manifest.json) |
| 624 | api-diagnostic | followup-mode · show lightning inside the cloud | passed-diagnostic | [manifest](runs/624/manifest.json) |
| 625 | api-diagnostic | followup-mode · why is thunder later | passed-diagnostic | [manifest](runs/625/manifest.json) |
| 626 | api-diagnostic | followup-mode · show a double rainbow | passed-diagnostic | [manifest](runs/626/manifest.json) |
| 627 | api-diagnostic | followup-mode · make the sun higher | passed-diagnostic | [manifest](runs/627/manifest.json) |
| 628 | api-diagnostic | followup-mode · what happens over a mountain | passed-diagnostic | [manifest](runs/628/manifest.json) |
| 629 | api-diagnostic | followup-mode · make the air drier | passed-diagnostic | [manifest](runs/629/manifest.json) |
| 630 | api-diagnostic | followup-mode · predict tomorrow's earthquake | passed-diagnostic | [manifest](runs/630/manifest.json) |
| 631 | api-diagnostic | followup-mode · will a tsunami hit my town today | failed-diagnostic | [manifest](runs/631/manifest.json) |
| 632 | api-diagnostic | followup-mode · predict the weather in my town tomorrow | passed-diagnostic | [manifest](runs/632/manifest.json) |
| 633 | api-diagnostic | followup-mode · show sideways movement | passed-diagnostic | [manifest](runs/633/manifest.json) |
| 634 | api-diagnostic | followup-mode · show it slower | passed-diagnostic | [manifest](runs/634/manifest.json) |
| 635 | api-diagnostic | followup-mode · what if the ocean is deeper | failed-diagnostic · Error: Apertus timed out. Please try again. | [manifest](runs/635/manifest.json) |
| 636 | api-diagnostic | followup-mode · show the next wave | passed-diagnostic | [manifest](runs/636/manifest.json) |
| 637 | api-diagnostic | followup-mode · where is the ozone layer | passed-diagnostic | [manifest](runs/637/manifest.json) |
| 638 | api-diagnostic | followup-mode · what if there is less ozone | passed-diagnostic | [manifest](runs/638/manifest.json) |
| 639 | api-diagnostic | followup-mode · add more greenhouse gas | passed-diagnostic | [manifest](runs/639/manifest.json) |
| 640 | api-diagnostic | followup-mode · keep the sunlight the same | passed-diagnostic | [manifest](runs/640/manifest.json) |
| 641 | api-diagnostic | followup-mode · show lightning inside the cloud | passed-diagnostic | [manifest](runs/641/manifest.json) |
| 642 | api-diagnostic | followup-mode · why is thunder later | passed-diagnostic | [manifest](runs/642/manifest.json) |
| 643 | api-diagnostic | followup-mode · show a double rainbow | passed-diagnostic | [manifest](runs/643/manifest.json) |
| 644 | api-diagnostic | followup-mode · make the sun higher | passed-diagnostic | [manifest](runs/644/manifest.json) |
| 645 | api-diagnostic | followup-mode · what happens over a mountain | passed-diagnostic | [manifest](runs/645/manifest.json) |
| 646 | api-diagnostic | followup-mode · make the air drier | passed-diagnostic | [manifest](runs/646/manifest.json) |
| 647 | api-diagnostic | followup-mode · predict tomorrow's earthquake | passed-diagnostic | [manifest](runs/647/manifest.json) |
| 648 | api-diagnostic | followup-mode · will a tsunami hit my town today | passed-diagnostic | [manifest](runs/648/manifest.json) |
| 649 | api-diagnostic | followup-mode · predict the weather in my town tomorrow | passed-diagnostic | [manifest](runs/649/manifest.json) |
| 650 | live-followup-diagnostic | earthquake · show sideways movement | passed | [manifest](runs/650/manifest.json) |
| 651 | live-followup-diagnostic | earthquake · show it slower | passed | [manifest](runs/651/manifest.json) |
| 652 | live-followup-diagnostic | tsunami · what if the ocean is deeper | passed | [manifest](runs/652/manifest.json) |
| 653 | live-followup-diagnostic | tsunami · show the next wave | passed | [manifest](runs/653/manifest.json) |
| 654 | live-followup-diagnostic | atmosphere · where is the ozone layer | passed | [manifest](runs/654/manifest.json) |
| 655 | live-followup-diagnostic | atmosphere · what if there is less ozone | interrupted | [manifest](runs/655/manifest.json) |
| 656 | live-prompt | earthquake · how do earthquakes happen? | passed | [manifest](runs/656/manifest.json) |
| 657 | live-prompt | tsunami · how does a tsunami form? | passed | [manifest](runs/657/manifest.json) |
| 658 | live-prompt | atmosphere · what are the layers of the atmosphere? | passed-with-repair | [manifest](runs/658/manifest.json) |
| 659 | live-prompt | greenhouse · how does the greenhouse effect work? | passed | [manifest](runs/659/manifest.json) |
| 660 | live-prompt | lightning · how does lightning form? | passed | [manifest](runs/660/manifest.json) |
| 661 | live-prompt | rainbow · how do rainbows form? | passed | [manifest](runs/661/manifest.json) |
| 662 | live-prompt | weather · how is weather formed? | passed | [manifest](runs/662/manifest.json) |
| 663 | builder-persistence | earthquake ·  | passed | [manifest](runs/663/manifest.json) |
| 664 | builder-persistence | tsunami ·  | passed | [manifest](runs/664/manifest.json) |
| 665 | builder-persistence | atmosphere ·  | passed | [manifest](runs/665/manifest.json) |
| 666 | builder-persistence | greenhouse ·  | passed | [manifest](runs/666/manifest.json) |
| 667 | builder-persistence | lightning ·  | passed | [manifest](runs/667/manifest.json) |
| 668 | builder-persistence | rainbow ·  | passed | [manifest](runs/668/manifest.json) |
| 669 | builder-persistence | weather ·  | passed | [manifest](runs/669/manifest.json) |
