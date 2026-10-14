const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('../test-loader.cjs');
const { listPremadeRecipes } = load('src/simulations/registry/recipes/premade.ts');
const { withAvailableInputs } = load('src/simulations/creation-and-editing/component-selection/inputRequirements.ts');
const { learnerPresentation } = load('src/simulations/creation-and-editing/simulation/layout/learnerLayout.ts');
const { validateAuthoredDocument } = load('src/simulations/creation-and-editing/validator/document.ts');
const { boardLayouts } = load('src/simulations/creation-and-editing/authoring-engine/presentation/board.ts');
const { centeredOpeningCamera } = load('src/simulations/creation-and-editing/authoring-engine/presentation/board.ts');
{
  const viewport = { width: 1440, height: 1000 }, insets = { top: 100, bottom: 100 };
  for (const zoom of [1, 0.75]) {
    const bounds = { x: 40, y: 20, width: 980, height: 400 };
    const camera = centeredOpeningCamera(bounds, viewport, insets, zoom);
    const top = viewport.height / 2 + (bounds.y - camera.centerY) * zoom;
    assert.equal(top + bounds.height * zoom / 2, 500, 'Short content is vertically centered between floating UI');
    assert.equal(camera.zoom, zoom, 'Centering preserves readable scale');
    assert.equal(camera.centerX, bounds.x + bounds.width / 2);
  }
  const tall = centeredOpeningCamera({ x: 0, y: 20, width: 980, height: 1200 }, viewport, insets, 1);
  assert.equal(viewport.height / 2 + (20 - tall.centerY), 100, 'Tall content starts below the header instead of clipping its first row');
}
const { DocumentRuntime } = load('src/simulations/creation-and-editing/runtime-engine/DocumentRuntime.ts');
const { PresentationLayout } = load('src/simulations/creation-and-editing/simulation/recipe/RecipeLayout.tsx');
const { SnapshotContext } = load('src/simulations/creation-and-editing/simulation/recipe/contexts.tsx');
let disclosures = 0;
for (const { recipe } of listPremadeRecipes()) {
  const before = JSON.stringify(recipe);
  const expanded = withAvailableInputs(recipe);
  assert.equal(JSON.stringify(recipe), before, 'Original recipe must remain unchanged');
  const groups = expanded.document.layout.children.filter(layout => layout.kind === 'disclosure');
  const authoredIds = new Set(recipe.document.nodes.map(node => node.id));
  for (const group of groups) {
    disclosures++;
    assert.ok(group.children.every(child => !authoredIds.has(child.node)), 'Authored controls stay outside generated disclosures');
    assert.equal(new Set(group.children.map(child => expanded.document.nodes.find(node => node.id === child.node).scope)).size, 1, 'Each disclosure retains its model scope');
  }
  const grouped = learnerPresentation(expanded.document);
  const ungrouped = structuredClone(expanded.document);
  ungrouped.layout.children = ungrouped.layout.children.flatMap(layout => groups.some(group => group.id === layout.id) ? layout.children : [layout]);
  const baseline = learnerPresentation(ungrouped);
  assert.deepEqual(grouped.nodes, baseline.nodes, 'Presentation must preserve models and configuration');
  assert.deepEqual(grouped.connections, baseline.connections, 'Presentation must preserve all command and value bindings');
  assert.deepEqual(grouped.resources, baseline.resources);
  validateAuthoredDocument(grouped);
  for (const group of groups) {
    assert.ok(boardLayouts(grouped).some(layout => layout.id === group.id), 'Disclosure survives arrangement');
    const item = grouped.presentation.items.find(item => item.layoutId === group.id);
    assert.ok(item && grouped.presentation.responsiveRows.some(row => row.includes(item.id)), 'Grouped controls participate in board placement');
    assert.equal(item.rect.height, 64, 'A collapsed disclosure does not reserve an empty control card');
  }
  if (groups.length) {
    const runtime = new DocumentRuntime(grouped);
    const html = renderToStaticMarkup(React.createElement(SnapshotContext.Provider, { value: runtime.getSnapshot() },
      React.createElement(PresentationLayout, { layout: groups[0], runtime })));
    assert.match(html, /<details/);
    assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
    assert.match(html, /Additional controls/);
    assert.match(html, /recipe-disclosure__content/);
    runtime.dispose();
  }
}
assert.ok(disclosures > 0);
console.log('All 40 recipes preserve models, values and bindings; generated controls are scoped, arranged and collapsed while authored controls stay outside.');

(async () => {
  const { resolveInputRequirements } = load('src/simulations/creation-and-editing/component-selection/inputRequirements.ts');
  const { GenerationBudget } = load('src/simulations/creation-and-editing/budget.ts');
  const budget = new GenerationBudget();
  Object.defineProperty(budget, 'llmConfig', { value: { provider: 'apertus', connection: 'local', label: 'Contract fixture', baseUrl: 'http://contract.invalid/v1', model: 'contract', structuredOutput: 'strict-json', timeout: 10000, maxTokens: 1024, concurrency: 1 } });
  const originalFetch = global.fetch;
  const request = { prompt: 'An investigation with an adjustable quantity and visible outcome' };
  try {
    global.fetch = async (_url, options) => {
      const payload = JSON.parse(JSON.parse(options.body).messages[1].content);
      assert.equal(payload.request, request.prompt);
      assert.equal(payload.activity, undefined, 'Preset lesson text does not establish support');
      assert.ok(payload.models.every(model => model.commands.length && model.outputs.length));
      assert.ok(payload.models.every(model => model.outputs.every(output => output.id)));
      return Response.json({ choices: [{ message: { content: '{"supported":false,"inputs":[]}' } }] });
    };
    const result = await resolveInputRequirements(request, budget, withAvailableInputs(listPremadeRecipes()[0].recipe));
    assert.ok(result.unsupported, 'The existing flat support decision can reject without committing another activity');
    assert.deepEqual(result.requirements, []);
  } finally { global.fetch = originalFetch; }
})().catch(error => { console.error(error); process.exitCode = 1; });
