const assert = require('node:assert/strict');
const { load } = require('../test-loader.cjs');
const { listPremadeRecipes } = load('src/simulations/registry/recipes/premade.ts');
const { builtInRecipes } = load('src/simulations/registry/recipes/builtIn.ts');
const { publicDefinition } = load('src/simulations/registry/index.ts');
const { modelCapabilities, assemblyCandidates } = load('src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts');
const { selectAssemblyPlan } = load('src/simulations/creation-and-editing/component-selection/assemblyPlan.ts');
const { GenerationBudget } = load('src/simulations/creation-and-editing/budget.ts');
for (const recipe of [...listPremadeRecipes().map(item => item.recipe), ...builtInRecipes]) {
  const models = recipe.document.nodes.filter(node => publicDefinition(node).category === 'models');
  const context = modelCapabilities(recipe);
  assert.deepEqual(context.flatMap(group => group.instances).sort(), models.map(node => node.id).sort(), 'Every model instance remains represented');
  assert.equal(context.length, new Set(models.map(node => `${publicDefinition(node).id}@${publicDefinition(node).version}`)).size);
  for (const group of context) {
    const definition = publicDefinition(models.find(node => node.id === group.instances[0]));
    assert.deepEqual(group.commands.map(command => command.id).sort(), Object.keys(definition.commands).sort(), 'Grouping retains every command');
    assert.deepEqual(group.outputs.map(output => output.id).sort(), Object.keys(definition.outputs).filter(id => !['configuration', 'appearance'].includes(id)).sort(), 'Grouping retains scientific outputs');
  }
}
(async () => {
  const fetchBefore = global.fetch, modeBefore = process.env.PLANNER_MODE;
  const request = { prompt: 'Show me how a crowbar helps lift something heavy. Let me move the pivot.' };
  const intent = { goal: request.prompt, concepts: ['levers'], interactions: ['move the pivot'], observations: ['lifting force'], explicitConstraints: [], suggestedStructure: 'single' };
  const budget = new GenerationBudget();
  Object.defineProperty(budget, 'llmConfig', { value: { provider: 'apertus', connection: 'local', label: 'Contract fixture', baseUrl: 'http://contract.invalid/v1', model: 'contract', structuredOutput: 'strict-json', timeout: 10000, maxTokens: 1024, concurrency: 1 } });
  let calls = 0;
  try {
    process.env.PLANNER_MODE = 'apertus';
    global.fetch = async (_url, options) => {
      const messages = JSON.parse(options.body).messages;
      assert.ok(JSON.stringify(messages).length <= 28000, 'Selection fits the existing context ceiling');
      calls++;
      return Response.json({ choices: [{ message: { content: '{"candidate":"unavailable","complete":false}' } }] });
    };
    await selectAssemblyPlan(request, intent, budget, assemblyCandidates(request, intent));
    assert.equal(calls, 1, 'Bounded request reaches transport without increasing its ceiling');
    console.log('Grouped context preserves every model instance/command/output and the lever selection request fits existing bounds (mocked transport).');
  } finally {
    global.fetch = fetchBefore;
    if (modeBefore === undefined) delete process.env.PLANNER_MODE; else process.env.PLANNER_MODE = modeBefore;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
