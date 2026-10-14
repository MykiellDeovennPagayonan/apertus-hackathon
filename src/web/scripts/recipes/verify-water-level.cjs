const assert = require('node:assert/strict');
const { load } = require('../test-loader.cjs');
const { publicDefinition } = load('src/simulations/registry/index.ts');
const { premadeRecipe } = load('src/simulations/registry/recipes/premade.ts');
const { withAvailableInputs } = load('src/simulations/creation-and-editing/component-selection/inputRequirements.ts');
const { loadRecipe } = load('src/simulations/creation-and-editing/runtime-engine/loadRecipe.ts');
const { pressureMeasure, pressureDefaults } = load('src/simulations/legacy/components/systems/physics/pressure.ts');
const { modelCapabilities } = load('src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts');

const rectangle = publicDefinition('models/area-perimeter');
assert.match(rectangle.description, /independent model instances/);
assert.ok(rectangle.commands.SET_DIMENSIONS.description);
assert.ok(rectangle.outputs.area.description && rectangle.outputs.perimeter.description);
assert.deepEqual(Object.keys(rectangle.commands), ['SET_DIMENSIONS', 'RESET']);
const recipe = withAvailableInputs(premadeRecipe('water-pressure'));
const before = JSON.stringify(premadeRecipe('water-pressure'));
const wire = recipe.document.connections.find(w => w.kind === 'command' && w.to.port === 'PRESSURE_SURFACEHEIGHT');
assert.ok(wire, 'The existing control generator wires the new declared command');
const definition = publicDefinition('prefabs/physics/WaterPressure');
assert.equal(definition.commands.PRESSURE_SURFACEHEIGHT.submission, 'continuous');
assert.ok(modelCapabilities(recipe)[0].commands.some(c => c.id === 'PRESSURE_SURFACEHEIGHT'));
assert.match(definition.outputs.range.description, /stream lands/);
const { runtime } = loadRecipe(recipe);
const initial = structuredClone(runtime.getSnapshot());
for (const height of [0.5, 0.75, 1.5, 3]) {
  assert.equal(runtime.submit(wire.from.node, { value: height }).accepted, true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.state.model.surfaceHeight, height);
  assert.equal(snapshot.state.model.holeHeight, pressureDefaults.holeHeight, 'Water-level changes preserve the hole');
  const expected = pressureMeasure({ ...pressureDefaults, surfaceHeight: height });
  for (const [output, value] of Object.entries(expected)) assert.equal(snapshot.outputs.model[output], value);
}
for (const height of [0.25, 3.1, NaN, '1']) {
  const accepted = structuredClone(runtime.getSnapshot());
  assert.equal(runtime.submit(wire.from.node, { value: height }).accepted, false);
  assert.deepEqual(runtime.getSnapshot(), accepted, 'Invalid levels cannot partially change accepted state');
}
assert.equal(runtime.dispatch([{ node: 'model', command: 'RESET', arguments: {} }]).accepted, true);
assert.deepEqual(runtime.getSnapshot().outputs.model, initial.outputs.model);
assert.equal(JSON.stringify(premadeRecipe('water-pressure')), before, 'Premade defaults and bindings remain unchanged');
runtime.dispose();
console.log('Rectangle metadata and water-level binding, runtime outputs, bounds, atomic rejection and reset verified.');
