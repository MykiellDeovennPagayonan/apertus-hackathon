const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("../test-loader.cjs");
require("./verify-catalog-scope.cjs");
const { premadeRecipe, listPremadeRecipes } = load(
  "src/simulations/registry/recipes/premade.ts",
);
const { loadRecipe } = load("src/simulations/creation-and-editing/runtime-engine/loadRecipe.ts");
const { serializeRecipe } = load(
  "src/simulations/creation-and-editing/authoring-engine/serializeRecipe.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { remapDocument } = load("src/simulations/creation-and-editing/authoring-engine/recipes.ts");
const { DocumentRuntime } = load(
  "src/simulations/creation-and-editing/runtime-engine/DocumentRuntime.ts",
);
const { mathReadout } = load(
  "src/simulations/legacy/components/views/MathReadoutView.tsx",
);
const cases = fs
  .readdirSync(path.join(__dirname, "cases"))
  .map((file) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, "cases", file))),
  );
assert.equal(listPremadeRecipes().length, cases.length);
const { premadeExperiments } = load(
  "src/app/experiments/_lib/premadeExperiments.ts",
);
assert.equal(Object.keys(premadeExperiments).length, 40);
for (const slug of ["pendulum", "slope", "bridge", "shared-fishing-lake"])
  assert.ok(premadeExperiments[slug]);
for (const slug of ["gas", "town", "loan-payments", "nitrogen-cycle"])
  assert.equal(premadeExperiments[slug], undefined);
for (const { slug, recipe } of listPremadeRecipes()) {
  if (!premadeExperiments[slug]) continue;
  assert.equal(premadeExperiments[slug].title, recipe.title);
  assert.equal(premadeExperiments[slug].description, recipe.description);
  assert.equal(premadeExperiments[slug].icon, recipe.catalog.icon);
  assert.equal(premadeExperiments[slug].category, recipe.catalog.category);
}
const pendulumRecipe = loadRecipe(premadeRecipe("pendulum")).runtime;
const initialPeriod = pendulumRecipe.getSnapshot().outputs.model.period;
assert.ok(pendulumRecipe.submit("control/PEND_SET_LENGTH", { value: 10 }).accepted);
assert.ok(pendulumRecipe.getSnapshot().outputs.model.period > initialPeriod);
assert.ok(pendulumRecipe.submit("control/PEND_SET_AMPLITUDE", { value: 45 }).accepted);
assert.equal(pendulumRecipe.getSnapshot().outputs.model.configuration.amplitude, 45);
assert.ok(pendulumRecipe.submit("control/PHYS_RESTART", {}).accepted);
assert.equal(pendulumRecipe.getSnapshot().outputs.model.configuration.playing, true);
const slopeRecipe = loadRecipe(premadeRecipe("slope")).runtime;
assert.ok(slopeRecipe.submit("control/set:slope", { value: 2 }).accepted);
assert.ok(slopeRecipe.submit("control/set:intercept", { value: 3 }).accepted);
assert.equal(slopeRecipe.getSnapshot().outputs.model.slope, 2);
assert.equal(slopeRecipe.getSnapshot().outputs.model.equation.intercept, 3);
// A simple observation need not reserve the height of a full control panel.
const compactObservation = structuredClone(premadeRecipe("area-perimeter"));
compactObservation.document.presentation.items[1].responsiveMinHeight = 100;
assert.doesNotThrow(() => loadRecipe(compactObservation));
compactObservation.document.presentation.items[1].responsiveMinHeight = 43;
assert.throws(() => loadRecipe(compactObservation), /responsive minimum height/);
for (const { slug, visibleItems } of cases) {
  const source = premadeRecipe(slug),
    { runtime, document } = loadRecipe(source);
  assert.deepEqual(document, source.document);
  assert.equal(document.presentation.items.length, visibleItems);
  assert.deepEqual(JSON.parse(serializeRecipe(source)), source);
  const builder = parseDocument(JSON.stringify(source));
  assert.deepEqual(builder.authored, source.document);
  assert.deepEqual(JSON.parse(serializeDocument(builder)), source);
  assert.deepEqual(parseDocument(serializeDocument(builder)), builder);
  const copied = remapDocument(document, (id) => `copy/${id}`);
  new DocumentRuntime(copied);
  document.lesson.instruction = "Local edit";
  assert.notEqual(
    premadeRecipe(slug).document.lesson.instruction,
    document.lesson.instruction,
  );
  assert.notEqual(runtime.document, source.document);
  const invalid = structuredClone(source);
  invalid.document.nodes[0].version = 99;
  assert.throws(() => loadRecipe(invalid));
  assert.deepEqual(premadeRecipe(slug), source);
}
// The pulley investigation starts at rest and keeps force/distance/work in sync.
const pulley = loadRecipe(premadeRecipe("pulleys")).runtime;
assert.equal(pulley.getSnapshot().outputs.model.rise, 0);
for (const strands of [1, 2, 4]) {
  assert.ok(pulley.submit("control/strands", { value: strands }).accepted);
  assert.ok(pulley.submit("control/pull", { value: 1 }).accepted);
  assert.deepEqual(pulley.getSnapshot().outputs.model, {
    configuration: { loadForce: 200, strands, pull: 1 },
    tension: 200 / strands,
    rise: 1 / strands,
    inputWork: 200 / strands,
    outputWork: 200 / strands,
  });
}
const pulleyBefore = structuredClone(pulley.getSnapshot());
assert.equal(pulley.submit("control/strands", { value: 3 }).accepted, false);
assert.equal(pulley.submit("control/pull", { value: -1 }).accepted, false);
assert.deepEqual(pulley.getSnapshot(), pulleyBefore);
assert.ok(pulley.submit("control/pull", { value: 2 }).accepted);
assert.equal(pulley.getSnapshot().outputs.model.rise, 0.5);
assert.ok(pulley.reset().accepted);
assert.equal(pulley.getSnapshot().outputs.model.tension, 200);
assert.equal(pulley.getSnapshot().outputs.model.rise, 0);
// Arrangement changes geometry only; inputs and outputs can exchange regions.
const { arrangeDocument } = load("src/simulations/creation-and-editing/authoring-engine/presentation/arrangement.ts");
const arrangementSource = premadeRecipe("arithmetic").document;
const arrangementBefore = structuredClone(arrangementSource);
const controlId = "control/SET_ARITHMETIC_TASK";
const resultId = "result";
const placement = { template: "automatic", main: [], controls: [], results: [], narrowOrder: [], preserveLocked: true };
const besideResult = arrangeDocument(arrangementSource, { ...placement, beside: [resultId], below: [controlId] });
const besideControl = arrangeDocument(arrangementSource, { ...placement, beside: [controlId], below: [resultId] });
for (const arranged of [besideResult, besideControl]) {
  assert.deepEqual(arranged.nodes, arrangementBefore.nodes);
  assert.deepEqual(arranged.connections, arrangementBefore.connections);
  assert.deepEqual(arranged.resources, arrangementBefore.resources);
  assert.deepEqual(JSON.parse(serializeRecipe({ ...premadeRecipe("arithmetic"), document: arranged })).document, arranged);
}
const boundsFor = (document, node) => document.presentation.items.find(item => document.layout.children.find(layout => layout.id === item.layoutId)?.node === node).rect;
assert.ok(boundsFor(besideResult, resultId).x > boundsFor(besideResult, controlId).x);
assert.ok(boundsFor(besideControl, controlId).x > boundsFor(besideControl, resultId).x);
assert.throws(() => arrangeDocument(arrangementSource, { ...placement, beside: [controlId], below: [controlId] }), /choose beside or below/);
assert.deepEqual(arrangementSource, arrangementBefore);
const { parseIntentResponse } = load("src/simulations/creation-and-editing/intent-interpreter/contracts.ts");
const longQuestion = "How does the Pythagorean theorem help determine the length of a ladder when height and base measurements are known?";
assert.ok(longQuestion.length > 100);
assert.equal(parseIntentResponse({ goal: "Measure a ladder", concepts: [], interactions: [], observations: [], requestedInputs: [], explicitConstraints: [], suggestedStructure: "single", instanceCount: 1, comparisonConditions: "unspecified", question: longQuestion }, "Measure a ladder").question, longQuestion);
const { lineEquation } = load("src/simulations/creation-and-editing/simulation/recipe/formatObservation.ts");
for (const [value, expected] of [
  [{ kind: "line-equation", vertical: false, slope: 2, intercept: 3 }, "y = 2x + 3"],
  [{ kind: "line-equation", vertical: false, slope: -1, intercept: -2 }, "y = −x − 2"],
  [{ kind: "line-equation", vertical: false, slope: 0, intercept: 0 }, "y = 0"],
  [{ kind: "line-equation", vertical: true, x: 4 }, "x = 4"],
]) assert.equal(lineEquation(value), expected);
const { commandPresentation } = load(
  "src/simulations/registry/contracts/commandPresentation.ts",
);
assert.equal(
  commandPresentation("PULLEY_STRANDS", "prefabs/physics/Pulley").presentation
    .value.widget,
  "segmented",
);
const counting = loadRecipe(premadeRecipe("counting")).runtime;
let board = counting.getSnapshot().outputs.model.board;
for (const token of board.tokens)
  assert.ok(
    counting.dispatch([
      { node: "model", command: "COUNT_TOKEN", arguments: { value: token.id } },
    ]).accepted,
  );
assert.equal(
  mathReadout(counting.getSnapshot().outputs.model.board).equation,
  "5",
);
assert.ok(
  counting.submit("task", { value: { mode: "count", target: 0 } }).accepted,
);
assert.equal(
  mathReadout(counting.getSnapshot().outputs.model.board).equation,
  "0",
);
assert.ok(
  counting.submit("task", { value: { mode: "count", target: 20 } }).accepted,
);
assert.ok(counting.submit("control/REPLAY", {}).accepted);
assert.equal(counting.getSnapshot().outputs.model.board.target, 20);
assert.ok(counting.reset().accepted);
assert.equal(counting.getSnapshot().outputs.model.board.target, 5);
const arithmetic = loadRecipe(premadeRecipe("arithmetic")).runtime;
board = arithmetic.getSnapshot().outputs.model.board;
for (const token of board.tokens.filter((t) => t.zone === 1))
  assert.ok(
    arithmetic.dispatch([
      { node: "model", command: "MOVE_TOKEN", arguments: { value: token.id } },
    ]).accepted,
  );
assert.equal(
  mathReadout(arithmetic.getSnapshot().outputs.model.board).equation,
  "3 + 2 = 5",
);
assert.ok(
  arithmetic.submit("control/SET_ARITHMETIC_TASK", {
    value: { operation: "subtract", a: 5, b: 2 },
  }).accepted,
);
board = arithmetic.getSnapshot().outputs.model.board;
for (const token of board.tokens.slice(0, 2))
  assert.ok(
    arithmetic.dispatch([
      { node: "model", command: "MOVE_TOKEN", arguments: { value: token.id } },
    ]).accepted,
  );
assert.equal(
  mathReadout(arithmetic.getSnapshot().outputs.model.board).equation,
  "5 − 2 = 3",
);
const before = structuredClone(arithmetic.getSnapshot());
assert.equal(
  arithmetic.submit("control/SET_ARITHMETIC_TASK", {
    value: { operation: "subtract", a: 1, b: 2 },
  }).accepted,
  false,
);
assert.deepEqual(arithmetic.getSnapshot(), before);
assert.ok(
  arithmetic.dispatch([{ node: "model", command: "REPLAY", arguments: {} }])
    .accepted,
);
assert.equal(
  arithmetic.getSnapshot().outputs.model.board.operation,
  "subtract",
);
const projectile = loadRecipe(premadeRecipe("projectile")).runtime;
projectile.step(0.5);
assert.ok(
  projectile.submit("projectile/primary/control/set:angle", { value: 45 })
    .accepted,
);
assert.equal(projectile.getSnapshot().state["projectile/primary"].angle, 45);
assert.equal(projectile.getSnapshot().state["projectile/secondary"].angle, 60);
assert.equal(projectile.getSnapshot().state["projectile/secondary"].elapsed, 0);
projectile.step(0.5);
assert.ok(projectile.submit("launch", {}).accepted);
assert.equal(projectile.getSnapshot().state["projectile/primary"].elapsed, 0);
assert.equal(projectile.getSnapshot().state["projectile/secondary"].elapsed, 0);
const bridge = loadRecipe(premadeRecipe("bridge")).runtime;
assert.ok(bridge.submit("control/MOVE_LOAD", { value: 0.8 }).accepted);
assert.equal(bridge.getSnapshot().state.load.position, 0.8);
assert.ok(bridge.submit("control/SET_LOAD", { value: 20 }).accepted);
assert.equal(bridge.getSnapshot().state.load.magnitude, 20);
console.log(
  "All migrated premade recipes: exact opening and builder round trips, independent copies, rejected candidates, counting, addition/subtraction, shared launches and bridge load response passed.",
);

const session = load("src/simulations/legacy/runtime/session.ts");
for (const { slug } of cases) {
  session.activatePremadeSession(slug);
  const saved = session.saveRecipe();
  session.loadRecipe(saved);
  assert.deepEqual(JSON.parse(session.saveRecipe()), JSON.parse(saved));
  const current = session.getAuthoredSession();
  const invalid = JSON.parse(saved);
  invalid.document.nodes[0].version = 99;
  assert.throws(() => session.loadRecipe(JSON.stringify(invalid)));
  assert.equal(session.getAuthoredSession(), current);
}
session.disposeSession();
console.log(
  "Session save/reopen and rejected imports preserve the active recipe.",
);

// Every refined task accepts valid commands and rejects malformed edits atomically.
const newTasks = {
 "equal-groups": {mode:"share",total:14,groups:3,perGroup:0},
 "fraction-builder": {a:{n:1,d:2},b:{n:2,d:4}},
 "fraction-number-line": {mode:"add",a:{n:1,d:2},b:{n:1,d:4}},
 ratio: {numerator:5,denominator:4},
 "area-perimeter": {width:8,height:3},
 coordinates: {x:-4,y:0},
 probability: {preset:"die",seed:43,trials:600},
};
for (const [slug,value] of Object.entries(newTasks)) {
 const runtime=loadRecipe(premadeRecipe(slug)).runtime;
 const initial=structuredClone(runtime.getSnapshot());
 const scalarSlugs = ["ratio", "area-perimeter", "coordinates"];
 if (scalarSlugs.includes(slug)) {
  for (const [key, number] of Object.entries(value)) assert.ok(runtime.submit("input/"+key, {value:number}).accepted, slug+":"+key);
 } else assert.ok(runtime.submit("task",{value}).accepted,slug);
 const accepted=structuredClone(runtime.getSnapshot());
 assert.equal(runtime.submit(scalarSlugs.includes(slug) ? "input/"+Object.keys(value)[0] : "task",{value:{...value,unknown:123}}).accepted,false,slug);
 assert.deepEqual(runtime.getSnapshot(),accepted,slug+": invalid draft mutated state");
 const copy=loadRecipe(premadeRecipe(slug)).runtime;
 assert.deepEqual(copy.getSnapshot(),initial,slug+": instance leakage");
 if(slug === "equal-groups") {
  for(let i=0;i<12;i++) assert.ok(runtime.dispatch([{node:"model",command:"DISTRIBUTE_NEXT",arguments:{}}]).accepted);
  const board=runtime.getSnapshot().outputs.model.board;
  assert.equal(board.sequence.cursor,12);assert.equal(board.remainder,2);
  for(let basket=0;basket<3;basket++) assert.equal(board.tokens.filter(t=>t.zone===basket).length,4);
 } else if(slug === "fraction-builder") assert.equal(runtime.getSnapshot().outputs.model.board.relation,"=");
 else if(slug === "fraction-number-line") assert.deepEqual(runtime.getSnapshot().outputs.model.board.result,{n:3,d:4});
 else if(slug === "ratio") assert.equal(runtime.getSnapshot().outputs.model.percentage,125);
 else if(slug === "area-perimeter") {assert.equal(runtime.getSnapshot().outputs.model.area,24);assert.equal(runtime.getSnapshot().outputs.model.perimeter,22);}
 else if(slug === "coordinates") {assert.equal(runtime.getSnapshot().outputs.model.x,-4);assert.equal(runtime.getSnapshot().outputs.model.y,0);}
 else {const rows=runtime.getSnapshot().outputs.model.frequencies;assert.equal(rows.length,6);assert.equal(rows.reduce((sum,row)=>sum+row.observed,0),600);}
 assert.ok(runtime.reset().accepted);assert.deepEqual(runtime.getSnapshot(),initial,slug+": reset lost authored settings");
}
console.log("Seven refined activities: correct results, equal sharing/remainder, equivalent fractions, exact fraction operations, instance isolation, atomic rejection, and authored resets passed.");

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { ExperimentView } = load("src/simulations/legacy/components/views/ExperimentView.tsx");
session.disposeSession();
for(const demo of ["equal-groups","fraction-builder","ratio","coordinates"])
 assert.match(renderToStaticMarkup(React.createElement(ExperimentView,{demo})),/aria-busy="true"/);
console.log("Disposed-session rendering waits for activation without constructing a mismatched legacy model.");
require("./verify-gas-equilibrium.cjs");
require("./verify-lever.cjs");

// Refactor boundaries retain every identity while discovery excludes compatibility-only entries.
const registry = load("src/simulations/registry/index.ts");
const { legacyDefinitions } = load("src/simulations/registry/legacyDefinitions.ts");
const { discoverableDefinition } = load("src/simulations/registry/discovery.ts");
const { builtInRecipes } = load("src/simulations/registry/recipes/builtIn.ts");
assert.equal(registry.publicDefinitions.size, 458);
assert.equal(builtInRecipes.length, 49);
for (const recipe of builtInRecipes) {
  const loaded = loadRecipe(recipe);
  assert.deepEqual(loaded.document, recipe.document);
  const canonical = JSON.parse(serializeRecipe(loaded.recipe));
  assert.deepEqual(JSON.parse(serializeRecipe(canonical)), canonical);
  loaded.runtime.dispose();
}
const nativeIds = new Set([
  ...load("src/simulations/registry/definitions/controls.ts").controlsDefinitions,
  ...load("src/simulations/registry/definitions/displays.ts").displaysDefinitions,
  ...load("src/simulations/registry/definitions/canvases.ts").canvasesDefinitions,
  ...load("src/simulations/registry/objects/publicDefinitions.ts").objectDefinitions,
  ...load("src/simulations/registry/models/domainModels.ts").domainDefinitions,
].map(definition => definition.id));
assert.ok(legacyDefinitions.every(definition => !nativeIds.has(definition.id)));
assert.equal(discoverableDefinition(registry.publicDefinition("controls/ArithmeticTask")), false);
assert.ok(Object.isFrozen(registry.publicDefinition("controls/Slider").configuration));
assert.match(registry.publicDefinition("prefabs/physical-systems/Pendulum").outputs.period.description, /full oscillation/);
const { progressFromTrace } = load("src/simulations/creation-and-editing/input/progress.ts");
assert.equal(progressFromTrace("stage", { task: "edit_target" }), "planning_changes");
assert.equal(progressFromTrace("stage", { task: "choose_presentation" }), "building");

// Exercise extracted stages through the real transport with deterministic in-memory responses.
// These are contract tests, not evidence of live inference quality.
(async () => {
  const { editCandidates } = load("src/simulations/creation-and-editing/component-selection/editCandidates.ts");
  const { editPlanHelpers } = load("src/simulations/creation-and-editing/composer/editPlan.ts");
  const { editArguments } = load("src/simulations/creation-and-editing/composer/editArguments.ts");
  const { editSimulation } = load("src/simulations/creation-and-editing/composer/edit.ts");
  const { validateEditPlan } = load("src/simulations/creation-and-editing/validator/edit.ts");
  const { GenerationBudget } = load("src/simulations/creation-and-editing/budget.ts");
  const recipe = premadeRecipe("arithmetic");
  const model = recipe.document.nodes.find(node => node.id === "model");
  const request = { protocolVersion: 1, requestId: "contract/edit", purpose: "edit", prompt: "Change the first operand", destination: "lesson", viewport: { width: 1440, height: 1000 }, active: { sessionId: "contract/session", authoredRevision: 2, interactionRevision: 4, recipe, runtimeContext: { model: { config: { ...model.configuration, task: { operation: "subtract", a: 10, b: 4 } } } } } };
  const before = structuredClone(request);
  const env = editCandidates(request);
  const helpers = editPlanHelpers(env);
  const candidate = env.candidates.find(entry => entry.tool === "configure" && entry.schema.properties.target.values[0] === "model").id;
  assert.throws(() => validateEditPlan({ mode: "edit", selections: { [candidate]: { scope: "selected", fields: [{ name: "task.a" }] } } }, env, helpers.adjustedValue, () => {}));
  assert.throws(() => validateEditPlan({ mode: "edit", selections: { [candidate]: { scope: "selected", fields: ["task.a"] } }, adjustments: [{ candidate, field: "task.a", operation: "set", operand: -1 }] }, env, helpers.adjustedValue, () => {}));
  const makeBudget = () => {
    const budget = new GenerationBudget();
    Object.defineProperty(budget, "llmConfig", { value: { provider: "apertus", connection: "local", localRuntime: "mlx", label: "Contract test", baseUrl: "http://contract.invalid/v1", model: "contract", structuredOutput: "strict-json", timeout: 10000, maxTokens: 4096, concurrency: 1 } });
    return budget;
  };
  const originalFetch = global.fetch;
  {
    const { assemblyCandidates, adjustableBindings, matchInputBinding } = load("src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts");
    const { resolveRequiredInputs, choosePresentation } = load("src/simulations/creation-and-editing/composer/choosePresentation.ts");
    const { selectAssemblyPlan } = load("src/simulations/creation-and-editing/component-selection/assemblyPlan.ts");
    const { createFromAssemblies } = load("src/simulations/creation-and-editing/composer/createFromAssemblies.ts");
    const projectileRequest = { ...request, active: undefined, purpose: "create", prompt: "Show me 2 projectiles distance comparison based on angles" };
    const projectileIntent = { goal: "Compare projectile distance", concepts: ["projectile motion"], interactions: ["Adjust launch angles"], requestedInputs: ["launch angle"], observations: ["distance"], explicitConstraints: [], suggestedStructure: "comparison", instanceCount: 2 };
    const candidates = assemblyCandidates(projectileRequest, projectileIntent);
    assert.ok(candidates.requiredCapabilities.includes("angle"));
    assert.ok(candidates.ranked.some(entry => entry.recipe.id === premadeRecipe("projectile").id));
    assert.ok(candidates.ranked.every(entry => matchInputBinding("angle", entry.bindings)));
    const projectile = premadeRecipe("projectile");
    const angle = matchInputBinding("launch angle", adjustableBindings(projectile));
    assert.equal(new Set(angle.wires.map(wire => wire.to.node)).size, 2);
    // An angle output does not qualify as an adjustable angle input.
    const outputOnly = structuredClone(premadeRecipe("pendulum"));
    outputOnly.document.connections = outputOnly.document.connections.filter(wire => wire.to.port !== "PEND_SET_AMPLITUDE");
    assert.ok(registry.publicDefinition(outputOnly.document.nodes.find(node => node.id === "model")).outputs.angle);
    assert.equal(matchInputBinding("angle", adjustableBindings(outputOnly)), undefined);
    const incompleteComparison = structuredClone(projectile);
    incompleteComparison.document.connections = incompleteComparison.document.connections.filter(wire => !(wire.to.port === "set:angle" && wire.to.node === angle.wires[1].to.node));
    assert.equal(matchInputBinding("angle", adjustableBindings(incompleteComparison)), undefined);
    global.fetch = async () => { throw new Error("Exact binding resolution must not invoke inference"); };
    const required = await resolveRequiredInputs(projectileRequest, projectileIntent, makeBudget(), projectile);
    assert.equal(required.unsupported, undefined);
    assert.equal(required.controls.length, 2);
    const missing = await resolveRequiredInputs(projectileRequest, projectileIntent, makeBudget(), incompleteComparison);
    assert.ok(missing.unsupported);
    const rectangles = await resolveRequiredInputs(projectileRequest, { ...projectileIntent, requestedInputs: ["width", "height"] }, makeBudget(), premadeRecipe("area-perimeter"));
    assert.equal(rectangles.resolved.length, 2);
    assert.deepEqual(new Set(rectangles.resolved.map(entry => entry.binding.field)), new Set(["value.width", "value.height"]));
    global.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ candidate: "done" }) } }] });
    const presentation = await choosePresentation(projectileRequest, projectileIntent, makeBudget(), projectile, required);
    assert.ok(required.controls.every(endpoint => presentation.controls.includes(endpoint)));
    const originalMode = process.env.PLANNER_MODE;
    process.env.PLANNER_MODE = "apertus";
    try {
      const rejectedId = candidates.cards[candidates.ranked.findIndex(entry => entry.recipe.id === premadeRecipe("pendulum").id)].candidate;
      const acceptedId = candidates.cards[candidates.ranked.findIndex(entry => entry.recipe.id === projectile.id)].candidate;
      let selections = 0;
      global.fetch = async (_url, options) => {
        const messages = JSON.parse(options.body).messages;
        const payload = JSON.parse(messages[1].content);
        let candidate;
        if (messages[0].content.startsWith("Choose ONE offered")) {
          selections++;
          if (selections === 2) assert.ok(payload.candidates.every(card => card.id !== rejectedId));
          candidate = selections === 1 ? rejectedId : acceptedId;
        } else candidate = payload.activity === premadeRecipe("pendulum").title ? "unavailable" : payload.candidates[0].id;
        return Response.json({ choices: [{ message: { content: JSON.stringify({ candidate }) } }] });
      };
      const plan = await selectAssemblyPlan(projectileRequest, { ...projectileIntent, requestedInputs: ["tilt the launcher"] }, makeBudget(), candidates);
      assert.equal(selections, 2);
      assert.deepEqual(plan.activities, [acceptedId]);
      assert.equal(plan.bindings[0].controls.length, 2);
      const seenSelections = new Set();
      global.fetch = async (_url, options) => {
        const messages = JSON.parse(options.body).messages;
        const payload = JSON.parse(messages[1].content);
        let candidate = "unavailable";
        if (messages[0].content.startsWith("Choose ONE offered")) {
          candidate = payload.candidates[0].id;
          assert.ok(!seenSelections.has(candidate), "Rejected activities must not be retried");
          seenSelections.add(candidate);
        }
        return Response.json({ choices: [{ message: { content: JSON.stringify({ candidate }) } }] });
      };
      const unsupported = await selectAssemblyPlan(projectileRequest, { ...projectileIntent, requestedInputs: ["unsupported input"] }, makeBudget(), candidates);
      assert.deepEqual(unsupported.activities, []);
      assert.ok(seenSelections.size <= 3);
      global.fetch = async (_url, options) => {
        const messages = JSON.parse(options.body).messages;
        const payload = JSON.parse(messages[1].content);
        const candidate = messages[0].content.startsWith("Choose ONE offered")
          ? payload.candidates.find(card => card.label === projectile.title).id
          : messages[0].content.startsWith("Decide whether the scene")
            ? (payload.retained.length ? "done" : payload.candidates.find(card => card.id !== "done").id)
            : "done";
        return Response.json({ choices: [{ message: { content: JSON.stringify({ candidate }) } }] });
      };
      const generated = await createFromAssemblies(projectileRequest, projectileIntent, makeBudget());
      assert.equal(generated.status, "created");
      const { runtime } = loadRecipe(generated.recipe);
      const models = generated.recipe.document.nodes.filter(node => node.definition === "models/Projectile");
      assert.equal(models.length, 2);
      assert.equal(generated.recipe.document.connections.filter(wire => wire.kind === "value" && wire.from.port === "range").length, 2);
      for (const model of models) {
        const wire = generated.recipe.document.connections.find(wire => wire.kind === "command" && wire.to.node === model.id && wire.to.port === "set:angle");
        assert.ok(wire, "Both comparison instances must retain launch-angle controls");
        assert.ok(runtime.submit(wire.from.node, { value: 45 }).accepted);
        assert.equal(runtime.getSnapshot().outputs[model.id].configuration.angle, 45);
      }
      runtime.dispose();
    } finally {
      global.fetch = originalFetch;
      if (originalMode === undefined) delete process.env.PLANNER_MODE;
      else process.env.PLANNER_MODE = originalMode;
    }
    console.log("Assembly binding eligibility, per-instance inputs, semantic reselection and assembled projectile controls passed.");
  }
  const calls = [];
  const responses = [{ operations: [] }, { arg1: 7 }];
  global.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    assert.ok(responses.length, "Unexpected inference call");
    return Response.json({ choices: [{ message: { content: JSON.stringify(responses.shift()) } }] });
  };
  try {
    const plan = { mode: "edit", selections: [{ candidate, scope: "selected", fields: ["task.a"] }], message: "" };
    const result = await editArguments(request, makeBudget(), env, plan);
    assert.deepEqual(result.operations[0].arguments.changes.task, { operation: "subtract", a: 7, b: 4 });
    const feedback = JSON.parse(calls[1].messages.at(-1).content).feedback;
    assert.deepEqual(feedback.response_keys, ["arg1"]);
    assert.equal(responses.length, 0);
    assert.deepEqual(request, before);

    // A rejected model removal can reselect the actual control, with no draft applied in between.
    const stages = [];
    const taskControl = recipe.document.connections.find(wire => wire.kind === "command" && wire.to.port === "SET_ARITHMETIC_TASK").from.node;
    const removeModel = env.candidates.find(entry => entry.tool === "remove" && entry.node === "model").id;
    const removeControl = env.candidates.find(entry => entry.tool === "remove" && entry.node === taskControl).id;
    let targetCalls = 0;
    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      const system = body.messages[0].content;
      let response;
      if (system.startsWith("Choose ONLY")) {
        targetCalls++;
        stages.push("target");
        if (targetCalls === 2) assert.ok(JSON.parse(body.messages[1].content).recovery.rejectedCandidates.includes(removeModel));
        response = { mode: "edit", candidates: [targetCalls === 1 ? removeModel : removeControl] };
      } else {
        stages.push("plan");
        response = { [JSON.parse(body.messages[1].content).operations[0].id]: true };
      }
      return Response.json({ choices: [{ message: { content: JSON.stringify(response) } }] });
    };
    const updated = await editSimulation({ ...request, prompt: "Remove the task control" }, makeBudget());
    assert.equal(targetCalls, 2);
    assert.equal(updated.status, "updated");
    assert.ok(updated.recipe.document.nodes.some(node => node.id === "model"));
    assert.ok(!updated.recipe.document.nodes.some(node => node.id === taskControl));
    assert.deepEqual(updated.recipe.document.nodes.find(node => node.id === "model").configuration, model.configuration);
    assert.deepEqual(request, before);

    const { editPlan: composeEditPlan } = load("src/simulations/creation-and-editing/composer/editPlan.ts");
    let fieldCalls = 0;
    global.fetch = async (_url, options) => {
      fieldCalls++;
      const payload = JSON.parse(JSON.parse(options.body).messages[1].content);
      const field = payload.fields.find(entry => entry.name === "task.a").id;
      assert.ok(JSON.stringify(JSON.parse(options.body).messages).length < 28000);
      const value = fieldCalls === 1 ? { [field]: { name: "task.a" } } : fieldCalls === 2 ? {} : { [field]: true };
      return Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
    };
    const fieldPlan = await composeEditPlan(request, makeBudget(), { ...env, candidateChoices: [...env.candidateChoices, ...Array.from({ length: 1000 }, () => ({ ...env.candidateChoices[0], description: "unused catalog detail ".repeat(100) }))] }, { mode: "edit", candidates: [candidate] });
    assert.equal(fieldCalls, 3);
    assert.deepEqual(fieldPlan.selections[0].fields, ["task.a"]);
    const sceneItem = recipe.document.presentation.items.find(item => item.layoutId.includes("appearance"));
    const resize = env.candidates.find(entry => entry.tool === "resize" && entry.schema.properties.target.values[0] === sceneItem.id);
    global.fetch = async () => { throw new Error("Computed resize must not invoke inference"); };
    const resized = await editArguments(request, makeBudget(), env, { mode: "edit", selections: [{ candidate: resize.id, scope: "selected", fields: ["height"], adjustments: [{ field: "height", operation: "offset", operand: 80 }] }], message: "" });
    assert.equal(resized.operations[0].arguments.width, sceneItem.rect.width);
    assert.equal(resized.operations[0].arguments.height, sceneItem.rect.height + 80);
    const { choosePresentation } = load("src/simulations/creation-and-editing/composer/choosePresentation.ts");
    const { configureAssembly } = load("src/simulations/creation-and-editing/composer/configureAssembly.ts");
    const intent = { goal: "Explore arithmetic", concepts: ["arithmetic"], interactions: ["adjust operands"], observations: ["result"], explicitConstraints: [], suggestedStructure: "single" };
    const originalMode = process.env.PLANNER_MODE;
    process.env.PLANNER_MODE = "apertus";
    try {
      let presentationCalls = 0;
      global.fetch = async (_url, options) => {
        presentationCalls++;
        const payload = JSON.parse(JSON.parse(options.body).messages[1].content);
        const system = JSON.parse(options.body).messages[0].content;
        const value = presentationCalls === 1 ? { candidate: "unknown" }
          : system.startsWith("Resolve") ? { candidate: payload.candidates[0].id }
          : system.startsWith("Choose ONE additional") ? { candidate: "done" }
          : { candidate: payload.retained.length ? "done" : payload.candidates.find(card => card.id !== "done").id };
        return Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
      };
      const presentation = await choosePresentation(request, intent, makeBudget(), recipe);
      assert.ok(presentationCalls > 1);
      assert.ok(presentation.controls.includes("model.SET_ARITHMETIC_TASK"));
      assert.ok(presentation.observations.includes("result"));
      const pendulum = load("src/simulations/registry/recipes/modelRecipe.ts").modelRecipe("prefabs/physical-systems/Pendulum");
      global.fetch = async (_url, options) => {
        const system = JSON.parse(options.body).messages[0].content;
        return Response.json({ choices: [{ message: { content: JSON.stringify({ candidate: "done" }) } }] });
      };
      const requiredPresentation = await choosePresentation(request, { ...intent, requestedInputs: ["starting angle", "pendulum length"] }, makeBudget(), pendulum);
      assert.ok(requiredPresentation.controls.some(command => command.endsWith(".PEND_SET_LENGTH")));
      assert.ok(requiredPresentation.controls.some(command => command.endsWith(".PEND_SET_AMPLITUDE")));
      assert.ok(!requiredPresentation.controls.some(command => command.endsWith(".PEND_SET_GRAVITY")));
      let settingsCalls = 0;
      global.fetch = async (_url, options) => {
        settingsCalls++;
        const payload = JSON.parse(JSON.parse(options.body).messages[1].content);
        const value = settingsCalls === 1 ? { unknownSetting: 5 } : payload.setting ? { value: { operation: "subtract", a: 7, b: 3 } } : { candidate: payload.alreadyConfigured.length ? "done" : payload.candidates.find(card => card.id !== "done").id };
        return Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
      };
      const configuration = await configureAssembly(request, intent, makeBudget(), recipe, 0, 1, [], []);
      assert.equal(settingsCalls, 4);
      assert.deepEqual(configuration.overrides, { task: { operation: "subtract", a: 7, b: 3 } });
      global.fetch = async () => { throw new Error("No model call is needed without exposed parameters"); };
      assert.deepEqual(await configureAssembly(request, intent, makeBudget(), premadeRecipe("projectile"), 0, 1, [], []), { overrides: {} });
    } finally {
      if (originalMode === undefined) delete process.env.PLANNER_MODE;
      else process.env.PLANNER_MODE = originalMode;
    }
  } finally { global.fetch = originalFetch; }
  console.log("Pipeline contracts: all identities and built-ins resolve, live siblings survive, invalid fields reject, keyed repairs and bounded target reselection passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });

// Type-only imports cannot pull server inference or React scenes across these boundaries.
const ts = require("typescript");
function runtimeImports(entry, visited = new Set()) {
  const file = path.resolve(__dirname, "../..", entry);
  if (visited.has(file)) return [];
  visited.add(file);
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  return source.statements.flatMap(statement => {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) return [];
    if (!statement.moduleSpecifier || statement.isTypeOnly || statement.importClause?.isTypeOnly) return [];
    const bindings = statement.importClause?.namedBindings ?? statement.exportClause;
    if (bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) && bindings.elements.every(element => element.isTypeOnly)) return [];
    const name = statement.moduleSpecifier.text;
    if (!name.startsWith(".")) return [name];
    const base = path.resolve(path.dirname(file), name);
    const target = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert.ok(target, `Missing runtime import ${name} in ${file}`);
    if (!/\.tsx?$/.test(target)) return [target];
    return [target, ...runtimeImports(target, visited)];
  });
}
const registryImports = runtimeImports("src/simulations/registry/index.ts");
assert.ok(!registryImports.some(file => file === "react" || file.includes("/input/inference/") || file.endsWith("/registry/recipes/builtIn.ts")));
for (const entry of ["src/simulations/creation-and-editing/input/browser.ts", "src/simulations/creation-and-editing/simulation/RecipeLesson.tsx", "src/simulations/builder/composition/useBuilderAi.ts"]) {
  const imports = runtimeImports(entry);
  assert.ok(!imports.some(file => file.includes("/input/inference/config") || file.includes("/input/inference/transport") || file.endsWith("/creation-and-editing/server.ts")), `${entry} reaches server inference`);
}
console.log("Registry and browser import boundaries passed.");
