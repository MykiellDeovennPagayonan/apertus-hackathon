const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("../test-loader.cjs");
const { premadeRecipe, listPremadeRecipes } = load(
  "src/simulations/runtime/recipes/registry.ts",
);
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { serializeRecipe } = load(
  "src/simulations/runtime/recipes/serializeRecipe.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { remapDocument } = load("src/simulations/runtime/authoring/recipes.ts");
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { mathReadout } = load(
  "src/simulations/components/views/MathReadoutView.tsx",
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
assert.deepEqual(
  Object.keys(premadeExperiments).sort(),
  [...listPremadeRecipes().map(({ slug }) => slug), "gas", "town"].sort(),
);
for (const { slug, recipe } of listPremadeRecipes()) {
  assert.equal(premadeExperiments[slug].title, recipe.title);
  assert.equal(premadeExperiments[slug].description, recipe.description);
  assert.equal(premadeExperiments[slug].icon, recipe.catalog.icon);
}
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

const session = load("src/simulations/runtime/session.ts");
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
const { ExperimentView } = load("src/simulations/components/views/ExperimentView.tsx");
session.disposeSession();
for(const demo of ["equal-groups","fraction-builder","ratio","coordinates"])
 assert.match(renderToStaticMarkup(React.createElement(ExperimentView,{demo})),/aria-busy="true"/);
console.log("Disposed-session rendering waits for activation without constructing a mismatched legacy model.");
