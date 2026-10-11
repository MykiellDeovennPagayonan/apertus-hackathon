const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../../test-loader.cjs");
const m = load("src/simulations/domains/math-analysis/models.ts");
const { mathAnalysisAppearances } = load(
  "src/simulations/components/views/math-analysis/MathAnalysisScenes.tsx",
);
const close = (a, b, t = 1e-9) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const measure = (model, config = {}) =>
  model.measure(
    model.initialize({ ...structuredClone(model.defaults), ...config }),
  );
const apply = (model, op, v) =>
  model.apply(
    model.initialize(model.defaults),
    m.command(model.ref.split("/").at(-1), op),
    v,
  );
assert.deepEqual(measure(m.housePrices), { mean: 130, median: 130 });
const expensive = apply(m.housePrices, "price", 1000);
assert.deepEqual(m.housePrices.measure(expensive), { mean: 250, median: 130 });
assert.equal(expensive.houses[6].id, "house-7");
assert.deepEqual(measure(m.housePrices, { houses: [] }), {
  mean: null,
  median: null,
});
assert.equal(
  measure(m.housePrices, {
    houses: [
      { id: "a", value: 3 },
      { id: "b", value: 7 },
    ],
  }).median,
  5,
);
assert.throws(
  () =>
    measure(m.housePrices, {
      houses: [
        { id: "a", value: 3 },
        { id: "a", value: 7 },
      ],
    }),
  /identities/,
);
let spread = measure(m.scoreSpread);
close(spread.firstDeviation, Math.sqrt(2));
close(spread.secondDeviation, Math.sqrt(200));
spread = measure(m.scoreSpread, { formula: "sample", first: [7], second: [] });
assert.equal(spread.firstDeviation, null);
assert.equal(spread.secondVariance, null);
close(m.scoreSpread.measure(apply(m.scoreSpread, "spread", 5)).secondMean, 70);
const surveys = measure(m.surveySampling);
close(surveys.standardError, Math.sqrt(0.24 / 20));
close(
  measure(m.surveySampling, { sampleSize: 500 }).standardError,
  Math.sqrt(0.24 / 500),
);
assert.deepEqual(measure(m.surveySampling), surveys);
assert.notDeepEqual(
  m.surveySampling.measure(apply(m.surveySampling, "draw")).estimates,
  surveys.estimates,
);
assert.ok(
  measure(m.surveySampling, { probability: 0 }).estimates.every((x) => x === 0),
);
assert.ok(
  measure(m.surveySampling, { probability: 1 }).estimates.every((x) => x === 1),
);
assert.equal(
  measure(m.surveySampling, { selection: "biased" }).population,
  0.6,
);
assert.equal(
  measure(m.surveySampling, { selection: "biased" }).selectedProbability,
  0.8,
);
let fit = measure(m.studyRegression);
assert.equal(fit.slope, 10);
assert.equal(fit.intercept, 40);
assert.equal(fit.squaredError, 0);
fit = measure(m.studyRegression, {
  students: [
    { id: "a", x: 2, y: 10 },
    { id: "b", x: 2, y: 20 },
  ],
});
assert.equal(fit.slope, null);
assert.equal(fit.prediction, null);
assert.ok(
  m.studyRegression.measure(apply(m.studyRegression, "score", 10)).slope < 0,
);
assert.equal(
  measure(m.studyRegression, { predictionHours: 6 }).extrapolation,
  true,
);
assert.equal(measure(m.feasibleChoices).cost, 100);
assert.equal(measure(m.feasibleChoices, { pens: 5 }).affordable, false);
assert.equal(
  measure(m.feasibleChoices, { budget: 0, minimumNotebooks: 1 }).choices,
  0,
);
assert.equal(
  measure(m.feasibleChoices, {
    budget: 0.3,
    notebookPrice: 0.1,
    penPrice: 0.1,
    notebooks: 2,
    pens: 1,
  }).affordable,
  true,
);
assert.throws(
  () => measure(m.feasibleChoices, { budget: 1.001 }),
  /hundredths/,
);
close(measure(m.conditionalBags).posterior, 0.8);
assert.equal(
  measure(m.conditionalBags, { blueA: 0, blueB: 0 }).posterior,
  null,
);
assert.throws(
  () => measure(m.conditionalBags, { blueA: 0, redA: 0 }),
  /marble/,
);
close(measure(m.conditionalBags, { prior: 0.2 }).posterior, 0.5);
assert.deepEqual(measure(m.teamsAndPodiums), {
  ordered: "60",
  teams: "10",
  ordersPerTeam: "6",
});
assert.equal(measure(m.teamsAndPodiums, { people: 0, selected: 0 }).teams, "1");
assert.throws(() => measure(m.teamsAndPodiums, { selected: 6 }), /more people/);
assert.equal(
  measure(m.teamsAndPodiums, { people: 20, selected: 20 }).ordered,
  "2432902008176640000",
);
close(measure(m.loanPayments).payment, 106.61854641401005);
close(measure(m.loanPayments, { annualPercent: 0 }).payment, 100);
const extra = measure(m.loanPayments, { extra: 50 });
assert.ok(extra.payoffMonth < 12);
assert.ok(extra.totalInterest < measure(m.loanPayments).totalInterest);
for (const [p, r, n, e] of [
  [1200, 12, 12, 0],
  [1200, 0, 12, 50],
  [0.01, 30, 600, 0],
  [1000000, 0.000001, 600, 10],
  [1200, 12, 12, 100000],
]) {
  const loan = m.amortize(p, r, n, e);
  assert.equal(loan.schedule.at(-1).balance, 0);
  close(
    loan.schedule.reduce((sum, v) => sum + v.principal, 0),
    p,
    1e-6,
  );
  assert.ok(
    loan.schedule.every(
      (v) => v.balance >= 0 && v.interest >= 0 && v.principal >= 0,
    ),
  );
  assert.ok(loan.schedule.at(-1).paid <= loan.payment + e + 1e-6);
}
assert.equal(measure(m.instantaneousVelocity).velocity, 6);
assert.equal(measure(m.instantaneousVelocity).averageVelocity, 7);
close(
  measure(m.instantaneousVelocity, { increment: 0.1 }).averageVelocity,
  6.1,
);
close(
  measure(m.instantaneousVelocity, { increment: -0.1 }).averageVelocity,
  5.9,
);
assert.throws(() => measure(m.instantaneousVelocity, { increment: 0 }), /h/);
assert.throws(
  () => measure(m.instantaneousVelocity, { time: 10, increment: 1 }),
  /times/,
);
assert.equal(
  measure(m.instantaneousVelocity, { preset: "reversing", time: 3 }).velocity,
  -4,
);
const water = measure(m.accumulatedWater);
assert.equal(water.exact, 10.5);
assert.equal(water.estimate, 9);
assert.equal(measure(m.accumulatedWater, { rule: "right" }).estimate, 12);
assert.equal(measure(m.accumulatedWater, { rule: "midpoint" }).estimate, 10.5);
assert.ok(
  Math.abs(measure(m.accumulatedWater, { partitions: 100 }).error) <
    Math.abs(water.error),
);
close(
  measure(m.accumulatedWater, {
    knots: [
      { time: 0, rate: 0 },
      { time: 1, rate: 4 },
      { time: 3, rate: 0 },
    ],
  }).exact,
  6,
);
assert.throws(() => measure(m.accumulatedWater, { capacity: 10 }), /capacity/);
assert.throws(
  () =>
    measure(m.accumulatedWater, {
      knots: [
        { time: 0, rate: 1 },
        { time: 0, rate: 2 },
      ],
    }),
  /increasing/,
);
for (const model of m.mathAnalysis.models) {
  const start = model.initialize(model.defaults),
    before = structuredClone(start);
  assert.throws(() => model.apply(start, "unsupported", 5));
  assert.deepEqual(start, before);
  assert.deepEqual(
    model.initialize(JSON.parse(JSON.stringify(model.configuration(start)))),
    start,
  );
  for (const [field, schema] of Object.entries(model.parameters.properties))
    if (schema.type === "number" || schema.type === "integer")
      for (const bad of [
        NaN,
        Infinity,
        "3",
        schema.minimum - 1,
        schema.maximum + 1,
      ])
        assert.throws(() =>
          model.apply(
            start,
            m.command(model.ref.split("/").at(-1), `set_${field}`),
            bad,
          ),
        );
  const outputs = model.measure(start),
    scene = mathAnalysisAppearances[model.presentation];
  const markup = renderToStaticMarkup(
    React.createElement(scene, {
      instance: {
        id: "model",
        label: model.name,
        provider: model.ref,
        parameters: start,
        state: start,
        outputs,
      },
    }),
  );
  assert.match(markup, /role="img"/);
  assert.doesNotMatch(markup, /NaN|Infinity/);
}
console.log(
  "A2 ten-model reference, boundary, transition, serialization and scene checks passed",
);

assert.throws(() => apply(m.scoreSpread, "spread", -1));
assert.throws(() => apply(m.scoreSpread, "spread", "5"));
assert.throws(() => apply(m.housePrices, "price", "1000"));
const unanimous = m.surveySampling.initialize({
  ...m.surveySampling.defaults,
  probability: 1,
});
const unanimousMarkup = renderToStaticMarkup(
  React.createElement(mathAnalysisAppearances[m.surveySampling.presentation], {
    instance: {
      id: "survey",
      label: "Unanimous survey",
      provider: m.surveySampling.ref,
      parameters: unanimous,
      state: unanimous,
      outputs: m.surveySampling.measure(unanimous),
    },
  }),
);
const positions = [
  ...unanimousMarkup.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g),
].map((match) => `${match[1]}/${match[2]}`);
assert.equal(
  new Set(positions).size,
  20,
  "Each identical survey estimate must remain visible as a distinct stacked dot",
);
assert.equal(measure(m.feasibleChoices, { pens: 5 }).exclusion, "Over budget");
assert.equal(
  measure(m.feasibleChoices, { notebookStock: 1 }).exclusion,
  "More notebooks than stock allows",
);
assert.equal(
  measure(m.feasibleChoices, { minimumPens: 5 }).exclusion,
  "Below the minimum pen count",
);

assert.throws(() => apply(m.housePrices, "price", 1000.01));
assert.throws(() =>
  measure(m.housePrices, { houses: [{ id: "too-high", value: 1000.01 }] }),
);
