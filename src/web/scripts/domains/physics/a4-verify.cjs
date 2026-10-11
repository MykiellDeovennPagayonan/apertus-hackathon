const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const { coolingModel: m } = load(
  "src/simulations/domains/physics/thermalOptics.ts",
);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
near(m.measure(m.initialize({ time: 10 })).temperature, 56.391839582758);
near(
  m.measure(m.initialize({ ambient: 30, time: 10 })).temperature,
  60.32653298563167,
);
for (const ambient of [0, 20, 50])
  for (const initial of [0, 80, 100])
    for (const time of [0, 10, 240]) {
      const s = m.initialize({ ambient, initial, time }),
        o = m.measure(s);
      assert.ok(
        o.temperature >= Math.min(initial, ambient) &&
          o.temperature <= Math.max(initial, ambient),
      );
      near(o.rate, -s.coefficient * (o.temperature - ambient));
      assert.deepEqual(
        m.initialize(JSON.parse(JSON.stringify(m.configuration(s)))),
        s,
      );
    }
for (const p of [
  { coefficient: 0 },
  { time: -1 },
  { ambient: NaN },
  { extra: 1 },
])
  assert.throws(() => m.initialize(p));
const s = m.initialize({});
assert.throws(() => m.apply(s, "UNKNOWN", 1));
assert.throws(() => m.apply(s, "PT_COOLING_TIME", -1));
assert.deepEqual(s, m.initialize({}));
near(m.apply(s, "PT_COOLING_TIME", 10).time, 10);
console.log(
  "A4 cooling reference, bounds, invariants, persistence and actions PASS",
);
const { thermalOptics: domain } = load(
  "src/simulations/domains/physics/thermalOptics.ts",
);
const model = (k) =>
    domain.models.find((m) => m.presentation === `physics-${k}`),
  state = (k, p = {}) => model(k).initialize(p),
  measure = (k, p = {}) => model(k).measure(state(k, p));
for (const m of domain.models) {
  const s = m.initialize({}),
    o = m.measure(s);
  assert.deepEqual(Object.keys(o).sort(), Object.keys(m.outputs).sort());
  for (const v of Object.values(o))
    if (typeof v === "number") assert.ok(Number.isFinite(v));
  assert.deepEqual(
    m.initialize(JSON.parse(JSON.stringify(m.configuration(s)))),
    s,
  );
  assert.throws(() => m.initialize({ extra: true }));
  assert.throws(() => m.apply(s, "UNKNOWN"));
  for (const [key, field] of Object.entries(m.parameters.properties))
    if (["number", "integer"].includes(field.type))
      for (const bad of [
        NaN,
        Infinity,
        field.minimum - 1,
        field.maximum + 1,
        "1",
      ])
        assert.throws(() => m.initialize({ [key]: bad }), `${m.ref}.${key}`);
  for (const [key, action] of Object.entries(m.actions)) {
    if (Object.keys(action.arguments.properties).length)
      assert.throws(() => m.apply(s, key, "nonsense"));
    else assert.throws(() => m.apply(s, key, 1));
  }
}
const cap = load("src/simulations/components/systems/physics/capacitor.ts"),
  cm = model("capacitor");
let cs = cm.apply(state("capacitor"), "PT_CAPACITOR_ADVANCE");
near(cs.voltage, 10 * (1 - Math.exp(-1)));
near(cm.measure(cs).timeConstant, 1);
const beforeVoltage = cs.voltage;
cs = cm.apply(cs, "PT_CAPACITOR_MODE", "isolate");
near(cs.voltage, beforeVoltage);
near(cm.measure(cs).current, 0);
cs = cap.capacitorAdvance(cs, 100);
near(cs.voltage, beforeVoltage);
cs = cm.apply(cs, "PT_CAPACITOR_MODE", "discharge");
near(cs.voltage, beforeVoltage);
cs = cm.apply(cs, "PT_CAPACITOR_ADVANCE");
near(cs.voltage, beforeVoltage * Math.exp(-1));
assert.ok(cm.measure(cs).energy < 0.5 * 0.0001 * beforeVoltage ** 2);
for (const mode of ["charge", "discharge", "isolate"])
  for (const voltage of [0, 5, 20]) {
    const s = state("capacitor", { mode, voltage });
    near(
      cap.capacitorAdvance(cap.capacitorAdvance(s, 0.4), 0.6).voltage,
      cap.capacitorAdvance(s, 1).voltage,
    );
  }
near(measure("lens").imageDistance, 15);
near(measure("lens").magnification, -0.5);
near(measure("lens", { distance: 5 }).imageDistance, -10);
near(measure("lens", { distance: 5 }).magnification, 2);
assert.equal(measure("lens", { distance: 10 }).imageDistance, null);
for (const distance of [1, 5, 9.999, 10.001, 20, 100]) {
  const o = measure("lens", { distance });
  near(1 / distance + 1 / o.imageDistance, 0.1);
  near(o.magnification, -o.imageDistance / distance);
}
const entryForIncidence = (angle) =>
  (Math.asin(1.5 * Math.sin(((90 - angle) * Math.PI) / 180)) * 180) / Math.PI;
near(measure("fibre").critical, 75.16488841802426);
assert.equal(measure("fibre", { entry: entryForIncidence(80) }).confined, true);
assert.equal(
  measure("fibre", { entry: entryForIncidence(70) }).confined,
  false,
);
assert.equal(measure("fibre", { core: 1.4, cladding: 1.5 }).critical, null);
assert.equal(measure("fibre", { core: 1.4, cladding: 1.5 }).confined, false);
for (const entry of [0, 15, 45, 80]) {
  const o = measure("fibre", { entry });
  assert.ok(o.reflectance >= 0 && o.reflectance <= 1);
  near(
    Math.sin((entry * Math.PI) / 180),
    1.5 * Math.sin((o.direction * Math.PI) / 180),
  );
  if (!o.confined)
    near(
      1.5 * Math.sin((o.incidence * Math.PI) / 180),
      1.45 * Math.sin((o.transmittedAngle * Math.PI) / 180),
    );
}
assert.throws(() => state("fibre", { external: 1.5, core: 1, entry: 80 }));
near(measure("doppler", { offset: 0, time: -1 }).received, 743.343653250774);
near(measure("doppler", { offset: 0, time: 1 }).received, 661.432506887052);
assert.equal(measure("doppler", { offset: 0, time: 0 }).received, null);
near(measure("doppler", { speed: 0 }).received, 700);
for (const time of [-5, -0.1, 0, 0.1, 5]) {
  const o = measure("doppler", { time });
  near(o.emissionTime + Math.hypot(20 * o.emissionTime, 10) / 343, time);
  assert.ok(o.received > 0);
}
const pitchLeft = measure("doppler", { time: -0.000001 }).received,
  pitchRight = measure("doppler", { time: 0.000001 }).received;
assert.ok(
  Math.abs(pitchLeft - pitchRight) < 0.001,
  "off-axis reception continuous",
);
near(measure("string").fundamental, 87.70580193070293);
near(
  measure("string", { length: 0.325 }).frequency,
  2 * measure("string").frequency,
);
const str = load("src/simulations/components/systems/physics/string.ts");
for (const harmonic of [1, 2, 6])
  for (const phase of [0, 0.25, 0.5]) {
    const s = state("string", { harmonic, phase });
    for (let i = 0; i <= harmonic; i++)
      assert.ok(
        Math.abs(str.stringDisplacement(s, (s.length * i) / harmonic)) < 1e-12,
      );
    near(
      model("string").measure(s).frequency,
      harmonic * measure("string").fundamental,
    );
  }
near(measure("turning").limit, 7.003570517957251);
near(
  measure("turning", { speed: 10 }).requiredForce,
  4 * measure("turning").requiredForce,
);
assert.equal(measure("turning", { speed: 10 }).feasible, false);
assert.equal(measure("turning", { speed: 0, friction: 0 }).feasible, true);
near(measure("latent", { time: 334 }).liquid, 1);
near(measure("latent", { time: 334 }).temperature, 0);
near(measure("latent", { time: 334 }).addedEnergy, 33400);
for (const specific of [
  -84000, -1, 0, 100, 333999, 334000, 500000, 752600, 1000000, 3008600, 3209600,
]) {
  const p = {
      mass: 0.1,
      initial: -40,
      power: 100,
      time: ((specific + 84000) * 0.1) / 100,
    },
    o = measure("latent", p);
  near(o.solid + o.liquid + o.vapour, 1);
  near(o.enthalpy, 0.1 * specific);
  const reconstructed =
    o.solid * 2100 * o.temperature +
    o.liquid * (334000 + 4186 * o.temperature) +
    o.vapour * (3008600 + 2010 * (o.temperature - 100));
  near(reconstructed, specific);
}
const ind = load("src/simulations/components/systems/physics/induction.ts");
near(measure("induction", { speed: 0 }).emf, 0);
for (const position of [-0.1, -0.02, 0, 0.02, 0.1]) {
  const s = state("induction", { position, speed: 0.04 }),
    o = model("induction").measure(s),
    h = 1e-6;
  const gradient =
    (measure("induction", { position: position + h }).flux -
      measure("induction", { position: position - h }).flux) /
    (2 * h);
  assert.ok(Math.abs(o.emf + 100 * gradient * 0.04) < 1e-8);
  near(o.emf, -measure("induction", { position, speed: -0.04 }).emf);
  near(
    o.emf,
    -measure("induction", { position, speed: 0.04, polarity: -1 }).emf,
  );
  near(o.dissipation, o.current ** 2 * 10);
}
// Integrate a prescribed path independently; emf integral equals -N change in per-turn flux.
const a = -0.02,
  b = -0.01,
  dt = 0.0001,
  speed = 0.1,
  N = 100,
  width = 0.02,
  peakFlux =
    0.002 /
    (Math.exp(-0.5 * (b / width) ** 2) - Math.exp(-0.5 * (a / width) ** 2));
let integral = 0;
for (let i = 0; i < 1000; i++)
  integral +=
    measure("induction", {
      position: a + (i + 0.5) * speed * dt,
      speed,
      width,
      peakFlux,
    }).emf * dt;
const delta =
  measure("induction", { position: b, width, peakFlux }).flux -
  measure("induction", { position: a, width, peakFlux }).flux;
near(delta, 0.002);
assert.ok(Math.abs(integral + N * delta) < 1e-8);
assert.ok(
  Math.abs(integral / 0.1 + 2) < 1e-7,
  "100turns .002Wb/.1s average -2V",
);
assert.throws(() =>
  ind.inductionAdvance(state("induction", { position: 0.3, speed: 0.1 })),
);
const cond = load("src/simulations/components/systems/physics/conduction.ts");
for (const boundary of ["bath", "insulated"])
  for (const time of [0, 10, 300]) {
    const s = state("conduction", { initial: 40, bath: 40, boundary, time }),
      t = cond.conductionProfile(s);
    for (const v of t) near(v, 40);
    near(model("conduction").measure(s).energyChange, 0);
  }
const profile = Array.from({ length: 32 }, (_, i) => 10 + i * 2),
  sum = profile.reduce((a, b) => a + b, 0);
const insulated = cond.conductionProfile(
  state("conduction", { boundary: "insulated", time: 100 }),
  32,
  profile,
);
assert.ok(
  Math.abs(insulated.reduce((a, b) => a + b, 0) - sum) < 1e-9,
  "insulated energy conserved",
);
const conduction = state("conduction", { time: 300 }),
  p32 = cond.conductionProfile(conduction, 32),
  p64 = cond.conductionProfile(conduction, 64),
  p128 = cond.conductionProfile(conduction, 128);
assert.ok(
  Math.abs(p64.at(-1) - p128.at(-1)) < Math.abs(p32.at(-1) - p64.at(-1)),
  "spatial convergence",
);
assert.ok(Math.abs(p64.at(-1) - p128.at(-1)) < 0.1);
assert.ok(
  measure("conduction", { time: 300 }).handle >
    measure("conduction", { conductivity: 1, time: 300 }).handle,
);
for (const v of p128) assert.ok(v >= 20 && v <= 80);
const conductionOutputs = model("conduction").measure(conduction);
assert.deepEqual([...conductionOutputs.temperatures.firstHalf, ...conductionOutputs.temperatures.secondHalf], p32);
near(conductionOutputs.handle, conductionOutputs.temperatures.secondHalf.at(-1));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { thermalOpticsAppearances } = load("src/simulations/components/visuals/physics/ThermalOpticsScenes.tsx");
const originalMeasure = cond.conductionMeasure, originalProfile = cond.conductionProfile;
cond.conductionMeasure = cond.conductionProfile = () => {
  throw new Error("The renderer must not solve heat conduction again");
};
try {
  const markup = renderToStaticMarkup(React.createElement(thermalOpticsAppearances["physics-conduction"], {
    instance: { id: "rod", label: "Rod", state: conduction, outputs: conductionOutputs },
  }));
  assert.equal((markup.match(/fill="hsl\(/g) ?? []).length, 32);
  assert.match(markup, /Handle/);
} finally {
  cond.conductionMeasure = originalMeasure;
  cond.conductionProfile = originalProfile;
}
assert.throws(() =>
  state("conduction", {
    conductivity: 400,
    density: 100,
    capacity: 100,
    length: 0.05,
    time: 7200,
  }),
);
console.log(
  "A4 all10 scientific references, invalid domains, transitions, conservation, convergence and configuration roundtrips PASS",
);

assert.throws(()=>state("string",{harmonic:2.5}));

assert.throws(()=>state("latent",{time:4000,power:1000}));
