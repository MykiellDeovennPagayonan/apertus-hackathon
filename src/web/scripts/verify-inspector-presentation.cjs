const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("./test-loader.cjs");

const { presentInspection, PropertyInspector, EntityInspectorView } = load(
  "src/simulations/components/views/EntityInspectorView.tsx",
);

const presentation = presentInspection({
  launch: { angle: 0, velocity: 20, playing: false },
  metrics: {
    range: 12.3456,
    maxHeight: null,
    note: "",
    unstable: Infinity,
  },
});
assert.equal(presentation.state, "ready");
assert.deepEqual(
  presentation.entries.find((entry) => entry.path === "launch.angle"),
  {
    path: "launch.angle",
    label: "Launch angle",
    group: "Launch settings",
    text: "0",
    unit: "°",
    state: "ready",
  },
);
assert.equal(
  presentation.entries.find((entry) => entry.path === "launch.playing").text,
  "Paused",
);
assert.equal(
  presentation.entries.find((entry) => entry.path === "metrics.maxHeight")
    .state,
  "unavailable",
);
assert.equal(
  presentation.entries.find((entry) => entry.path === "metrics.note").state,
  "empty",
);
assert.equal(
  presentation.entries.find((entry) => entry.path === "metrics.unstable").state,
  "invalid",
);
const references = presentInspection({
  a: "generated/b0",
  b: "generated/t0",
  id: "generated/deck0",
  present: true,
});
assert.equal(
  references.entries.find((entry) => entry.path === "a").label,
  "Start joint",
);
assert.equal(references.entries.find((entry) => entry.path === "a").text, "B0");
assert.equal(
  references.entries.find((entry) => entry.path === "id").text,
  "Deck 0",
);
assert.equal(
  references.entries.find((entry) => entry.path === "present").text,
  "Enabled",
);
assert.equal(presentInspection([]).state, "empty");
assert.equal(presentInspection(undefined).state, "unavailable");
const bounded = presentInspection(
  Object.fromEntries(
    Array.from({ length: 100 }, (_, index) => [`field${index}`, index]),
  ),
);
assert.equal(bounded.entries.length, 40);
assert.equal(bounded.truncated, true);
assert.equal(
  presentInspection({ status: "unavailable", reason: "Waiting for data" })
    .state,
  "unavailable",
);

const html = renderToStaticMarkup(
  React.createElement(PropertyInspector, {
    label: "Projectile details",
    value: { angle: 45, velocity: 18, playing: false },
  }),
);
assert.match(html, /Projectile details/);
assert.match(html, /Launch angle/);
assert.match(html, /m\/s/);
assert.match(html, /Paused/);
assert.doesNotMatch(html, /\{&quot;/);

const entity = renderToStaticMarkup(
  React.createElement(EntityInspectorView, {
    demo: "projectile",
    id: "internal/projectile-42",
    label: "Ball 1",
    parameters: { angle: 45, speed: 20, gravity: 9.81 },
    outputs: { range: 40.77, maxHeight: 10.19, duration: 2.88 },
    assumptions: ["No air resistance."],
  }),
);
assert.match(entity, /Inspect Ball 1/);
assert.match(entity, /Adjust object/);
assert.match(entity, /Inputs/);
assert.match(entity, /Observations/);
assert.match(entity, /About this model/);
assert.doesNotMatch(entity, /internal\/projectile-42/);

console.log(
  "Inspector presentation: semantic labels and units, truthful value states, structured rows, learner-safe identity and editable/observed separation passed.",
);
