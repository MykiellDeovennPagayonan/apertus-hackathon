const assert = require("node:assert/strict");
const { load } = require("./loader.cjs");
const { chemistry } = load("src/simulations/domains/chemistry/index.ts");
const { compileAssembly, defaultAssembly, assemblyCapability } = load(
  "src/simulations/runtime/assembly.ts",
);
const runtime = load("src/simulations/runtime/session.ts");
const { useAssemblyStore } = load("src/simulations/runtime/assemblySession.ts");
const { parseConfiguration, parseTeachingIntent } = load(
  "scripts/compatibility/legacyConfiguration.ts",
);
const { validateContext } = load("src/simulations/runtime/legacyPlan.ts");
const ref = (name) => `prefabs/chemistry/${name}`;
const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) <= 1e-9 + 1e-6 * Math.abs(expected),
    `${actual} != ${expected}`,
  );
const activate = (assembly) => {
  const result = runtime.executePlan({
    schemaVersion: 1,
    operation: "create",
    composition: { ref: "assemblies/GeneratedExperiment", version: 1 },
    parameters: {},
    assembly,
    message: "Development fixture",
  });
  assert.ok(result.accepted, result.error);
};
const dispatch = (type, value, target = "object/first") =>
  runtime.dispatchCommand("assembly", {
    type,
    target,
    ...(value === undefined ? {} : { value }),
  });
const apply = (...args) => {
  const result = dispatch(...args);
  assert.ok(result.accepted, result.error);
};
const output = (i = 0) => useAssemblyStore.getState().instances[i].outputs;
const snapshot = () => structuredClone(runtime.getDiagnosticSnapshot());
const rejected = (...args) => {
  const before = snapshot();
  assert.equal(dispatch(...args).accepted, false);
  assert.deepEqual(snapshot(), before);
};
for (const model of chemistry.models) {
  assert.equal(assemblyCapability(model).ref, model.ref);
  assert.equal(compileAssembly(defaultAssembly(model.ref)).instances.length, 1);
}
activate(defaultAssembly(ref("Dilution")));
assert.deepEqual(output(), { saltMass: 10, volume: 1, concentration: 10 });
apply("CHEM_ADD_WATER", 1);
assert.deepEqual(output(), { saltMass: 10, volume: 2, concentration: 5 });
for (const bad of [
  0,
  -1,
  Infinity,
  NaN,
  "1 litre",
  { value: 1, unit: "mL" },
  1000,
])
  rejected("CHEM_ADD_WATER", bad);
apply("RESET", undefined, "session");
assert.deepEqual(output(), { saltMass: 10, volume: 1, concentration: 10 });
const zeroSalt = defaultAssembly(ref("Dilution"));
zeroSalt.instances[0].parameters = { saltMass: 0, volume: 3 };
activate(zeroSalt);
near(output().concentration, 0);
for (const parameters of [
  { volume: 0 },
  { volume: -1 },
  { saltMass: -1 },
  { volume: 1, unit: "mL" },
]) {
  const a = defaultAssembly(ref("Dilution"));
  a.instances[0].parameters = parameters;
  const before = snapshot();
  assert.throws(() => compileAssembly(a));
  assert.deepEqual(snapshot(), before);
}

activate(defaultAssembly(ref("Conservation")));
validateContext(runtime.getExperimentContext());
assert.equal(output().equation, "H₂ + O₂ → H₂O");
assert.equal(output().balanced, false);
assert.deepEqual(output().atoms, [
  { element: "H", left: 2, right: 2, conserved: true },
  { element: "O", left: 2, right: 1, conserved: false },
]);
apply("CHEM_BALANCE");
validateContext(runtime.getExperimentContext());
assert.equal(output().equation, "2H₂ + O₂ → 2H₂O");
assert.deepEqual(output().atoms, [
  { element: "H", left: 4, right: 4, conserved: true },
  { element: "O", left: 2, right: 2, conserved: true },
]);
assert.equal(output().balanced, true);
apply("CHEM_SET_COEFFICIENTS", [4, 2, 4]);
assert.equal(output().balanced, true);
apply("CHEM_BALANCE");
assert.deepEqual(
  useAssemblyStore.getState().instances[0].state.coefficients,
  [2, 1, 2],
);
apply("CHEM_SET_COEFFICIENTS", [1, 2, 1]);
assert.equal(output().balanced, false);
for (const values of [[0, 1, 1], [1.5, 1, 1], [1, 1], [13, 1, 1], "2,1,2"])
  rejected("CHEM_SET_COEFFICIENTS", values);
apply("RESET", undefined, "session");
assert.equal(output().balanced, false);
const carbon = defaultAssembly(ref("Conservation"));
carbon.instances[0].parameters = {
  reactionId: "carbonDioxide",
  coefficients: [3, 2, 1],
};
activate(carbon);
apply("CHEM_BALANCE");
assert.equal(output().equation, "C + O₂ → CO₂");
assert.equal(output().balanced, true);
const arbitrary = defaultAssembly(ref("Conservation"));
arbitrary.instances[0].parameters = { reactionId: "CH4 + O2" };
assert.throws(() => compileAssembly(arbitrary));

activate(defaultAssembly(ref("ReactionRate")));
near(output().rateConstant, 0.1);
near(output().halfLife, 6.931471805599453);
near(output().concentrationA, 1);
near(output().concentrationB, 0);
useAssemblyStore.getState().step(2);
near(output().elapsed, 0); // initially paused
apply("CHEM_STEP_RATE");
near(output().concentrationA, 0.9048374180359595);
apply("CHEM_SET_RATE_PLAYING", true);
useAssemblyStore.getState().step(1);
near(output().elapsed, 2);
near(output().concentrationA, 0.8187307530779818);
rejected("CHEM_STEP_RATE");
apply("CHEM_SET_TEMPERATURE", 320);
near(output().elapsed, 0);
near(output().concentrationA, 1);
// Independent 50-digit Python Decimal calculation using R=8.314, retained as constants.
near(output().rateConstant, 0.2724610262406092);
near(output().halfLife, 2.5440232319606326);
near(output().comparisonTemperature, 300);
near(output().comparisonHalfLife, 6.931471805599453);
assert.ok(output().halfLife < output().comparisonHalfLife);
for (const t of [0.01, 0.1, 1, 10, 20]) {
  useAssemblyStore.getState().step(t);
  near(output().concentrationA + output().concentrationB, 1);
  assert.ok(output().concentrationA >= 0 && output().concentrationB >= 0);
}
near(output().elapsed, 30);
assert.equal(output().playing, false);
apply("CHEM_RESTART_RATE");
near(output().elapsed, 0);
near(output().temperature, 320);
rejected("CHEM_SET_TEMPERATURE", 0);
rejected("CHEM_SET_TEMPERATURE", "320 kelvin");
rejected("CHEM_SET_RATE_PLAYING", 1);
apply("RESET", undefined, "session");
near(output().temperature, 300);
near(output().elapsed, 0);
for (const temperature of [250, 400]) {
  apply("CHEM_SET_TEMPERATURE", temperature);
  assert.ok(Number.isFinite(output().halfLife));
  for (let i = 0; i < 25; i++)
    near(output().points[i].y + output().productPoints[i].y, 1);
}
// Same elapsed time, independent of frame partition.
const rateModel = chemistry.models.find((m) => m.ref === ref("ReactionRate"));
let state = rateModel.apply(
  rateModel.initialize(rateModel.defaults),
  "CHEM_SET_RATE_PLAYING",
  true,
);
const whole = rateModel.step(state, 5);
for (let i = 0; i < 100; i++) state = rateModel.step(state, 0.05);
near(
  rateModel.measure(state).concentrationA,
  rateModel.measure(whole).concentrationA,
);

// Structure-changing assembly and planner configuration fixtures; no model inference is substituted or claimed.
const config = parseConfiguration(
  JSON.stringify({
    schemaVersion: 1,
    outcome: "configuration",
    confirmedComposition: ref("ReactionRate"),
    title: "Compare temperatures",
    learningGoal: "Compare the same reaction at two temperatures",
    objects: [300, 320].map((temperature, i) => ({
      id: `reaction/run${i}`,
      label: `${temperature} K`,
      parameters: { temperature },
      observations: [...rateModel.requiredObservations],
    })),
  }),
  ref("ReactionRate"),
  "graph",
  "comparison",
);
activate(config.plan.assembly);
validateContext(runtime.getExperimentContext());
assert.equal(useAssemblyStore.getState().instances.length, 2);
apply("CHEM_SET_TEMPERATURE", 350, "reaction/run1");
near(output(0).temperature, 300);
near(output(1).temperature, 350);
const beforeBatch = snapshot();
assert.equal(
  runtime.dispatchBatch("assembly", [
    { type: "CHEM_SET_TEMPERATURE", target: "reaction/run0", value: 320 },
    { type: "CHEM_SET_TEMPERATURE", target: "reaction/run1", value: -1 },
  ]).accepted,
  false,
);
assert.deepEqual(snapshot(), beforeBatch);
apply("RESET", undefined, "session");
near(output(1).temperature, 320);
const saved = runtime.saveRecipe();
runtime.disposeSession();
runtime.loadRecipe(saved);
assert.equal(useAssemblyStore.getState().instances.length, 2);
near(output(1).temperature, 320);

// Registered-name annotations are accepted, but model-written values never become outputs.
const annotated = {
  schemaVersion: 1,
  outcome: "configuration",
  confirmedComposition: ref("Dilution"),
  title: "Dilution",
  learningGoal: "Observe salt conservation",
  objects: [
    {
      id: "beaker/first",
      label: "Salt water",
      parameters: { saltMass: 10, volume: 1 },
      observations: ["saltMass=999g", "volume: 200L", "concentration=987g/L"],
    },
  ],
};
const annotationConfig = parseConfiguration(
  JSON.stringify(annotated),
  ref("Dilution"),
);
assert.deepEqual(
  parseConfiguration(`${JSON.stringify(annotated)}]"}`, ref("Dilution")),
  annotationConfig,
);
assert.throws(() =>
  parseConfiguration(`${JSON.stringify(annotated)} {}`, ref("Dilution")),
);
assert.throws(() =>
  parseConfiguration(
    `${JSON.stringify(annotated)} arbitrary prose`,
    ref("Dilution"),
  ),
);
assert.throws(() =>
  parseConfiguration(`${JSON.stringify(annotated)}]]]]]`, ref("Dilution")),
);
assert.deepEqual(
  compileAssembly(annotationConfig.plan.assembly).instances[0].outputs,
  { saltMass: 10, volume: 1, concentration: 10 },
);
annotated.objects[0].observations[0] = "inventedMass=10g";
assert.throws(() =>
  parseConfiguration(JSON.stringify(annotated), ref("Dilution")),
);

// Intent aliases never admit missing executable providers or invented mechanisms.
const referenceIntent = {
  schemaVersion: 1,
  kind: "create",
  learningGoal: "Compare reaction temperatures",
  representation: "prefabs/physical-systems/ReactionRate",
  relationship: "Temperature changes the rate",
  initialExample: "Two independent runs at 300 K and 320 K",
  interactions: ["Change temperature"],
  observations: ["Compare half-lives"],
  playing: false,
  explanation: "One illustrative first-order reaction",
  assumptions: ["A to B"],
};
const normalizedReferences = [];
assert.equal(
  parseTeachingIntent(JSON.stringify(referenceIntent), (supplied, canonical) =>
    normalizedReferences.push({ supplied, canonical }),
  ).representation,
  ref("ReactionRate"),
);
assert.deepEqual(normalizedReferences, [
  { supplied: referenceIntent.representation, canonical: ref("ReactionRate") },
]);
for (const representation of [
  "prefabs/physical-systems/UnknownReaction",
  "systems/chemistry/ReactionRate",
  "prefabs/../../ReactionRate",
])
  assert.throws(() =>
    parseTeachingIntent(JSON.stringify({ ...referenceIntent, representation })),
  );
const missingProvider = structuredClone(defaultAssembly(ref("ReactionRate")));
missingProvider.instances[0].prefab.ref = referenceIntent.representation;
assert.throws(() => compileAssembly(missingProvider));

// Semantic render smoke check, separate from browser/accessibility acceptance.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { ChemistryLesson } = load(
  "src/simulations/components/views/chemistry/ChemistryLesson.tsx",
);
for (const model of chemistry.models) {
  const instance = compileAssembly(defaultAssembly(model.ref)).instances[0];
  const html = renderToStaticMarkup(
    React.createElement(ChemistryLesson, {
      instance,
      dispatch: () => ({ accepted: true }),
    }),
  );
  assert.ok(html.includes("Reset experiment"));
  assert.ok(html.includes("Model assumptions"));
  if (model === chemistry.models[0])
    assert.ok(html.includes("Add 1 L of water"));
  if (model === chemistry.models[1])
    assert.ok(html.includes("Atoms on each side"));
  if (model === chemistry.models[2]) assert.ok(html.includes("Time (s)"));
}
runtime.disposeSession();
console.log(
  "Chemistry: numerical, validation, atomic commands, reset, clock, independent instances, persistence, planner schema and semantic render checks passed (actual integrated registry; development checks, no live acceptance).",
);
