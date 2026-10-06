const assert = require("node:assert/strict");
const overlay = process.argv.includes("--overlay");
const { load } = require(
  overlay ? "./integration-loader.cjs" : "../../test-loader.cjs",
);
const runtime = load("src/simulations/runtime/session.ts");
const { defaultAssembly, compileAssembly, assemblyModels, assemblyCapability } =
  load("src/simulations/runtime/assembly.ts");
const { useAssemblyStore } = load("src/simulations/runtime/assemblySession.ts");
const { parseConfiguration } = load(
  "scripts/compatibility/legacyConfiguration.ts",
);
const { validatePhysicalComparison } = load(
  "src/simulations/domains/physical-systems/index.ts",
);
const ref = (name) => `prefabs/physical-systems/${name}`;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
assert.ok(
  assemblyModels.some((m) => m.ref === ref("Pendulum")),
  "Agent A registry integration is pending; use --overlay for development checks.",
);
const output = (index = 0) =>
  useAssemblyStore.getState().instances[index].outputs;
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
const command = (type, value, target = "object/first") => {
  const result = runtime.dispatchCommand("assembly", {
    type,
    target,
    ...(value === undefined ? {} : { value }),
  });
  assert.ok(result.accepted, result.error);
};
const comparison = (name, secondParameters) => {
  const model = assemblyModels.find((m) => m.ref === ref(name));
  const config = parseConfiguration(
    JSON.stringify({
      schemaVersion: 1,
      outcome: "configuration",
      confirmedComposition: ref(name),
      title: "Compare independent objects",
      learningGoal: "Change one input and compare.",
      objects: [
        {
          id: "object/first",
          label: "First",
          parameters: {},
          observations: [...model.requiredObservations],
        },
        {
          id: "object/second",
          label: "Second",
          parameters: secondParameters,
          observations: [...model.requiredObservations],
        },
      ],
    }),
    ref(name),
    "measurements",
    "comparison",
  );
  return config.plan.assembly;
};
try {
  for (const model of assemblyModels.filter((m) =>
    m.ref.startsWith("prefabs/physical-systems/"),
  ))
    assemblyCapability(model);
  const pendulums = comparison("Pendulum", { length: 2 });
  activate(pendulums);
  near(output().period, 2.0060666807106475);
  near(output(1).period, 2.837006706885775);
  command("PEND_SET_LENGTH", 4, "object/second");
  near(output(1).period / output().period, 2);
  near(useAssemblyStore.getState().instances[0].parameters.length, 1);
  command("PHYS_PLAY", false, "object/second");
  useAssemblyStore.getState().step(3);
  near(output(1).elapsed, 0);
  near(output().elapsed, 3);
  command("RESET", undefined, "session");
  near(output(1).period, 2.837006706885775);
  near(output().elapsed, 0);
  const triple = structuredClone(pendulums);
  triple.instances.push({
    id: "object/third",
    label: "Third swing",
    prefab: { ref: ref("Pendulum"), version: 1 },
    parameters: { length: 4 },
  });
  for (const o of pendulums.observations.filter(
    (o) => o.instance === "object/first",
  )) {
    const third = { ...o, id: `${o.id}/third`, instance: "object/third" };
    triple.observations.push(third);
    triple.connections.push({
      type: "observation-source",
      from: { instance: third.instance, output: third.output },
      to: third.id,
    });
    for (const view of triple.views) view.observations.push(third.id);
  }
  for (const c of pendulums.controls.filter(
    (c) => c.instance === "object/first",
  ))
    triple.controls.push({ ...c, instance: "object/third" });
  activate(triple);
  assert.equal(useAssemblyStore.getState().instances.length, 3);
  near(output(2).period / output().period, 2);
  command("PEND_SET_LENGTH", 3, "object/second");
  near(output(2).period / output().period, 2);
  validatePhysicalComparison(useAssemblyStore.getState().instances);
  const mismatched = structuredClone(useAssemblyStore.getState().instances);
  mismatched[1].parameters.gravity = 5;
  assert.throws(() => validatePhysicalComparison(mismatched));
  const graph = defaultAssembly(ref("Pendulum"));
  graph.views.push({
    ref: "views/AssemblyGraph",
    observations: ["observe/points"],
  });
  compileAssembly(graph);
  activate(comparison("RollingTrack", { resistance: 0.1 }));
  near(output().stoppingDistance, 10);
  near(output(1).stoppingDistance, 5);
  command("ROLL_SET_RESISTANCE", 0.2, "object/second");
  near(output(1).stoppingDistance, 2.5);
  command("ROLL_SET_RESISTANCE", 0, "object/second");
  assert.equal(output(1).stoppingDistance, null);
  command("PHYS_PLAY", true, "object/second");
  useAssemblyStore.getState().step(10);
  assert.ok(output(1).distance > 30);
  assert.equal(output(1).stopped, false);
  command("RESET", undefined, "session");
  near(output(1).stoppingDistance, 5);
  near(output(1).distance, 0);
  activate(defaultAssembly(ref("ResistiveCircuit")));
  near(output().totalCurrent, 0.5);
  command("CIRC_ADD_BULB");
  near(output().totalCurrent, 0.25);
  near(output().bulbPower, 0.75);
  command("CIRC_SET_TOPOLOGY", "parallel");
  near(output().totalCurrent, 1);
  near(output().bulbPower, 3);
  const before = runtime.getDiagnosticSnapshot();
  const rejected = runtime.dispatchBatch("assembly", [
    { type: "CIRC_ADD_BULB", target: "object/first" },
    { type: "CIRC_SET_RESISTANCE", target: "object/first", value: 0 },
  ]);
  assert.equal(rejected.accepted, false);
  assert.deepEqual(runtime.getDiagnosticSnapshot(), before);
  command("RESET", undefined, "session");
  near(output().totalCurrent, 0.5);
  const saved = runtime.saveRecipe();
  runtime.disposeSession();
  runtime.loadRecipe(saved);
  near(output().totalCurrent, 0.5);
  for (const mutate of [
    (a) => (a.instances[0].parameters.topology = "short"),
    (a) => (a.instances[0].parameters.resistance = 0),
    (a) => (a.observations[0].unit = "m"),
    (a) => (a.controls[0].action = "PEND_SET_LENGTH"),
    (a) => a.instances.push(structuredClone(a.instances[0])),
  ]) {
    const bad = defaultAssembly(ref("ResistiveCircuit"));
    mutate(bad);
    const previous = runtime.getDiagnosticSnapshot();
    assert.throws(() => compileAssembly(bad));
    assert.deepEqual(runtime.getDiagnosticSnapshot(), previous);
  }
  console.log(
    `Agent B: actual compiler/session lifecycle, schema, instance edit, structural variant and batch atomicity checks passed (${overlay ? "in-memory registry overlay; development only" : "integrated registry"}). No live prompt acceptance claimed.`,
  );
} finally {
  runtime.disposeSession();
}
