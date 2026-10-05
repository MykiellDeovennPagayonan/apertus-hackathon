const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { performance } = require("node:perf_hooks");
const { load } = require("./test-loader.cjs");
const { acceptedCommandArguments, commandPresentation } = load(
  "src/simulations/components/controls/commandPresentation.ts",
);
const { publicDefinitions } = load(
  "src/simulations/components/catalog/index.ts",
);
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { validateValue } = load("src/simulations/runtime/parameterSchema.ts");
const { comparisonData } = load(
  "src/simulations/components/views/dataPresentation.ts",
);
const { DatasetDisplay } = load(
  "src/simulations/components/views/DatasetDisplay.tsx",
);
const { RecipeLesson } = load(
  "src/simulations/components/views/RecipeLesson.tsx",
);
const examples = [
  ["models/counting", "SET_COUNTING_TASK", { mode: "place", target: 8 }],
  [
    "models/equal-groups",
    "SET_GROUPING_TASK",
    { mode: "share", groups: 4, perGroup: 2, total: 17 },
  ],
  [
    "models/fraction-number-line",
    "SET_NUMBER_LINE_TASK",
    { mode: "place", a: { n: 2, d: 3 }, b: { n: 1, d: 2 } },
  ],
  ["models/fraction-number-line", "SET_TICK_DIVISIONS", 12],
  ["models/ratio", "SET_RATIO", { numerator: 4, denominator: 5 }],
  ["models/area-perimeter", "SET_DIMENSIONS", { width: 7, height: 8 }],
  ["models/coordinates", "MOVE_POINT", { x: 0, y: -3 }],
  [
    "models/probability",
    "SET_DISTRIBUTION",
    { preset: "die", seed: 99, trials: 100 },
  ],
  ["models/BridgeLoad", "MOVE_LOAD", 0.8],
  ["models/BridgeLoad", "SET_LOAD", 20],
  ["prefabs/chemistry/Conservation", "CHEM_SET_COEFFICIENTS", [2, 1, 2]],
  ["prefabs/chemistry/ReactionRate", "CHEM_SET_TEMPERATURE", 330],
  ["prefabs/physical-systems/Pendulum", "PEND_SET_LENGTH", 2],
  ["prefabs/physical-systems/Pendulum", "PEND_SET_GRAVITY", 8],
  ["prefabs/physical-systems/Pendulum", "PEND_SET_AMPLITUDE", 5],
  ["prefabs/physical-systems/RollingTrack", "ROLL_SET_RESISTANCE", 0.2],
  ["prefabs/physical-systems/ResistiveCircuit", "CIRC_SET_BULBS", 3],
  [
    "prefabs/physical-systems/ResistiveCircuit",
    "CIRC_SET_TOPOLOGY",
    "parallel",
  ],
  ["prefabs/natural-systems/DiffusionField", "DIFF_SET_COEFFICIENT", 0.2],
  ["prefabs/natural-systems/PredatorPrey", "ECO_SET_INITIAL_RABBITS", 80],
  ["prefabs/natural-systems/PlantGrowth", "PLANT_SET_LIGHT", 0],
  [
    "prefabs/dynamic-systems/CompoundGrowth",
    "GROW_SET_SCENARIO",
    { annualRate: 0.06, years: 12 },
  ],
  ["prefabs/dynamic-systems/CompoundGrowth", "GROW_SET_PRINCIPAL", 1500],
  ["prefabs/dynamic-systems/RingTraffic", "TRAFFIC_SET_HEADWAY", 2],
  ["prefabs/dynamic-systems/CheckoutQueue", "QUEUE_SET_CASHIERS", 2],
  ["prefabs/dynamic-systems/CheckoutQueue", "QUEUE_SET_ARRIVAL_RATE", 0.7],
  ["prefabs/dynamic-systems/CheckoutQueue", "QUEUE_SET_SERVICE_RATE", 0.8],
];
for (const [definition, command, value] of examples) {
  const runtime = new DocumentRuntime(modelRecipe(definition).document);
  const before = acceptedCommandArguments(
    command,
    runtime.getSnapshot().state.model,
  );
  assert.ok(before, `${definition}/${command}: accepted-state adapter`);
  validateValue(
    publicDefinitions.get(definition).commands[command].arguments,
    before,
  );
  const result = runtime.dispatch([
    { node: "model", command, arguments: { value } },
  ]);
  assert.equal(
    result.accepted,
    true,
    `${definition}/${command}: ${result.error}`,
  );
  const current = acceptedCommandArguments(
    command,
    runtime.getSnapshot().state.model,
  );
  assert.deepEqual(
    current,
    { value },
    `${definition}/${command}: reflects acceptance`,
  );
  runtime.reset();
  assert.deepEqual(
    acceptedCommandArguments(command, runtime.getSnapshot().state.model),
    before,
    `${definition}/${command}: restores accepted authored values`,
  );
}
assert.equal(
  acceptedCommandArguments("CHEM_ADD_WATER", { volume: 3 }),
  undefined,
);
assert.equal(
  acceptedCommandArguments("RUN_TRIALS", { trials: 100 }),
  undefined,
);
assert.equal(
  acceptedCommandArguments("DIFF_SCALE_COEFFICIENT", {
    diffusionCoefficient: 0.2,
  }),
  undefined,
);
assert.deepEqual(
  comparisonData(
    [
      { x: 0, y: 0 },
      { x: 2, y: 4 },
    ],
    [{ x: 1, y: 3 }],
  ),
  [
    { x: 0, y: 0 },
    { x: 1, comparison_y: 3 },
    { x: 2, y: 4 },
  ],
);
assert.equal(typeof comparisonData([{ x: NaN, y: 1 }], []), "string");
assert.equal(
  typeof comparisonData(
    [
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ],
    [],
  ),
  "string",
);
assert.equal(
  commandPresentation("CHEM_SET_COEFFICIENTS", "prefabs/chemistry/Conservation")
    .presentation["value.2"].label,
  "Product coefficient",
);
// Every generated model recipe remains valid and renderable after curation, including incomplete author states.
let reviewed = 0;
for (const definition of publicDefinitions.values()) {
  if (definition.category !== "models") continue;
  const document = modelRecipe(definition.id).document;
  const html = renderToStaticMarkup(
    React.createElement(RecipeLesson, { document }),
  );
  assert.ok(html.includes("recipe-lesson"), definition.id);
  assert.ok(
    !/="[^"]*(?:NaN|Infinity)[^"]*"/.test(html),
    `${definition.id}: finite presentation geometry`,
  );
  assert.ok(
    !html.includes("see assumptions</"),
    `${definition.id}: meaningful units`,
  );
  reviewed++;
}
// Exercise supported upper bounds rather than asserting a machine-specific render time.
const start = performance.now();
for (const [value, kind] of [
  [
    Array.from({ length: 1000 }, (_, i) => ({ sample: i, value: i / 1000 })),
    "DataTable",
  ],
  [
    Array.from({ length: 15 }, (_, y) =>
      Array.from({ length: 15 }, (_, x) => (x + y) / 30),
    ),
    "Heatmap",
  ],
]) {
  const html = renderToStaticMarkup(
    React.createElement(DatasetDisplay, {
      label: "Bounded observations",
      kind,
      value,
    }),
  );
  assert.ok(html.includes("data-table"), `${kind}: exact data access`);
  assert.ok(!/NaN|Infinity/.test(html));
}
console.log(
  `Component completion: ${examples.length} real command acceptance/reset adapters, ${reviewed} generated model recipes, comparison gaps/validation, and bounded data renders passed (${Math.round(performance.now() - start)}ms for bounds).`,
);

const session = load("src/simulations/runtime/session.ts");
const { useProjectileStore } = load(
  "src/simulations/runtime/projectileSession.ts",
);
let clockCallback;
const priorRaf = global.requestAnimationFrame;
const priorCancel = global.cancelAnimationFrame;
const priorMedia = global.matchMedia;
try {
  global.requestAnimationFrame = (callback) => {
    clockCallback = callback;
    return 1;
  };
  global.cancelAnimationFrame = () => {};
  global.matchMedia = () => ({ matches: true });
  session.activateSession("projectile");
  clockCallback(0);
  clockCallback(100);
  assert.equal(
    useProjectileStore.getState().primary.elapsed,
    0,
    "compatibility clock respects reduced motion",
  );
  assert.equal(session.advanceSessionTime(0.25).accepted, true);
  assert.equal(
    useProjectileStore.getState().primary.elapsed,
    0.25,
    "manual stepping uses authoritative legacy state",
  );
  let notifications = 0;
  const unsubscribe = session.subscribeSessionAnimation(() => notifications++);
  session.setSessionAnimation(true);
  assert.equal(session.getSessionAnimation(), true);
  clockCallback(200);
  assert.ok(
    useProjectileStore.getState().primary.elapsed > 0.25,
    "explicit animation opt-in advances the same clock",
  );
  session.setSessionAnimation(false);
  const elapsed = useProjectileStore.getState().primary.elapsed;
  clockCallback(300);
  assert.equal(useProjectileStore.getState().primary.elapsed, elapsed);
  assert.equal(
    notifications,
    2,
    "shared motion setting synchronizes all compatibility views",
  );
  assert.equal(session.advanceSessionTime(NaN).accepted, false);
  unsubscribe();
  session.disposeSession();
} finally {
  global.requestAnimationFrame = priorRaf;
  global.cancelAnimationFrame = priorCancel;
  global.matchMedia = priorMedia;
}
console.log(
  "Compatibility motion: authored autoplay held for reduced motion, explicit single-clock stepping/animation and shared view state passed.",
);
