const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const runtime = load("src/simulations/runtime/session.ts");
const { defaultAssembly, compileAssembly } = load(
  "src/simulations/runtime/assembly.ts",
);
const { useAssemblyStore } = load("src/simulations/runtime/assemblySession.ts");
const { validateContext } = load("src/simulations/runtime/legacyPlan.ts");
const { parseConfiguration, parseTeachingIntent } = load(
  "scripts/compatibility/legacyConfiguration.ts",
);
const math = load(
  "src/simulations/components/systems/math-foundations/models.ts",
);
const near = (a, b) =>
  assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const ref = (name) => `prefabs/math-foundations/${name}`;
const circleIntent = {
  schemaVersion: 1,
  kind: "create",
  learningGoal: "Explore the circle ratio",
  representation: "compositions/Circle",
  relationship: "Circumference divided by diameter is constant",
  initialExample: "A circle of radius one",
  interactions: ["Change radius"],
  observations: ["Observe circumference and diameter"],
  playing: false,
  explanation: "Compare the calculated measurements.",
  assumptions: ["Euclidean geometry"],
};
assert.equal(
  parseTeachingIntent(JSON.stringify(circleIntent)).representation,
  ref("Circle"),
);
assert.throws(() =>
  parseTeachingIntent(
    JSON.stringify({ ...circleIntent, representation: "compositions/Missing" }),
  ),
);
const plan = (assembly) => ({
  schemaVersion: 1,
  operation: "create",
  composition: { ref: "assemblies/GeneratedExperiment", version: 1 },
  parameters: {},
  assembly,
  message: "Create bounded assembly.",
});
const activate = (assembly) => {
  runtime.disposeSession();
  const result = runtime.executePlan(plan(assembly));
  assert.ok(result.accepted, result.error);
};
const apply = (type, value, target = "object/first") => {
  const result = runtime.dispatchCommand("assembly", {
    type,
    target,
    ...(value === undefined ? {} : { value }),
  });
  assert.ok(result.accepted, result.error);
};
const output = (index = 0) =>
  useAssemblyStore.getState().instances[index].outputs;
activate(defaultAssembly(ref("Equation")));
assert.equal(output().equation, "2x + 3 = 11");
apply("SUBTRACT_BOTH", 3);
assert.equal(output().equation, "2x = 8");
apply("DIVIDE_BOTH", 2);
assert.equal(output().equation, "x = 4");
assert.equal(output().substitution, true);
assert.deepEqual(output().steps, ["2x + 3 = 11", "2x = 8"]);
apply("UNDO");
assert.equal(output().equation, "2x = 8");
apply("DIVIDE_BOTH", 3);
assert.equal(output().equation, "2/3x = 8/3");
assert.equal(output().solution, "4");
assert.equal(output().substitution, true);
const beforeZero = runtime.getDiagnosticSnapshot();
assert.equal(
  runtime.dispatchBatch("assembly", [
    { type: "SUBTRACT_BOTH", target: "object/first", value: 1 },
    { type: "DIVIDE_BOTH", target: "object/first", value: 0 },
  ]).accepted,
  false,
);
assert.deepEqual(runtime.getDiagnosticSnapshot(), beforeZero);
apply("RESET", undefined, "session");
assert.equal(output().equation, "2x + 3 = 11");
assert.deepEqual(output().steps, []);
const signed = defaultAssembly(ref("Equation"));
signed.instances[0].parameters = { coefficient: -2, constant: -3, right: 11 };
activate(signed);
assert.equal(output().equation, "-2x − 3 = 11");
assert.equal(output().solution, "-7");
apply("SUBTRACT_BOTH", -3);
apply("DIVIDE_BOTH", -2);
assert.equal(output().equation, "x = -7");
assert.equal(output().substitution, true);
assert.deepEqual(math.divide(math.rational(2), math.rational(3)), {
  n: 2,
  d: 3,
});
assert.throws(() =>
  math.multiply(math.rational(Number.MAX_SAFE_INTEGER), math.rational(2)),
);
const line = defaultAssembly(ref("Line"));
activate(line);
apply("SET_SLOPE", 2);
apply("SET_INTERCEPT", 3);
near(output().yAtZero, 3);
near(output().yAtOne, 5);
assert.deepEqual(
  output().points.find((p) => p.x === 0),
  { x: 0, y: 3 },
);
assert.deepEqual(
  output().points.find((p) => p.x === 1),
  { x: 1, y: 5 },
);
apply("SET_SLOPE", 0);
assert.ok(output().points.every((p) => p.y === 3));
apply("SET_SLOPE", -2);
near(output().yAtOne, 1);
apply("RESET", undefined, "session");
near(output().yAtOne, 1);
near(output().yAtZero, 0);
const comparison = defaultAssembly(ref("Line"));
comparison.instances.push({
  id: "line/second",
  label: "Second line",
  prefab: { ref: ref("Line"), version: 1 },
  parameters: { slope: -1, intercept: 2 },
});
for (const key of ["points", "equation", "yAtZero", "yAtOne", "rise", "run"]) {
  const id =
    key === "points" ? "observe/secondPoints" : `observe/second-${key}`;
  comparison.observations.push({
    id,
    instance: "line/second",
    output: key,
    unit: ["equation", "rise", "run"].includes(key) ? "1" : "math units",
  });
  comparison.connections.push({
    type: "observation-source",
    from: { instance: "line/second", output: key },
    to: id,
  });
  for (const view of comparison.views) view.observations.push(id);
}
comparison.controls.push(
  { instance: "line/second", action: "SET_SLOPE" },
  { instance: "line/second", action: "SET_INTERCEPT" },
);
comparison.views.push({
  ref: "views/AssemblyGraph",
  observations: ["observe/points", "observe/secondPoints"],
});
activate(comparison);
assert.equal(useAssemblyStore.getState().instances.length, 2);
apply("SET_SLOPE", 2, "line/second");
near(output(0).yAtOne, 1);
near(output(1).yAtOne, 4);
assert.equal(output(1).equation, "y = 2x + 2");
assert.equal(runtime.getExperimentContext().recentChange.before.slope, -1);
assert.equal(runtime.getExperimentContext().recentChange.after.slope, 2);
validateContext(runtime.getExperimentContext());
const stale = runtime.getExperimentContext();
apply("SET_INTERCEPT", 5, "line/second");
assert.equal(
  runtime.executePlan({
    schemaVersion: 1,
    operation: "edit",
    sessionId: stale.sessionId,
    expectedRevision: stale.revision,
    commands: [
      { target: "line/second", action: "SET_SLOPE", arguments: { value: 4 } },
    ],
    message: "Stale request",
  }).accepted,
  false,
);
apply("RESET", undefined, "session");
near(output(1).yAtOne, 1);
const saved = runtime.saveRecipe();
runtime.disposeSession();
runtime.loadRecipe(saved);
assert.equal(useAssemblyStore.getState().instances.length, 2);
activate(defaultAssembly(ref("Circle")));
near(output().diameter, 2);
near(output().circumference, 6.283185307179586);
// biome-ignore lint/suspicious/noApproximativeNumericConstant: independent numerical oracle
near(output().ratio, 3.141592653589793);
apply("SET_RADIUS", 2);
near(output().diameter, 4);
near(output().circumference, 12.566370614359172);
// biome-ignore lint/suspicious/noApproximativeNumericConstant: independent numerical oracle
near(output().ratio, 3.141592653589793);
const circleBefore = runtime.getDiagnosticSnapshot();
assert.equal(
  runtime.dispatchCommand("assembly", {
    type: "SET_RADIUS",
    value: 0,
    target: "object/first",
  }).accepted,
  false,
);
assert.deepEqual(runtime.getDiagnosticSnapshot(), circleBefore);
apply("RESET", undefined, "session");
near(output().radius, 1);
for (const radius of [0.01, 0.5, 3, 100]) {
  apply("SET_RADIUS", radius);
  near(output().diameter, radius * 2);
  near(output().circumference, radius * 6.283185307179586);
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: independent numerical oracle
  near(output().ratio, 3.141592653589793);
}
// Rejected activation never disposes/replaces the current experiment.
for (const mutate of [
  (a) => a.instances.push(structuredClone(a.instances[0])),
  (a) => (a.instances[0].prefab.ref = "prefabs/Missing"),
  (a) => (a.instances[0].prefab.version = 2),
  (a) => (a.instances[0].parameters = { radius: 0 }),
  (a) => (a.instances[0].parameters = { radius: 1, unit: "m" }),
  (a) => (a.observations[0].unit = "m"),
  (a) => (a.connections[0].from.instance = "missing"),
  (a) => (a.connections[0].type = "execute"),
  (a) => (a.controls[0].action = "DIVIDE_BOTH"),
  (a) => (a.views[0].ref = "views/Missing"),
  (a) =>
    a.views.push({
      ref: "views/AssemblyGraph",
      observations: [a.observations[0].id],
    }),
  (a) => (a.state = { radius: 3 }),
  (a) => (a.instances[0].parameters = { radius: Infinity }),
]) {
  const a = defaultAssembly(ref("Circle"));
  mutate(a);
  const before = runtime.getDiagnosticSnapshot();
  assert.equal(runtime.executePlan(plan(a)).accepted, false);
  assert.deepEqual(runtime.getDiagnosticSnapshot(), before);
}
const badDomain = defaultAssembly(ref("Line"));
badDomain.instances[0].parameters = { xMin: 5, xMax: -5 };
assert.throws(() => compileAssembly(badDomain));
const noGraph = defaultAssembly(ref("Line"));
assert.equal(
  compileAssembly(noGraph).definition.components.views.includes(
    "AssemblyGraph",
  ),
  false,
);
assert.equal(
  compileAssembly(comparison).definition.components.views.includes(
    "AssemblyGraph",
  ),
  true,
);
// Compact configuration is model-authored object assembly; compiler supplies typed bindings.
const compact = (provider, objects) => ({
  schemaVersion: 1,
  outcome: "configuration",
  confirmedComposition: ref(provider),
  title: "Interactive comparison",
  learningGoal: "Change an input and observe the result.",
  objects,
});
const equationWire = compact("Equation", [
  {
    id: "equation/initial",
    label: "Initial equation",
    parameters: { coefficient: 3, constant: -2, right: 10 },
    observations: ["equation", "solution", "substitution"],
  },
]);
const equationConfig = parseConfiguration(
  JSON.stringify(equationWire),
  ref("Equation"),
);
const annotatedEquationWire = structuredClone(equationWire);
annotatedEquationWire.objects[0].observations = [
  "equation: 3x - 2 = 10",
  "solution: x = 4",
  "substitution: true",
];
assert.deepEqual(
  parseConfiguration(
    JSON.stringify(annotatedEquationWire),
    ref("Equation"),
  ).plan.assembly.observations.map((observation) => observation.output),
  ["equation", "solution", "substitution"],
);
const inventedObservationWire = structuredClone(equationWire);
inventedObservationWire.objects[0].observations = ["balance: equal"];
assert.throws(() =>
  parseConfiguration(JSON.stringify(inventedObservationWire), ref("Equation")),
);
assert.deepEqual(
  parseConfiguration(`${JSON.stringify(equationWire)}]`, ref("Equation")),
  equationConfig,
);
assert.throws(() =>
  parseConfiguration(
    `${JSON.stringify(equationWire)} arbitrary`,
    ref("Equation"),
  ),
);
assert.equal(equationConfig.plan.message, equationWire.learningGoal);
assert.equal(
  equationConfig.plan.assembly.instances[0].parameters.coefficient,
  3,
);
assert.equal(equationConfig.plan.assembly.connections.length, 3);
assert.equal(equationConfig.plan.assembly.controls.length, 3);
const twoLineWire = compact(
  "Line",
  [1, 2].map((index) => ({
    id: `line/l${index}`,
    label: `Line ${index}`,
    parameters: { slope: index, intercept: index - 1 },
    observations: ["equation", "yAtZero", "yAtOne", "rise", "run", "points"],
  })),
);
const lineConfig = parseConfiguration(
  JSON.stringify(twoLineWire),
  ref("Line"),
  "graph",
  "comparison",
);
assert.equal(lineConfig.plan.assembly.instances.length, 2);
assert.ok(
  lineConfig.plan.assembly.views.some((v) => v.ref === "views/AssemblyGraph"),
);
assert.equal(
  compileAssembly(lineConfig.plan.assembly).instances[1].outputs.yAtOne,
  3,
);
const tooManyEquations = structuredClone(equationWire);
tooManyEquations.objects.push({
  ...tooManyEquations.objects[0],
  id: "equation/second",
});
assert.throws(() =>
  parseConfiguration(JSON.stringify(tooManyEquations), ref("Equation")),
);
const missingObservation = structuredClone(twoLineWire);
missingObservation.objects[0].observations = ["points"];
assert.throws(() =>
  parseConfiguration(
    JSON.stringify(missingObservation),
    ref("Line"),
    "graph",
    "comparison",
  ),
);
assert.throws(() =>
  parseConfiguration(JSON.stringify(twoLineWire), ref("Line")),
);
const unsupported = structuredClone(equationWire);
unsupported.objects[0].parameters.code = "eval()";
assert.throws(() =>
  parseConfiguration(JSON.stringify(unsupported), ref("Equation")),
);
// Fresh inference contract fixtures, not acceptance/live evidence or production responses.
runtime.disposeSession();
console.log(
  "Math foundation assemblies: independent numerical, structural, lifecycle, atomicity and historical configuration fixtures passed. Live generation is verified by scripts/generation.",
);
