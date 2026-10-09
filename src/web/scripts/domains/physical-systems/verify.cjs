const assert = require("node:assert/strict");
const { idealPendulumPeriod } = require("../../generation/pendulum-oracle.cjs");
const { load } = require("../../test-loader.cjs");
const {
  physicalSystems,
  pendulumModel: pendulum,
  trackModel: track,
  circuitModel: circuit,
} = load("src/simulations/domains/physical-systems/index.ts");
const systems = load(
  "src/simulations/components/systems/physical-systems/models.ts",
);
const { validateValue } = load("src/simulations/runtime/parameterSchema.ts");
const near = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-10 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const create = (m, p = {}) => {
  validateValue(m.parameters, p);
  return m.initialize({
    ...m.defaults,
    ...(m === pendulum ? { length: 1, amplitude: 5 } : {}),
    ...p,
  });
};
const apply = (m, s, a, v) => {
  validateValue(m.actions[a].arguments, v === undefined ? {} : { value: v });
  return m.apply(s, a, v);
};
function finite(v) {
  if (typeof v === "number") assert.ok(Number.isFinite(v));
  else if (v && typeof v === "object") Object.values(v).forEach(finite);
}
for (const m of physicalSystems.models) {
  const out = m.measure(create(m));
  assert.deepEqual(Object.keys(out).sort(), Object.keys(m.outputs).sort());
  finite(out);
  assert.ok(m.requiredObservations.every((k) => k in out));
}
// Independent numeric oracles from the contract; these are development tests only.
let p = create(pendulum),
  second = create(pendulum, { length: 2 });
near(pendulum.measure(p).period, idealPendulumPeriod(1, 9.81, 5));
near(pendulum.measure(second).period, idealPendulumPeriod(2, 9.81, 5));
second = apply(pendulum, second, "PEND_SET_LENGTH", 4);
near(pendulum.measure(second).period / pendulum.measure(p).period, 2);
near(pendulum.measure(p).x, 0.08715574274765817);
p = pendulum.step(p, 2.1);
near(pendulum.measure(p).lastPeriod, idealPendulumPeriod(1, 9.81, 5));
assert.equal(pendulum.measure(p).cycles, 1);
let chunked = create(pendulum);
for (let i = 0; i < 300; i++) chunked = pendulum.step(chunked, 0.01);
const single = pendulum.step(create(pendulum), 3);
near(chunked.elapsed, single.elapsed);
near(pendulum.measure(chunked).angle, pendulum.measure(single).angle);
const paused = apply(pendulum, single, "PHYS_PLAY", false);
assert.deepEqual(pendulum.step(paused, 30), paused);
near(apply(pendulum, paused, "PHYS_STEP").elapsed, 3.1);
const restarted = apply(pendulum, paused, "PHYS_RESTART");
near(restarted.elapsed, 0);
near(pendulum.measure(restarted).angle, 5);
assert.equal(restarted.playing, false);
assert.throws(() => apply(pendulum, create(pendulum), "PHYS_STEP"));
for (const params of [{ amplitude: 91 }, { length: 0 }, { gravity: 0 }])
  assert.throws(() => create(pendulum, params));
for (const dt of [NaN, -1])
  assert.throws(() => pendulum.step(create(pendulum), dt));
// Nonlinear amplitude, trajectory, periodicity and independent RK4 equation oracle.
for (const amplitude of [0, 5, 30, 60, 90]) {
  const initial = create(pendulum, { amplitude });
  const period = pendulum.measure(initial).period;
  near(period, idealPendulumPeriod(1, 9.81, amplitude));
  near(pendulum.measure({ ...initial, elapsed: period / 4 }).angle, 0);
  near(pendulum.measure({ ...initial, elapsed: period / 2 }).angle, -amplitude);
  let angle = (amplitude * Math.PI) / 180,
    velocity = 0;
  const duration = period * 0.37,
    dt = duration / 10000;
  for (let i = 0; i < 10000; i++) {
    const a1 = velocity,
      v1 = -9.81 * Math.sin(angle);
    const a2 = velocity + (dt * v1) / 2,
      v2 = -9.81 * Math.sin(angle + (dt * a1) / 2);
    const a3 = velocity + (dt * v2) / 2,
      v3 = -9.81 * Math.sin(angle + (dt * a2) / 2);
    const a4 = velocity + dt * v3,
      v4 = -9.81 * Math.sin(angle + dt * a3);
    angle += (dt * (a1 + 2 * a2 + 2 * a3 + a4)) / 6;
    velocity += (dt * (v1 + 2 * v2 + 2 * v3 + v4)) / 6;
  }
  const measured = pendulum.measure({ ...initial, elapsed: duration }).angle;
  assert.ok(Math.abs(measured - (angle * 180) / Math.PI) < 0.00001);
  assert.ok(Math.abs(measured) <= amplitude);
}
assert.ok(
  pendulum.measure(create(pendulum, { amplitude: 90 })).period >
    pendulum.measure(create(pendulum, { amplitude: 5 })).period * 1.17,
);
// Structural variant: three independently editable pendulums, no snapshot duplication.
const trio = [1, 2, 4].map((length) => create(pendulum, { length }));
const first = structuredClone(trio[0]);
trio[1] = apply(pendulum, trio[1], "PEND_SET_LENGTH", 3);
assert.deepEqual(trio[0], first);
assert.equal(trio[2].length, 4);
near(
  pendulum.measure(trio[1]).period / pendulum.measure(trio[0]).period,
  Math.sqrt(3),
);
let smooth = create(track),
  rough = create(track, { resistance: 0.1 });
near(track.measure(smooth).entrySpeed, 3.132091952673165);
near(track.measure(smooth).stoppingDistance, 10);
near(track.measure(rough).stoppingDistance, 5);
rough = apply(track, rough, "ROLL_SET_RESISTANCE", 0.2);
near(track.measure(rough).stoppingDistance, 2.5);
near(track.measure(rough).entrySpeed, 3.132091952673165);
smooth = apply(track, smooth, "PHYS_PLAY", true);
const midway = track.measure(track.step(smooth, 2));
near(midway.distance, 5.28318390534633);
near(midway.speed, 2.151091952673165);
const stopped = track.measure(track.step(smooth, 100));
near(stopped.distance, 10);
near(stopped.speed, 0);
assert.equal(stopped.stopped, true);
const coast = track.measure(
  track.step(create(track, { resistance: 0, playing: true }), 100),
);
assert.equal(coast.stoppingDistance, null);
assert.equal(coast.stopTime, null);
assert.equal(coast.stopped, false);
near(coast.distance, 313.2091952673165);
near(coast.speed, 3.132091952673165);
finite(coast);
const rerun = apply(track, track.step(smooth, 3), "PHYS_RESTART");
near(track.measure(rerun).distance, 0);
assert.ok(track.measure(rerun).points.every((p) => p.x === 0));
assert.throws(() => create(track, { resistance: -0.1 }));
assert.throws(() => apply(track, smooth, "ROLL_SET_HEIGHT", 0));
let c = create(circuit);
near(circuit.measure(c).totalCurrent, 0.5);
near(circuit.measure(c).bulbPower, 3);
c = apply(circuit, c, "CIRC_ADD_BULB");
near(circuit.measure(c).totalCurrent, 0.25);
near(circuit.measure(c).bulbPower, 0.75);
assert.equal(circuit.measure(c).bulbReadings.length, 2);
c = apply(circuit, c, "CIRC_SET_TOPOLOGY", "parallel");
near(circuit.measure(c).totalCurrent, 1);
near(circuit.measure(c).bulbPower, 3);
near(circuit.measure(c).totalPower, 6);
assert.equal(systems.circuitWires(c).length, 4);
const wires = systems.circuitWires({ ...c, topology: "series" });
assert.equal(wires.length, 3);
assert.deepEqual(wires[1], {
  type: "electrical-wire",
  from: { component: "bulb/1", port: "b" },
  to: { component: "bulb/2", port: "a" },
});
for (const params of [{ resistance: 0 }, { topology: "short" }, { bulbs: 1.5 }])
  assert.throws(() => create(circuit, params));
assert.throws(() => apply(circuit, c, "CIRC_SET_TOPOLOGY", "mesh"));
assert.throws(() =>
  apply(circuit, create(circuit, { bulbs: 8 }), "CIRC_ADD_BULB"),
);
for (const topology of ["series", "parallel"])
  for (const bulbs of [1, 2, 8]) {
    const state = create(circuit, { topology, bulbs }),
      out = circuit.measure(state);
    near(
      out.bulbReadings.reduce((sum, b) => sum + b.power, 0),
      out.totalPower,
    );
    assert.equal(
      systems.circuitWires(state).length,
      topology === "series" ? bulbs + 1 : 2 * bulbs,
    );
    finite(out);
  }
const snapshot = structuredClone(c);
assert.throws(() => circuit.apply(c, "CIRC_SET_RESISTANCE", 0));
assert.deepEqual(c, snapshot);
near(circuit.measure(create(circuit, { voltage: 0 })).totalCurrent, 0);
console.log(
  "Agent B: numerical, frame-rate, pause/restart, independent-instance, typed-topology and invalid-input checks passed.",
);
