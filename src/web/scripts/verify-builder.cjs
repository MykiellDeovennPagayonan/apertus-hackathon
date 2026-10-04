const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const documents = load("src/simulations/builder/document.ts");
const runtime = load("src/simulations/runtime/session.ts");
const { resolveRecipe } = load("src/simulations/runtime/resolver.ts");
const { useGasStore } = load("src/simulations/runtime/gasSession.ts");
const { useMathStore } = load("src/simulations/runtime/mathSession.ts");
const { useAssemblyStore } = load("src/simulations/runtime/assemblySession.ts");
const {
  createDocument,
  createBlankDocument,
  addObject,
  removeObject,
  validateRunnableDocument,
  validateDocument,
  serializeDocument,
  parseDocument,
  initialParameters,
  setInitial,
  controlFor,
  deleteBlock,
} = documents;
for (const template of ["gas", "fractions", "line", "town"]) {
  const doc = createDocument(template);
  assert.deepEqual(parseDocument(serializeDocument(doc)), doc);
  const imported = parseDocument(JSON.stringify(doc.recipe));
  assert.deepEqual(imported.recipe, doc.recipe);
  const resolved = resolveRecipe(doc.recipe);
  runtime.activateSession(resolved.demo, resolved, doc.recipe);
  assert.equal(
    runtime.getExperimentContext().composition.ref,
    doc.recipe.composition.ref,
  );
  runtime.disposeSession();
}
const gas = createDocument("gas");
setInitial(gas, "volume", 1);
setInitial(gas, "temperature", 300);
setInitial(gas, "amount", 1);
validateDocument(gas);
let frames = new Set(),
  sequence = 0;
global.requestAnimationFrame = () => {
  const id = ++sequence;
  frames.add(id);
  return id;
};
global.cancelAnimationFrame = (id) => frames.delete(id);
const activate = (doc) => {
  const r = resolveRecipe(doc.recipe);
  runtime.activateSession(r.demo, r, doc.recipe);
};
activate(gas);
assert.equal(frames.size, 1);
const identity = runtime.getExperimentContext().sessionId;
const pressure = useGasStore.getState().metrics.pressureKPa;
assert.ok(Math.abs(pressure - 2.4942) < 0.01);
assert.equal(
  runtime.dispatchCommand("gas", { type: "SET_VOLUME", value: 0.5 }).accepted,
  true,
);
assert.ok(
  Math.abs(useGasStore.getState().metrics.pressureKPa - 2 * pressure) < 0.001,
);
assert.equal(
  initialParameters(gas).volume,
  1,
  "preview interactions cannot write author configuration",
);
gas.lesson.instruction = "Compress the container and observe pressure.";
gas.presentation.controls.find((c) => c.capability === "temperature").slot =
  "primary";
validateDocument(gas);
assert.equal(
  runtime.getExperimentContext().sessionId,
  identity,
  "presentation validation cannot replace session",
);
assert.equal(useGasStore.getState().inputs.volume, 0.5);
assert.equal(
  runtime.dispatchCommand("gas", { type: "SET_VOLUME", value: 20 }).accepted,
  false,
);
assert.equal(useGasStore.getState().inputs.volume, 0.5);
assert.equal(runtime.dispatchCommand("gas", { type: "RESET" }).accepted, true);
assert.equal(useGasStore.getState().inputs.volume, 1);
activate(parseDocument(serializeDocument(gas)));
assert.equal(frames.size, 1, "reopening disposes old clock");
assert.equal(useGasStore.getState().inputs.volume, 1);
const invalid = (mutate) => {
  const doc = structuredClone(gas);
  mutate(doc);
  assert.throws(() => validateDocument(doc));
  assert.equal(frames.size, 1);
  assert.equal(useGasStore.getState().inputs.volume, 1);
};
invalid((d) => (d.lesson.instruction = "x".repeat(151)));
invalid((d) => (d.presentation.controls[0].min = 0.1));
invalid((d) => (d.presentation.controls[0].step = 0));
invalid((d) => (d.presentation.controls[0].target = "missing"));
invalid((d) => (d.presentation.controls[0].capability = "pressureKPa"));
invalid((d) => (d.presentation.controls[0].widget = "button"));
invalid((d) => (d.presentation.controls[1].id = d.presentation.controls[0].id));
invalid((d) => (d.presentation.results[0].unit = "Pa"));
invalid((d) => (d.presentation.results[0].precision = 8));
invalid((d) => (d.presentation.view = "town"));
invalid((d) => (d.presentation.layout = "floating"));
invalid((d) => (d.recipe.composition.version = 99));
invalid((d) => (d.editor.positions.unknown = { x: 1, y: 2 }));
const withoutReset = structuredClone(gas);
deleteBlock(withoutReset, "control-reset");
validateDocument(withoutReset);
assert.throws(() => validateRunnableDocument(withoutReset), /Reset/);
const duplicate = controlFor(gas, "volume", "second-volume");
gas.presentation.controls.push(duplicate);
validateDocument(gas);
gas.editor.positions[duplicate.id] = { x: 70, y: 80 };
deleteBlock(gas, duplicate.id);
validateDocument(gas);
assert.ok(!gas.editor.positions[duplicate.id]);
assert.throws(() => deleteBlock(gas, "object"));
const fractions = createDocument("fractions");
activate(fractions);
assert.equal(frames.size, 0, "static lessons do not start a clock");
assert.equal(
  runtime.dispatchCommand("fraction-builder", {
    type: "SUBDIVIDE_FRACTION",
    value: { bar: 0, factor: 2 },
  }).accepted,
  true,
);
assert.deepEqual(useMathStore.getState().board.bars[0].value, { n: 2, d: 4 });
runtime.dispatchCommand("fraction-builder", { type: "RESET" });
assert.deepEqual(useMathStore.getState().board.bars[0].value, { n: 1, d: 2 });
const line = createDocument("line");
line.recipe.assembly.learningGoal = "A preserved longer learning goal. ".repeat(
  8,
);
assert.equal(
  parseDocument(JSON.stringify(line.recipe)).lesson.explanation,
  line.recipe.assembly.learningGoal,
);
activate(line);
assert.equal(
  runtime.dispatchCommand("assembly", {
    type: "SET_SLOPE",
    target: "line/main",
    value: 2,
  }).accepted,
  true,
);
assert.equal(useAssemblyStore.getState().instances[0].outputs.yAtOne, 2);
assert.equal(initialParameters(line).slope, 1);
runtime.disposeSession();
assert.equal(frames.size, 0);
assert.equal(runtime.getExperimentContext(), null);
console.log(
  "Builder document, bindings, legacy import, model interaction, and session lifecycle checks passed.",
);

for (const canvas of ["gas", "fractions", "line", "town"]) {
  const draft = createBlankDocument(
    canvas,
    canvas === "town" ? "floating" : "right",
  );
  assert.equal(draft.recipe, null, "choosing a canvas must not create a model");
  assert.equal(draft.lesson.instruction, "");
  assert.deepEqual(draft.presentation.controls, []);
  assert.deepEqual(draft.presentation.results, []);
  assert.deepEqual(parseDocument(serializeDocument(draft)), draft);
  assert.throws(() => validateRunnableDocument(draft), /Add an object/);
  addObject(draft);
  validateDocument(draft);
  assert.ok(draft.recipe);
  assert.equal(
    draft.presentation.controls.length,
    0,
    "adding a model cannot add learner widgets",
  );
  assert.throws(() => addObject(draft), /one model/);
  draft.lesson.title = "My lesson";
  draft.lesson.instruction = "Explore this model.";
  draft.presentation.controls.push(controlFor(draft, "reset", "my-reset"));
  validateRunnableDocument(draft);
  removeObject(draft);
  validateDocument(draft);
  assert.equal(draft.recipe, null);
  assert.deepEqual(draft.presentation.controls, []);
  assert.deepEqual(draft.editor.positions, {});
}
const orphan = createBlankDocument("gas", "right");
orphan.presentation.results.push({ id: "orphan" });
assert.throws(() => validateDocument(orphan), /Add an object/);
console.log(
  "Blank drafts, explicit model addition, runnable validation, and removal checks passed.",
);

// A rejected or conflicting save must preserve the complete previous snapshot.
(async () => {
  const { LIBRARY_KEY, saveEntry, readLibrary } = load(
    "src/simulations/builder/storage.ts",
  );
  const memory = new Map();
  const originalStorage = global.localStorage;
  const originalNavigator = Object.getOwnPropertyDescriptor(
    global,
    "navigator",
  );
  let queue = Promise.resolve();
  global.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };
  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: {
      locks: {
        request: (_name, operation) => {
          const pending = queue.then(operation);
          queue = pending.catch(() => {});
          return pending;
        },
      },
    },
  });
  try {
    const original = { id: "shared", document: createDocument("gas") };
    const unsupported = { id: "legacy", document: { documentVersion: 999 } };
    memory.set(LIBRARY_KEY, JSON.stringify([unsupported]));
    await saveEntry(original);
    const first = structuredClone(original);
    first.document.lesson.title = "First tab";
    const second = structuredClone(original);
    second.document.lesson.title = "Second tab";
    const outcomes = await Promise.allSettled([
      saveEntry(first, original),
      saveEntry(second, original),
    ]);
    assert.equal(
      outcomes.filter((outcome) => outcome.status === "fulfilled").length,
      1,
    );
    assert.match(
      outcomes.find((outcome) => outcome.status === "rejected").reason.message,
      /another tab/,
    );
    assert.deepEqual(
      readLibrary().find((entry) => entry.id === "shared"),
      first,
    );
    assert.deepEqual(
      readLibrary().find((entry) => entry.id === "legacy"),
      unsupported,
    );
    const before = memory.get(LIBRARY_KEY);
    const invalid = structuredClone(first);
    invalid.document.lesson.instruction = "x".repeat(151);
    await assert.rejects(saveEntry(invalid, first), /150/);
    assert.equal(memory.get(LIBRARY_KEY), before);
    global.localStorage.setItem = () => {
      throw new Error("Storage quota exceeded");
    };
    await assert.rejects(saveEntry(second, first), /quota/);
    assert.equal(memory.get(LIBRARY_KEY), before);
    console.log(
      "Atomic save, concurrent conflict, legacy preservation, and storage failure checks passed.",
    );
  } finally {
    global.localStorage = originalStorage;
    if (originalNavigator)
      Object.defineProperty(global, "navigator", originalNavigator);
    else delete global.navigator;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// Every wire terminates at an actual typed port, including duplicate controls and presentation edges.
{
  const { connectionGraph, portPoint } = load(
    "src/simulations/builder/connections.ts",
  );
  for (const template of ["gas", "fractions", "line", "town"]) {
    const doc = createDocument(template);
    for (const presentation of [false, true]) {
      const graph = connectionGraph(doc, presentation);
      for (const wire of graph.wires) {
        const source = graph.node(wire.from),
          target = graph.node(wire.to);
        assert.ok(source && target);
        assert.equal(
          source.outputs.find((port) => port.id === wire.fromPort).type,
          wire.type,
        );
        assert.equal(
          target.inputs.find((port) => port.id === wire.toPort).type,
          wire.type,
        );
        const a = portPoint(source, wire.fromPort, "output");
        const b = portPoint(target, wire.toPort, "input");
        assert.ok(
          Number.isFinite(a.x) &&
            Number.isFinite(a.y) &&
            Number.isFinite(b.x) &&
            Number.isFinite(b.y),
        );
      }
    }
    doc.editor.positions.object = { x: 777, y: 888 };
    assert.equal(connectionGraph(doc, false).node("object").x, 777);
    assert.notEqual(
      connectionGraph(doc, false, null, false).node("object").x,
      777,
    );
  }
  console.log(
    "Typed graph endpoints and saved/automatic arrangement checks passed.",
  );
}
