const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const root = "src/simulations/components/systems/collective/";
const f = load(root + "fishing.ts"),
  v = load(root + "voting.ts"),
  n = load(root + "selection.ts"),
  c = load(root + "crowd.ts");
const { collectiveModels, command } = load(
  "src/simulations/domains/collective/index.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
let lake = f.initializeFishing(f.fishingDefaults);
for (let i = 0; i < 365; i++) {
  lake = f.fishingDay(lake);
  assert.equal(lake.stock, 2000);
  assert.deepEqual(lake.catches, [4, 4, 4, 4, 4]);
}
for (const arrangement of [1, 2]) {
  let s = f.initializeFishing({ ...f.fishingDefaults, arrangement });
  while (s.stock && s.day < 365) {
    const previous = s;
    s = f.fishingDay(s);
    const e = s.history.at(-1);
    assert.equal(e.births, Math.floor(previous.stock / 100));
    assert.equal(
      e.closing,
      e.opening + e.births - e.catches.reduce((a, b) => a + b, 0),
    );
    assert.ok(e.closing < e.opening);
    assert.ok(
      e.catches.every(
        (x, i) => Number.isInteger(x) && x >= 0 && x <= e.requests[i],
      ),
    );
  }
  assert.equal(s.stock, 0);
  assert.equal(f.fishingDay(s).stock, 0);
}
assert.deepEqual(f.allocateFish(3, [4, 4, 4, 4, 4], 0), [1, 1, 1, 0, 0]);
assert.deepEqual(f.allocateFish(3, [4, 4, 4, 4, 4], 1), [0, 1, 1, 1, 0]);
for (const visibility of [0, 1]) {
  let s = f.initializeFishing({
    ...f.fishingDefaults,
    arrangement: 1,
    policy: 1,
    visibility,
  });
  s = f.fishingDay(f.fishingDay(s));
  assert.deepEqual(
    s.history[1].requests,
    visibility ? [8, 8, 8, 8, 8] : [8, 4, 4, 4, 4],
  );
}
let responsive = f.initializeFishing({
  ...f.fishingDefaults,
  initialStock: 500,
  policy: 2,
});
for (let i = 0; i < 40; i++) responsive = f.fishingDay(responsive);
assert.equal(responsive.stock, 500);
let quota = f.initializeFishing({
  ...f.fishingDefaults,
  arrangement: 2,
  quota: true,
});
assert.equal(f.fishingDay(quota).stock, 2000);
const electorate = v.initializeVoting(v.votingDefaults),
  before = structuredClone(electorate.voters);
assert.equal(v.votingRound(electorate).rounds[0].winner, 0);
let irv = { ...electorate, rule: 1 };
irv = v.votingRound(irv);
assert.equal(irv.rounds[0].eliminated, 2);
irv = v.votingRound(irv);
assert.equal(irv.rounds[1].winner, 1);
assert.equal(irv.rounds[1].transfers.length, 25);
assert.deepEqual(irv.rounds[1].totals, [40, 60, 0]);
assert.deepEqual(irv.voters, before);
assert.deepEqual(
  v.votingRound({ ...electorate, rule: 2 }).rounds[0].totals,
  [40, 100, 60],
);
const partial = [
  { id: 0, ranking: [0], approvals: [0] },
  { id: 1, ranking: [1], approvals: [1] },
  { id: 2, ranking: [2], approvals: [] },
];
let rounds = [];
for (let i = 0; i < 3; i++) {
  let r = v.countRound(partial, 1, rounds, [0, 1, 2]);
  rounds.push(r);
  if (r.winner >= 0) break;
}
assert.equal(rounds.at(-1).exhausted, 2);
assert.equal(rounds.at(-1).winner, 2);
assert.equal(v.countRound([], 1, [], [0, 1, 2]).winner, -1);
assert.equal(v.countRound(partial, 0, [], [2, 1, 0]).winner, 2);
assert.throws(
  () =>
    v.countRound([{ id: 0, ranking: [0, 0], approvals: [] }], 1, [], [0, 1, 2]),
  /ballot/,
);
for (let seed = 1; seed <= 25; seed++) {
  let s = n.initializeSelection({
    ...n.selectionDefaults,
    seed,
    uniform: true,
    mutationRate: 0,
  });
  for (let i = 0; i < 10; i++) {
    s = n.selectionGeneration(s);
    assert.ok(s.organisms.length <= s.cap);
    assert.ok(s.organisms.every((o) => o.trait === 0.5));
    const e = s.events.at(-1);
    if (e) {
      assert.equal(e.proposals.length, e.survivors.length * 2);
      for (const o of e.children) {
        assert.ok(e.survivors.some((p) => p.id === o.parent));
        assert.ok(!e.parents.some((p) => p.id === o.id));
      }
    }
  }
}
// Predeclared independent binomial oracle: 20 matched and 20 mismatched parents,
// p=.8/.32; average across 400 seeds must fall within four standard errors.
const cohortSums = [0, 0];
for (let seed = 1001; seed <= 1400; seed++) {
  let s = n.initializeSelection({
    ...n.selectionDefaults,
    initialCount: 40,
    seed,
    habitat: 0.1,
    mutationRate: 0,
  });
  s.organisms = s.organisms.map((o, i) => ({
    ...o,
    trait: i < 20 ? 0.1 : 0.9,
  }));
  s = n.selectionGeneration(s);
  for (const o of s.events[0].survivors) cohortSums[o.trait === 0.1 ? 0 : 1]++;
}
const cohortMeans = cohortSums.map((x) => x / 400);
for (const [i, p] of [
  [0, 0.8],
  [1, 0.32],
])
  assert.ok(
    Math.abs(cohortMeans[i] - 20 * p) < 4 * Math.sqrt((20 * p * (1 - p)) / 400),
  );
for (const candidateCount of [2, 3, 4, 5]) {
  const s = v.initializeVoting({ ...v.votingDefaults, candidateCount });
  assert.equal(s.tieOrder.length, candidateCount);
  assert.equal(v.votingRound(s).rounds[0].totals.length, candidateCount);
}
const custom = v.initializeVoting({
  ...v.votingDefaults,
  candidateCount: 5,
  ballots: [
    { ranking: [4], approvals: [3, 4] },
    { ranking: [], approvals: [] },
  ],
});
assert.equal(custom.voters.length, 2);
assert.equal(v.votingRound(custom).rounds[0].winner, 4);
assert.throws(
  () =>
    v.initializeVoting({
      ...v.votingDefaults,
      candidateCount: 2,
      ballots: [{ ranking: [4], approvals: [] }],
    }),
  /ballot/,
);
const mean = (s) =>
  s.organisms.reduce((a, o) => a + o.trait, 0) /
  Math.max(1, s.organisms.length);
const sums = [0, 0, 0];
let alive = [0, 0, 0];
for (let seed = 31; seed <= 130; seed++)
  for (let k = 0; k < 3; k++) {
    let s = n.initializeSelection({
      ...n.selectionDefaults,
      seed,
      habitat: k === 1 ? 0.9 : 0.1,
      selection: k !== 2,
    });
    for (let i = 0; i < 12; i++) s = n.selectionGeneration(s);
    if (s.organisms.length) {
      sums[k] += mean(s);
      alive[k]++;
    }
  }
const means = sums.map((x, i) => x / alive[i]);
assert.ok(means[0] < 0.3 && means[1] > 0.7);
assert.ok(Math.abs(means[2] - 0.5) < 0.12);
let empty = n.initializeSelection({ ...n.selectionDefaults, initialCount: 1 });
empty = { ...empty, organisms: [] };
assert.equal(n.selectionGeneration(empty).generation, 0);
const crowdRows = [];
for (const placement of [0, 1, 2])
  for (let seed = 31; seed <= 60; seed++) {
    const cfg = { ...c.crowdDefaults, placement, seed };
    let s = c.initializeCrowd(cfg);
    assert.deepEqual(s.lanes[0].people, s.lanes[1].people);
    for (let t = 0; t < 2000 && s.lanes.some((l) => l.people.length); t++) {
      const prev = s;
      s = c.advanceCrowd(s);
      for (let i = 0; i < 2; i++) {
        const l = s.lanes[i];
        assert.equal(l.people.length + l.exited, cfg.count);
        assert.equal(
          new Set(l.people.map((p) => p.y * 30 + p.x)).size,
          l.people.length,
        );
        for (const p of l.people) {
          assert.ok(!c.blockedCell(p.x, p.y, cfg, i === 1));
          const old = prev.lanes[i].people.find((o) => o.id === p.id);
          assert.ok(Math.abs(p.x - old.x) + Math.abs(p.y - old.y) <= 1);
        }
      }
    }
    assert.ok(s.lanes.every((l) => l.finished > 0));
    crowdRows.push({
      placement,
      seed,
      baseline: s.lanes[0].finished,
      obstacle: s.lanes[1].finished,
      delta: s.lanes[1].finished - s.lanes[0].finished,
    });
  }
let replay = c.initializeCrowd(c.crowdDefaults),
  duplicate = c.initializeCrowd(c.crowdDefaults);
for (let i = 0; i < 80; i++) {
  replay = c.advanceCrowd(replay);
  duplicate = c.advanceCrowd(duplicate);
}
assert.deepEqual(replay, duplicate);
// Reflow valid learner bounds with their rows; preserve deliberate exclusions.
const { reflowLearnerArea } = load(
  "src/simulations/runtime/authoring/responsiveLayout.ts",
);
const sourceBounds = premadeRecipe("crowd-exit").document.presentation;
const narrowItems = sourceBounds.items.map((item, i) => ({
  ...item,
  rect: { x: 0, y: i * 600, width: 358, height: 500 },
}));
const narrowArea = reflowLearnerArea(sourceBounds, narrowItems);
for (const { rect: r } of narrowItems)
  assert.ok(
    r.x >= narrowArea.x &&
      r.y >= narrowArea.y &&
      r.x + r.width <= narrowArea.x + narrowArea.width &&
      r.y + r.height <= narrowArea.y + narrowArea.height,
  );
const restricted = {
  ...sourceBounds,
  learnerArea: { x: 0, y: 0, width: 10, height: 10 },
};
assert.deepEqual(
  reflowLearnerArea(restricted, narrowItems),
  restricted.learnerArea,
);
const slugs = [
  "shared-fishing-lake",
  "crowd-exit",
  "voting-systems",
  "natural-selection",
];
for (let i = 0; i < 4; i++) {
  const a = loadRecipe(premadeRecipe(slugs[i])).runtime,
    b = loadRecipe(premadeRecipe(slugs[i])).runtime;
  const initial = structuredClone(b.getSnapshot());
  assert.ok(
    a.dispatch([
      {
        node: "model",
        command: command(
          ["fishing", "crowd", "voting", "selection"][i],
          "COMPLETE",
        ),
        arguments: {},
      },
    ]).accepted,
  );
  assert.deepEqual(b.getSnapshot(), initial);
  const stable = structuredClone(a.getSnapshot());
  assert.equal(
    a.dispatch([
      {
        node: "model",
        command: command(
          ["fishing", "crowd", "voting", "selection"][i],
          "SET_seed",
        ),
        arguments: { value: -1 },
      },
    ]).accepted,
    false,
  );
  assert.deepEqual(a.getSnapshot(), stable);
  assert.ok(
    a.dispatch([
      {
        node: "model",
        command: command(
          ["fishing", "crowd", "voting", "selection"][i],
          "RESTART",
        ),
        arguments: {},
      },
    ]).accepted,
  );
  assert.deepEqual(a.getSnapshot().state.model, b.getSnapshot().state.model);
}
// Authored AI and builder edits retain ongoing populations for live conditions.
for (const [i, key, value] of [
  [0, "arrangement", 1],
  [2, "rule", 1],
  [3, "habitat", 0.9],
]) {
  const kind = ["fishing", "crowd", "voting", "selection"][i],
    recipe = premadeRecipe(slugs[i]),
    runtime = loadRecipe(recipe).runtime;
  runtime.dispatch([
    { node: "model", command: command(kind, "COMPLETE"), arguments: {} },
  ]);
  const old = structuredClone(runtime.getSnapshot().state.model);
  recipe.document.nodes.find((n) => n.id === "model").configuration[key] =
    value;
  runtime.updateDocument(recipe.document);
  const next = runtime.getSnapshot().state.model;
  assert.equal(next[key], value);
  if (kind === "fishing") {
    assert.equal(next.stock, old.stock);
    assert.equal(next.day, old.day);
  }
  if (kind === "voting") {
    assert.deepEqual(next.voters, old.voters);
    assert.deepEqual(next.rounds, []);
  }
  if (kind === "selection") {
    assert.deepEqual(next.organisms, old.organisms);
    assert.equal(next.generation, old.generation);
  }
}
const summaries = [0, 1, 2].map((placement) => {
  const rows = crowdRows.filter((r) => r.placement === placement);
  const deltas = rows.map((r) => r.delta).sort((a, b) => a - b);
  return {
    placement,
    meanDelta: deltas.reduce((a, b) => a + b, 0) / deltas.length,
    medianDelta: (deltas[14] + deltas[15]) / 2,
    helped: rows.filter((r) => r.delta < 0).length,
    total: rows.length,
  };
});
if (process.env.COLLECTIVE_EVIDENCE_DIR) {
  const fs = require("node:fs"),
    path = require("node:path");
  fs.mkdirSync(process.env.COLLECTIVE_EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(process.env.COLLECTIVE_EVIDENCE_DIR, "model-validation.json"),
    JSON.stringify(
      {
        selection: {
          means,
          alive,
          seeds: [31, 130],
          firstGeneration: {
            cohortMeans,
            expected: [16, 6.4],
            seeds: [1001, 1400],
            tolerance: "four binomial standard errors",
          },
        },
        crowd: { seeds: [31, 60], rows: crowdRows, summaries },
      },
      null,
      2,
    ),
  );
}
console.log(
  "Fishing accounting, privacy, quota and depletion; voting ties/exhaustion/transfers; selection inheritance, stochastic trend and extinction; crowd geometry/conservation/replay; shared-runtime isolation and atomic rejection passed.",
);
console.log(JSON.stringify({ selection: means, crowd: summaries }));

// Stateless views must never offer impossible configure schemas to inference.
const { buildTurnTools } = load("src/lib/planner/turnSchema.ts");
const { buildInitialCard } = load("src/lib/planner/bucket.ts");
const editDocument = premadeRecipe("natural-selection").document;
for (const tool of buildTurnTools(
  editDocument,
  editDocument.nodes.map((n) => buildInitialCard(n.definition)),
)) {
  if (tool.tool === "configure")
    assert.ok(
      Object.keys(tool.schema.properties.changes.properties).length > 0,
    );
}
assert.match(
  f.fishingCaption(f.initializeFishing({ ...f.fishingDefaults, policy: 2 })),
  /voluntarily/,
);
assert.match(
  f.fishingCaption(f.initializeFishing({ ...f.fishingDefaults, quota: true })),
  /enforced/,
);
