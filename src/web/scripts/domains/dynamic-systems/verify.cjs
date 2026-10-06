const assert = require("node:assert/strict");
const { load } = require("./loader.cjs");
const { dynamicSystems } = load(
  "src/simulations/domains/dynamic-systems/index.ts",
);
const { defaultAssembly, compileAssembly, assemblyCapability } = load(
  "src/simulations/runtime/assembly.ts",
);
const runtime = load("src/simulations/runtime/session.ts");
const { useAssemblyStore } = load("src/simulations/runtime/assemblySession.ts");
const { simulateQueue } = load(
  "src/simulations/components/systems/dynamic-systems/models.ts",
);
const ref = (name) => `prefabs/dynamic-systems/${name}`;
const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
const activate = (assembly) => {
  const result = runtime.executePlan({
    schemaVersion: 1,
    operation: "create",
    composition: { ref: "assemblies/GeneratedExperiment", version: 1 },
    parameters: {},
    assembly,
    message: "Dynamic systems development fixture",
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
const output = (index = 0) =>
  useAssemblyStore.getState().instances[index].outputs;
const snapshot = () => structuredClone(runtime.getDiagnosticSnapshot());
const reject = (...args) => {
  const before = snapshot();
  assert.equal(dispatch(...args).accepted, false);
  assert.deepEqual(snapshot(), before);
};

for (const model of dynamicSystems.models) {
  assert.equal(assemblyCapability(model).ref, model.ref);
  assert.equal(compileAssembly(defaultAssembly(model.ref)).instances.length, 1);
}

activate(defaultAssembly(ref("CompoundGrowth")));
near(output().compoundTotal, 100 * 1.05 ** 10);
near(output().simpleTotal, 150);
apply("GROW_SET_RATE", 0);
near(output().compoundTotal, 100);
near(output().simpleTotal, 100);
apply("GROW_SET_SCENARIO", { annualRate: 0.1, years: 2 });
near(output().compoundTotal, 121);
near(output().simpleTotal, 120);
reject("GROW_SET_RATE", -0.1);
reject("GROW_SET_YEARS", 2.5);
reject("GROW_SET_SCENARIO", { annualRate: 0.1 });
apply("RESET", undefined, "session");
near(output().annualRate, 0.05);
near(output().years, 10);

activate(defaultAssembly(ref("RingTraffic")));
const initialTraffic = structuredClone(output());
assert.equal(initialTraffic.vehicleCount, 22);
assert.ok(initialTraffic.vehicles.every((vehicle) => vehicle.speed >= 0));
apply("TRAFFIC_BRAKE");
const waveVehicles = [];
for (let i = 0; i < 240; i++) {
  useAssemblyStore.getState().step(0.05);
  if ((i + 1) % 40 === 0)
    waveVehicles.push(
      [...output().vehicles].sort((a, b) => a.speed - b.speed)[0].id,
    );
}
assert.equal(output().vehicleCount, 22);
assert.ok(output().minimumSpeed < initialTraffic.minimumSpeed * 0.75);
assert.ok(
  output().vehicles.every(
    (vehicle) =>
      Number.isFinite(vehicle.position) &&
      vehicle.position >= 0 &&
      vehicle.position < 260 &&
      vehicle.speed >= 0,
  ),
);
assert.ok(output().minimumGap >= -0.05, `overlap: ${output().minimumGap}`);
for (let i = 1; i < waveVehicles.length; i++) {
  const backwardVehicleSteps =
    (waveVehicles[i - 1] - waveVehicles[i] + 22) % 22;
  assert.ok(
    backwardVehicleSteps >= 1 && backwardVehicleSteps <= 4,
    `slow region did not travel backward: ${waveVehicles.join(",")}`,
  );
}
const disturbed = structuredClone(output().vehicles);
apply("RESET", undefined, "session");
apply("TRAFFIC_BRAKE");
for (let i = 0; i < 240; i++) useAssemblyStore.getState().step(0.05);
assert.deepEqual(output().vehicles, disturbed);
apply("TRAFFIC_SET_HEADWAY", 1.8);
near(output().desiredHeadway, 1.8);
assert.equal(output().vehicleCount, 22);
reject("TRAFFIC_SET_HEADWAY", 0);
apply("TRAFFIC_SET_PLAYING", false);
const elapsed = output().elapsed;
useAssemblyStore.getState().step(1);
near(output().elapsed, elapsed);
apply("TRAFFIC_STEP");
near(output().elapsed, elapsed + 0.25, 1e-8);

const fixture = [0, 1, 2].map((id) => ({ id, arrival: 0, service: 1 }));
assert.deepEqual(
  simulateQueue(fixture, 1, 10).rows.map((row) => row.wait),
  [0, 1, 2],
);
assert.deepEqual(
  simulateQueue(fixture, 2, 10).rows.map((row) => row.wait),
  [0, 0, 1],
);
activate(defaultAssembly(ref("CheckoutQueue")));
const oneCashier = structuredClone(output());
assert.equal(
  oneCashier.arrivals,
  oneCashier.completed + oneCashier.waiting + oneCashier.inService,
);
const schedule = oneCashier.customers.map(({ id, arrival, service }) => ({
  id,
  arrival,
  service,
}));
apply("QUEUE_SET_CASHIERS", 2);
const twoCashiers = output();
assert.deepEqual(
  twoCashiers.customers.map(({ id, arrival, service }) => ({
    id,
    arrival,
    service,
  })),
  schedule,
);
assert.ok(twoCashiers.averageWait <= oneCashier.averageWait);
assert.equal(
  twoCashiers.arrivals,
  twoCashiers.completed + twoCashiers.waiting + twoCashiers.inService,
);
assert.ok(twoCashiers.customers.every((customer) => customer.wait >= 0));
for (let i = 1; i < twoCashiers.customers.length; i++)
  assert.ok(
    twoCashiers.customers[i].start >= twoCashiers.customers[i - 1].start,
    "FIFO start order changed",
  );
reject("QUEUE_SET_CASHIERS", 3);
apply("RESET", undefined, "session");
assert.equal(output().cashiers, 1);

// Structural variant: compare the default ring with a lower-density independent ring.
const trafficModel = dynamicSystems.models.find(
  (model) => model.ref === ref("RingTraffic"),
);
const comparison = defaultAssembly(ref("RingTraffic"));
comparison.instances.push({
  id: "traffic/lower-density",
  label: "Lower-density control",
  prefab: { ref: ref("RingTraffic"), version: 1 },
  parameters: { vehicleCount: 12 },
});
for (const observation of comparison.observations.filter(
  (item) => item.instance === "object/first",
)) {
  const copy = {
    ...observation,
    id: `${observation.id}/control`,
    instance: "traffic/lower-density",
  };
  comparison.observations.push(copy);
  comparison.connections.push({
    type: "observation-source",
    from: { instance: copy.instance, output: copy.output },
    to: copy.id,
  });
  for (const view of comparison.views) view.observations.push(copy.id);
}
for (const control of comparison.controls.filter(
  (item) => item.instance === "object/first",
))
  comparison.controls.push({ ...control, instance: "traffic/lower-density" });
activate(comparison);
assert.equal(useAssemblyStore.getState().instances.length, 2);
apply("TRAFFIC_BRAKE", undefined, "object/first");
assert.equal(output(1).disturbanceActive, false);
assert.equal(trafficModel.maximumInstances, 2);

// Semantic render smoke test. Browser/live-model acceptance is separate.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { DynamicSystemsLesson } = load(
  "src/simulations/components/views/dynamic-systems/DynamicSystemsLesson.tsx",
);
for (const model of dynamicSystems.models) {
  const instance = compileAssembly(defaultAssembly(model.ref)).instances[0];
  const html = renderToStaticMarkup(
    React.createElement(DynamicSystemsLesson, {
      instance,
      dispatch: () => ({ accepted: true }),
    }),
  );
  assert.ok(html.includes("Reset experiment"));
  assert.ok(html.includes("Exact settings and model assumptions"));
}
runtime.disposeSession();
console.log(
  "Dynamic systems: formulas, IDM ring, disturbance, fixed seed, FIFO fixture, controlled cashier comparison, validation, reset, structure and semantic render checks passed (development overlay; no live acceptance).",
);
