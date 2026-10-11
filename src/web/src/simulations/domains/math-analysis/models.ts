import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import {
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";

export const list = (
  items: ParameterSchema,
  minItems = 0,
  maxItems = 20,
): ParameterSchema => ({ type: "array", items, minItems, maxItems });
const identifier: ParameterSchema = { type: "string", maxLength: 40 };
const observation = object({
  id: identifier,
  value: num(0, 1000, "currency units"),
});
const scores = list(num(0, 100, "points"));
const point = object({
  id: identifier,
  x: num(0, 100, "hours"),
  y: num(0, 100, "points"),
});
export const command = (kind: string, field: string) =>
  `MA_${kind.toUpperCase()}_${field.toUpperCase()}`;
export function centre(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b),
    n = ordered.length;
  return {
    mean: n ? values.reduce((a, b) => a + b, 0) / n : null,
    median: n
      ? (ordered[Math.floor((n - 1) / 2)] + ordered[Math.floor(n / 2)]) / 2
      : null,
  };
}
export function spread(values: number[], sample: boolean) {
  const mean = centre(values).mean;
  const variance =
    mean === null || (sample && values.length < 2)
      ? null
      : values.reduce((sum, x) => sum + (x - mean) ** 2, 0) /
        (values.length - (sample ? 1 : 0));
  return {
    mean,
    variance,
    deviation: variance === null ? null : Math.sqrt(variance),
  };
}
export function regression(points: { x: number; y: number }[]) {
  const mx = centre(points.map((p) => p.x)).mean,
    my = centre(points.map((p) => p.y)).mean;
  if (mx === null || my === null)
    return { slope: null, intercept: null, residuals: [], squaredError: null };
  const denominator = points.reduce((sum, p) => sum + (p.x - mx) ** 2, 0);
  if (!denominator)
    return { slope: null, intercept: null, residuals: [], squaredError: null };
  const slope =
      points.reduce((sum, p) => sum + (p.x - mx) * (p.y - my), 0) / denominator,
    intercept = my - slope * mx;
  const residuals = points.map((p) => p.y - (intercept + slope * p.x));
  return {
    slope,
    intercept,
    residuals,
    squaredError: residuals.reduce((sum, v) => sum + v * v, 0),
  };
}
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function counts(n: number, k: number) {
  let ordered = BigInt(1),
    factorial = BigInt(1);
  for (let i = 0; i < k; i++) {
    ordered *= BigInt(n - i);
    factorial *= BigInt(i + 1);
  }
  return {
    ordered: ordered.toString(),
    teams: (ordered / factorial).toString(),
    ordersPerTeam: factorial.toString(),
  };
}
export interface Payment {
  month: number;
  interest: number;
  principal: number;
  paid: number;
  balance: number;
}
export function amortize(
  principal: number,
  annualPercent: number,
  months: number,
  extra: number,
) {
  const rate = annualPercent / 1200;
  const payment = rate
    ? (principal * rate) / -Math.expm1(-months * Math.log1p(rate))
    : principal / months;
  const schedule: Payment[] = [];
  let balance = principal,
    totalInterest = 0;
  for (let month = 1; month <= months && balance > 0; month++) {
    const interest = balance * rate;
    const paid =
      month === months
        ? balance + interest
        : Math.min(balance + interest, payment + extra);
    const capital = paid - interest;
    balance = Math.max(0, balance - capital);
    totalInterest += interest;
    schedule.push({ month, interest, principal: capital, paid, balance });
  }
  return { payment, schedule, totalInterest, payoffMonth: schedule.length };
}
export interface Knot {
  time: number;
  rate: number;
}
export function flowAt(knots: Knot[], time: number) {
  const i = Math.max(
    0,
    Math.min(
      knots.length - 2,
      knots.findIndex((p, j) => j > 0 && p.time >= time) - 1,
    ),
  );
  const left = knots[i],
    right = knots[i + 1];
  return (
    left.rate +
    ((right.rate - left.rate) * (time - left.time)) / (right.time - left.time)
  );
}
export function integral(knots: Knot[], start: number, end: number) {
  const cuts = [
    start,
    ...knots.filter((p) => p.time > start && p.time < end).map((p) => p.time),
    end,
  ];
  return cuts
    .slice(1)
    .reduce(
      (sum, b, i) =>
        sum + ((b - cuts[i]) * (flowAt(knots, cuts[i]) + flowAt(knots, b))) / 2,
      0,
    );
}
interface Spec {
  kind: string;
  tags?: string[];
  name: string;
  description: string;
  assumptions: string[];
  fields: Record<string, ParameterSchema>;
  defaults: Record<string, unknown>;
  outputs: Record<string, string>;
  measure: DomainModel["measure"];
  validate?: (s: Record<string, unknown>) => void;
  operations?: Record<
    string,
    {
      schema: ParameterSchema;
      description: string;
      apply: (
        s: Record<string, unknown>,
        value: unknown,
      ) => Record<string, unknown>;
    }
  >;
}
function model(spec: Spec): DomainModel {
  const parameters = object(spec.fields, Object.keys(spec.fields));
  const completeState = object(spec.fields);
  const accepted = (s: Record<string, unknown>) => {
    validateValue(completeState, s);
    spec.validate?.(s);
    return structuredClone(s);
  };
  const setters = Object.fromEntries(
    Object.entries(spec.fields).map(([field, schema]) => [
      command(spec.kind, `set_${field}`),
      {
        arguments: object({ value: schema }),
        description: `Change ${field} while preserving other settings`,
        timing: "live" as const,
        target: "instance" as const,
      },
    ]),
  );
  const operations = spec.operations ?? {};
  return {
    ref: `prefabs/math-analysis/${spec.kind}`,
    version: 1,
    name: spec.name,
    description: spec.description,
    assumptions: spec.assumptions,
    tags: [spec.kind, "mathematics", ...(spec.tags ?? [])],
    parameters,
    defaults: spec.defaults,
    outputs: Object.fromEntries(
      Object.entries(spec.outputs).map(([key, unit]) => [
        key,
        { unit, description: key },
      ]),
    ),
    actions: {
      ...setters,
      ...Object.fromEntries(
        Object.entries(operations).map(([key, op]) => [
          command(spec.kind, key),
          {
            arguments: op.schema,
            description: op.description,
            timing: "live" as const,
            target: "instance" as const,
          },
        ]),
      ),
    },
    dependencies: {
      resources: [],
      traits: [],
      behaviors: [],
      systems: [],
      visuals: [],
      views: ["AssemblyScene"],
      controls: ["AssemblyControls"],
      prefabs: [`math-analysis/${spec.kind}`],
      compositions: [],
    },
    presentation: `math-analysis-${spec.kind}`,
    requiredObservations: [],
    maximumInstances: 2,
    initialize: (parametersValue) =>
      accepted({ ...structuredClone(spec.defaults), ...parametersValue }),
    configuration: accepted,
    apply: (s, action, value) => {
      const field = Object.keys(spec.fields).find(
        (key) => command(spec.kind, `set_${key}`) === action,
      );
      if (field) return accepted({ ...s, [field]: value });
      const operation = Object.keys(operations).find(
        (key) => command(spec.kind, key) === action,
      );
      if (!operation) throw new Error("Unsupported math operation");
      validateValue(
        operations[operation].schema,
        value === undefined ? {} : { value },
      );
      return accepted(operations[operation].apply(s, value));
    },
    measure: (s) => {
      accepted(s);
      return spec.measure(s);
    },
  };
}
const distinct = (items: { id: string }[]) => {
  if (new Set(items.map((p) => p.id)).size !== items.length)
    throw new Error("Observation identities must be unique");
};

export const housePrices = model({
  kind: "house-prices",
  tags: [
    "house",
    "houses",
    "house price",
    "average",
    "mean",
    "median",
    "outlier",
    "outliers",
    "expensive",
    "price",
  ],
  name: "Average house price: mean, median and outliers",
  description:
    "Move one fictional house price and compare the mean balance point with the middle price.",
  assumptions: [
    "Fictional house prices from 0 to 1000 in neutral currency units. Empty data has undefined mean and median; observation IDs survive sorting.",
  ],
  fields: { houses: list(observation) },
  defaults: {
    houses: [100, 110, 120, 130, 140, 150, 160].map((value, i) => ({
      id: `house-${i + 1}`,
      value,
    })),
  },
  outputs: { mean: "currency units", median: "currency units" },
  validate: (s) => distinct(s.houses as { id: string }[]),
  measure: (s) => centre((s.houses as { value: number }[]).map((p) => p.value)),
  operations: {
    price: {
      schema: object({ value: num(0, 1000, "currency units") }),
      description: "Move the final authored house price",
      apply: (s, value) => {
        const houses = structuredClone(
          s.houses as { id: string; value: number }[],
        );
        if (!houses.length)
          throw new Error("Add a house before changing its price");
        houses[houses.length - 1].value = value as number;
        return { ...s, houses };
      },
    },
  },
});
export const scoreSpread = model({
  kind: "score-spread",
  tags: [
    "class",
    "classes",
    "scores",
    "average",
    "standard deviation",
    "variance",
    "variability",
    "spread",
    "results",
    "population",
    "sample",
  ],
  name: "Same average, different spread",
  description:
    "Compare two fictional classes with the same mean and visibly different deviations.",
  assumptions: [
    "Complete fictional populations by default; sample variance divides by n−1 and is undefined below two scores. Variance has squared-point units.",
  ],
  fields: {
    first: scores,
    second: scores,
    formula: choice("population", "sample"),
  },
  defaults: {
    first: [68, 69, 70, 71, 72],
    second: [50, 60, 70, 80, 90],
    formula: "population",
  },
  outputs: {
    firstMean: "points",
    secondMean: "points",
    firstDeviation: "points",
    secondDeviation: "points",
    firstVariance: "points²",
    secondVariance: "points²",
  },
  measure: (s) => {
    const a = spread(s.first as number[], s.formula === "sample"),
      b = spread(s.second as number[], s.formula === "sample");
    return {
      firstMean: a.mean,
      secondMean: b.mean,
      firstDeviation: a.deviation,
      secondDeviation: b.deviation,
      firstVariance: a.variance,
      secondVariance: b.variance,
    };
  },
  operations: {
    spread: {
      schema: object({ value: num(0, 30, "points") }),
      description: "Spread the second class symmetrically around 70",
      apply: (s, value) => ({
        ...s,
        second: [-2, -1, 0, 1, 2].map((i) => 70 + i * Number(value)),
      }),
    },
  },
});
export const studyRegression = model({
  kind: "study-regression",
  tags: [
    "study",
    "study hours",
    "exam",
    "exam scores",
    "scores",
    "regression",
    "least squares",
    "trend",
    "student",
    "outlier",
  ],
  name: "Study hours, scores and outliers",
  description:
    "Move one student's score and watch the least-squares fit and residuals respond.",
  assumptions: [
    "Fictional observations; association does not establish causation. Equal x values or empty data have no defined slope. Predictions outside observed hours are extrapolation.",
  ],
  fields: { students: list(point), predictionHours: num(0, 100, "hours") },
  defaults: {
    students: [1, 2, 3, 4, 5].map((x) => ({
      id: `student-${x}`,
      x,
      y: 40 + 10 * x,
    })),
    predictionHours: 3,
  },
  outputs: {
    slope: "points/hour",
    intercept: "points",
    residuals: "points",
    squaredError: "points²",
    prediction: "points",
    extrapolation: "boolean",
  },
  validate: (s) => distinct(s.students as { id: string }[]),
  measure: (s) => {
    const points = s.students as { x: number; y: number }[],
      fit = regression(points),
      x = Number(s.predictionHours);
    return {
      ...fit,
      prediction:
        fit.slope === null ? null : Number(fit.intercept) + fit.slope * x,
      extrapolation:
        !points.length ||
        x < Math.min(...points.map((p) => p.x)) ||
        x > Math.max(...points.map((p) => p.x)),
    };
  },
  operations: {
    score: {
      schema: object({ value: num(0, 100, "points") }),
      description: "Change the final student's score",
      apply: (s, value) => {
        const students = structuredClone(
          s.students as { id: string; x: number; y: number }[],
        );
        if (!students.length) throw new Error("Add a student first");
        students[students.length - 1].y = value as number;
        return { ...s, students };
      },
    },
  },
});
export const feasibleChoices = model({
  kind: "feasible-choices",
  tags: [
    "notebooks",
    "notebook",
    "pens",
    "pen",
    "affordable",
    "budget",
    "inequality",
    "inequalities",
    "combinations",
    "feasible choices",
  ],
  name: "Affordable notebooks and pens",
  description:
    "Show every affordable integer basket under a budget, minimum count and stock constraints.",
  assumptions: [
    "Whole items only, inclusive budget boundary. Counts and stock are bounded at 20 per item; prices and budget are represented in hundredths of a currency unit.",
  ],
  fields: {
    budget: num(0, 10000, "currency units"),
    notebookPrice: num(0.01, 1000, "currency units"),
    penPrice: num(0.01, 1000, "currency units"),
    notebookStock: num(0, 20, "notebooks", true),
    penStock: num(0, 20, "pens", true),
    minimumNotebooks: num(0, 20, "notebooks", true),
    minimumPens: num(0, 20, "pens", true),
    notebooks: num(0, 20, "notebooks", true),
    pens: num(0, 20, "pens", true),
  },
  defaults: {
    budget: 100,
    notebookPrice: 30,
    penPrice: 10,
    notebookStock: 10,
    penStock: 10,
    minimumNotebooks: 0,
    minimumPens: 0,
    notebooks: 2,
    pens: 4,
  },
  outputs: {
    cost: "currency units",
    remaining: "currency units",
    affordable: "boolean",
    exclusion: "text",
    choices: "baskets",
  },
  validate: (s) => {
    for (const key of ["budget", "notebookPrice", "penPrice"])
      if (
        Math.abs(Number(s[key]) * 100 - Math.round(Number(s[key]) * 100)) > 1e-7
      )
        throw new Error("Money must use whole hundredths of a currency unit");
  },
  measure: (s) => {
    let choices = 0;
    for (let n = 0; n <= Number(s.notebookStock); n++)
      for (let p = 0; p <= Number(s.penStock); p++)
        if (basketAllowed(s, n, p)) choices++;
    const cents = basketCost(s, Number(s.notebooks), Number(s.pens));
    return {
      cost: cents / 100,
      remaining: (Math.round(Number(s.budget) * 100) - cents) / 100,
      affordable: basketAllowed(s, Number(s.notebooks), Number(s.pens)),
      exclusion: basketExclusion(s, Number(s.notebooks), Number(s.pens)),
      choices,
    };
  },
});
export function basketCost(s: Record<string, unknown>, n: number, p: number) {
  return (
    Math.round(Number(s.notebookPrice) * 100) * n +
    Math.round(Number(s.penPrice) * 100) * p
  );
}
export function basketExclusion(
  s: Record<string, unknown>,
  n: number,
  p: number,
) {
  if (n < Number(s.minimumNotebooks)) return "Below the minimum notebook count";
  if (p < Number(s.minimumPens)) return "Below the minimum pen count";
  if (n > Number(s.notebookStock)) return "More notebooks than stock allows";
  if (p > Number(s.penStock)) return "More pens than stock allows";
  if (basketCost(s, n, p) > Math.round(Number(s.budget) * 100))
    return "Over budget";
  return null;
}
export function basketAllowed(
  s: Record<string, unknown>,
  n: number,
  p: number,
) {
  return basketExclusion(s, n, p) === null;
}
export const surveySampling = model({
  kind: "survey-sampling",
  tags: [
    "survey",
    "surveys",
    "random survey",
    "fluctuate",
    "sampling",
    "sample",
    "sample size",
    "people",
    "uncertainty",
    "variation",
    "selection bias",
    "response",
    "population",
  ],
  name: "Survey size and uncertainty",
  description:
    "Draw seeded repeated survey estimates and compare sample size with selection bias.",
  assumptions: [
    "Independent draws with replacement from an effectively large population. Biased selection uses a stated response probability separate from population truth. Larger samples do not guarantee a closer individual estimate. No confidence intervals or finite-population correction.",
  ],
  fields: {
    probability: num(0, 1),
    sampleSize: num(1, 5000, "people", true),
    selection: choice("random", "biased"),
    biasedProbability: num(0, 1),
    seed: num(0, 4294967295, "", true),
    batch: num(0, 1000000, "", true),
  },
  defaults: {
    probability: 0.6,
    sampleSize: 20,
    selection: "random",
    biasedProbability: 0.8,
    seed: 12345,
    batch: 0,
  },
  outputs: {
    estimates: "proportion",
    standardError: "proportion",
    selectedProbability: "proportion",
    population: "proportion",
  },
  measure: (s) => {
    const p = Number(s.probability),
      selected = s.selection === "biased" ? Number(s.biasedProbability) : p;
    const rng = random(
      (Number(s.seed) + Math.imul(Number(s.batch), 0x9e3779b9)) >>> 0,
    );
    const estimates = Array.from({ length: 20 }, () => {
      let successes = 0;
      for (let i = 0; i < Number(s.sampleSize); i++)
        if (rng() < selected) successes++;
      return successes / Number(s.sampleSize);
    });
    return {
      estimates,
      standardError: Math.sqrt((p * (1 - p)) / Number(s.sampleSize)),
      selectedProbability: selected,
      population: p,
    };
  },
  operations: {
    draw: {
      schema: object({}),
      description: "Draw 20 new surveys with a recorded deterministic batch",
      apply: (s) => ({ ...s, batch: Number(s.batch) + 1 }),
    },
  },
});
export const conditionalBags = model({
  kind: "conditional-bags",
  tags: [
    "marble",
    "marbles",
    "bag",
    "bags",
    "blue",
    "conditional probability",
    "probability",
    "first bag",
    "Bayes",
    "origins",
  ],
  name: "Blue marbles and hidden origins",
  description:
    "Reveal blue evidence and compare the prior with the weighted probability of the first bag.",
  assumptions: [
    "Fixed contents with replacement. Branch probabilities use bag-selection weights, not equally weighted marbles across bags. Impossible blue evidence has undefined conditional probability.",
  ],
  fields: {
    blueA: num(0, 100, "marbles", true),
    redA: num(0, 100, "marbles", true),
    blueB: num(0, 100, "marbles", true),
    redB: num(0, 100, "marbles", true),
    prior: num(0, 1),
    revealed: choice(0, 1),
  },
  defaults: { blueA: 8, redA: 2, blueB: 2, redB: 8, prior: 0.5, revealed: 0 },
  outputs: {
    blueFromA: "probability",
    blueFromB: "probability",
    blue: "probability",
    posterior: "probability",
    prior: "probability",
  },
  validate: (s) => {
    if (
      Number(s.blueA) + Number(s.redA) === 0 ||
      Number(s.blueB) + Number(s.redB) === 0
    )
      throw new Error("Each bag must contain at least one marble");
  },
  measure: (s) => {
    const prior = Number(s.prior),
      a = (prior * Number(s.blueA)) / (Number(s.blueA) + Number(s.redA)),
      b = ((1 - prior) * Number(s.blueB)) / (Number(s.blueB) + Number(s.redB));
    return {
      blueFromA: a,
      blueFromB: b,
      blue: a + b,
      posterior: a + b ? a / (a + b) : null,
      prior,
    };
  },
  operations: {
    reveal: {
      schema: object({}),
      description: "Reveal that the marble is blue",
      apply: (s) => ({ ...s, revealed: 1 }),
    },
  },
});
export const teamsAndPodiums = model({
  kind: "teams-and-podiums",
  tags: [
    "teammates",
    "team",
    "teams",
    "podium",
    "first",
    "second",
    "third place",
    "choosing",
    "combinations",
    "permutations",
    "counting",
    "order",
  ],
  name: "Teams versus podiums",
  description:
    "Compare unordered teams with ordered podium positions from the same distinct people.",
  assumptions: [
    "Distinct people, no repeated selections; exact counts use integer arithmetic. Gallery is capped at 12 examples, never presented as the total. Empty selection has one outcome.",
  ],
  fields: {
    people: num(0, 20, "people", true),
    selected: num(0, 20, "people", true),
    mode: choice("team", "podium"),
  },
  defaults: { people: 5, selected: 3, mode: "team" },
  outputs: {
    ordered: "outcomes",
    teams: "outcomes",
    ordersPerTeam: "orders/team",
  },
  validate: (s) => {
    if (Number(s.selected) > Number(s.people))
      throw new Error("Cannot choose more people than exist");
  },
  measure: (s) => counts(Number(s.people), Number(s.selected)),
  operations: {
    toggle: {
      schema: object({}),
      description: "Switch between team and podium",
      apply: (s) => ({ ...s, mode: s.mode === "team" ? "podium" : "team" }),
    },
  },
});
export const loanPayments = model({
  kind: "loan-payments",
  tags: [
    "loan",
    "loan repayment",
    "payment",
    "payments",
    "monthly",
    "extra",
    "amortization",
    "interest",
    "principal",
  ],
  name: "Where each loan payment goes",
  description:
    "Step through interest and principal payments, comparing an extra-payment schedule with the same starting loan.",
  assumptions: [
    "Fictional fixed nominal annual rate from 0–30%, terms up to 600 months, compounded monthly; payments at month end. Full internal precision, display rounded to hundredths; final payment is capped at the debt. Extra payments apply from month one; editing extra recalculates that schedule at the selected month. No fees, taxes, penalties or lender-specific rounding.",
  ],
  fields: {
    principal: num(0.01, 1000000, "currency units"),
    annualPercent: num(0, 30, "%/year"),
    months: num(1, 600, "months", true),
    extra: num(0, 100000, "currency units/month"),
    month: num(0, 600, "months", true),
  },
  defaults: {
    principal: 1200,
    annualPercent: 12,
    months: 12,
    extra: 0,
    month: 0,
  },
  outputs: {
    payment: "currency units/month",
    balance: "currency units",
    baselineBalance: "currency units",
    interest: "currency units",
    capital: "currency units",
    paid: "currency units",
    totalInterest: "currency units",
    baselineInterest: "currency units",
    payoffMonth: "months",
    baselinePayoff: "months",
    timeline: "currency units",
  },
  measure: (s) => {
    const p = Number(s.principal),
      n = Number(s.months),
      m = Number(s.month),
      a = amortize(p, Number(s.annualPercent), n, Number(s.extra)),
      b = amortize(p, Number(s.annualPercent), n, 0),
      row = a.schedule[m - 1];
    return {
      payment: a.payment,
      balance: m === 0 ? p : (row?.balance ?? 0),
      baselineBalance: m === 0 ? p : (b.schedule[m - 1]?.balance ?? 0),
      interest: row?.interest ?? 0,
      capital: row?.principal ?? 0,
      paid: row?.paid ?? 0,
      totalInterest: a.totalInterest,
      baselineInterest: b.totalInterest,
      payoffMonth: a.payoffMonth,
      baselinePayoff: b.payoffMonth,
      timeline: Array.from({ length: Math.min(25, n + 1) }, (_, i) => {
        const month = Math.round((i * n) / Math.min(24, n));
        return {
          month,
          balance: month === 0 ? p : (a.schedule[month - 1]?.balance ?? 0),
          baseline: month === 0 ? p : (b.schedule[month - 1]?.balance ?? 0),
        };
      }),
    };
  },
  operations: {
    next: {
      schema: object({}),
      description: "Apply the next monthly payment",
      apply: (s) => ({
        ...s,
        month: Math.min(Number(s.month) + 1, Number(s.months)),
      }),
    },
  },
});
export const instantaneousVelocity = model({
  kind: "instantaneous-velocity",
  tags: [
    "car",
    "fast",
    "exact moment",
    "travelled",
    "instantaneous speed",
    "motion",
    "position",
    "instantaneous rate",
    "derivative",
    "derivatives",
    "calculus",
    "velocity",
    "speed",
    "tangent",
    "secant",
  ],
  name: "Average and instantaneous velocity",
  description:
    "Shrink a signed time interval and compare a secant estimate with the analytic tangent velocity.",
  assumptions: [
    "Supported smooth position presets: s=t² or s=(t−5)² metres. Signed velocity differs from speed. Nonzero h is an average velocity estimate, never the exact derivative.",
  ],
  fields: {
    time: num(0, 10, "s"),
    increment: num(-5, 5, "s"),
    preset: choice("quadratic", "reversing"),
  },
  defaults: { time: 3, increment: 1, preset: "quadratic" },
  outputs: {
    position: "m",
    nextPosition: "m",
    averageVelocity: "m/s",
    velocity: "m/s",
    speed: "m/s",
  },
  validate: (s) => {
    if (
      Math.abs(Number(s.increment)) < 0.0001 ||
      Number(s.time) + Number(s.increment) < 0 ||
      Number(s.time) + Number(s.increment) > 10
    )
      throw new Error("Use |h| ≥ 0.0001 s with both times inside 0–10 s");
  },
  measure: (s) => {
    const t = Number(s.time),
      h = Number(s.increment),
      offset = s.preset === "reversing" ? 5 : 0,
      u = t - offset,
      v = 2 * u;
    return {
      position: u * u,
      nextPosition: (u + h) ** 2,
      averageVelocity: 2 * u + h,
      velocity: v,
      speed: Math.abs(v),
    };
  },
  operations: {
    shrink: {
      schema: object({}),
      description: "Halve the nonzero interval toward the tangent limit",
      apply: (s) => ({
        ...s,
        increment:
          Math.sign(Number(s.increment)) *
          Math.max(0.0001, Math.abs(Number(s.increment)) / 2),
      }),
    },
  },
});
const knotsSchema = list(
  object({ time: num(0, 60, "min"), rate: num(0, 100, "L/min") }),
  2,
  12,
);
export const accumulatedWater = model({
  kind: "accumulated-water",
  tags: [
    "tap",
    "tank",
    "water",
    "flow",
    "flow rate",
    "faster",
    "slower",
    "accumulate",
    "accumulation",
    "integration",
    "integral",
    "litres",
  ],
  name: "Water accumulated from changing flow",
  description:
    "Refine rate rectangles and compare their estimated litres with an exact piecewise-linear integral and tank fill.",
  assumptions: [
    "Nonnegative piecewise-linear inflow in L/min; rectangle areas are litres. Sufficient tank capacity is required. No drain or overflow model; exact result uses analytic trapezoids on linear segments.",
  ],
  fields: {
    knots: knotsSchema,
    start: num(0, 60, "min"),
    end: num(0, 60, "min"),
    partitions: num(1, 200, "rectangles", true),
    rule: choice("left", "right", "midpoint"),
    initial: num(0, 10000, "L"),
    capacity: num(0.01, 20000, "L"),
  },
  defaults: {
    knots: [
      { time: 0, rate: 2 },
      { time: 3, rate: 5 },
    ],
    start: 0,
    end: 3,
    partitions: 3,
    rule: "left",
    initial: 0,
    capacity: 20,
  },
  outputs: { exact: "L", estimate: "L", error: "L", tank: "L" },
  validate: (s) => {
    const knots = s.knots as Knot[];
    if (
      knots.some((p, i) => i > 0 && p.time <= knots[i - 1].time) ||
      Number(s.start) >= Number(s.end) ||
      Number(s.start) < knots[0].time ||
      Number(s.end) > knots[knots.length - 1].time
    )
      throw new Error(
        "Use increasing knot times covering the full integration interval",
      );
    if (
      Number(s.initial) + integral(knots, Number(s.start), Number(s.end)) >
      Number(s.capacity)
    )
      throw new Error(
        "Tank capacity is insufficient; overflow accounting is unsupported",
      );
  },
  measure: (s) => {
    const a = Number(s.start),
      b = Number(s.end),
      n = Number(s.partitions),
      dx = (b - a) / n,
      knots = s.knots as Knot[],
      shift = s.rule === "left" ? 0 : s.rule === "right" ? 1 : 0.5;
    let estimate = 0;
    for (let i = 0; i < n; i++)
      estimate += flowAt(knots, a + (i + shift) * dx) * dx;
    const exact = integral(knots, a, b);
    return {
      exact,
      estimate,
      error: estimate - exact,
      tank: Number(s.initial) + exact,
    };
  },
  operations: {
    refine: {
      schema: object({}),
      description: "Double the number of rectangles",
      apply: (s) => ({
        ...s,
        partitions: Math.min(200, Number(s.partitions) * 2),
      }),
    },
  },
});
export const mathAnalysis: DomainContribution = {
  namespace: "math-analysis",
  version: 1,
  models: [
    feasibleChoices,
    housePrices,
    scoreSpread,
    surveySampling,
    studyRegression,
    conditionalBags,
    teamsAndPodiums,
    loanPayments,
    instantaneousVelocity,
    accumulatedWater,
  ],
};
