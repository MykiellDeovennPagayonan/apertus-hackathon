const assert = require('node:assert/strict');
const { load } = require('../test-loader.cjs');
const { GenerationBudget } = load('src/simulations/creation-and-editing/budget.ts');
const { assemblyCandidates } = load('src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts');
const { modelCapabilities } = load('src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts');
const { selectAssemblyPlan } = load('src/simulations/creation-and-editing/component-selection/assemblyPlan.ts');

(async () => {
  const originalFetch = global.fetch, mode = process.env.PLANNER_MODE;
  const request = { prompt: 'Explore a supported relationship' };
  const intent = { goal: request.prompt, concepts: [], interactions: [], observations: [], explicitConstraints: [], suggestedStructure: 'single' };
  const retrieval = assemblyCandidates(request, intent);
  const events = [];
  const budget = new GenerationBudget(undefined, (event, data) => events.push({ event, data }));
  Object.defineProperty(budget, 'llmConfig', { value: { provider: 'apertus', connection: 'local', label: 'Contract fixture', baseUrl: 'http://contract.invalid/v1', model: 'contract', structuredOutput: 'strict-json', timeout: 10000, maxTokens: 1024, concurrency: 1 } });
  let selectionCalls = 0;
  try {
    process.env.PLANNER_MODE = 'apertus';
    global.fetch = async (_url, options) => {
      const messages = JSON.parse(options.body).messages;
      const payload = JSON.parse(messages[1].content);
      assert.equal(payload.request, request.prompt);
      let result;
      if (messages[0].content.startsWith('Choose ONE offered')) {
        selectionCalls++;
        assert.deepEqual(payload.candidates[0].models, JSON.parse(JSON.stringify(modelCapabilities(retrieval.ranked[0].recipe))));
        result = { candidate: payload.candidates[0].id, complete: true };
      } else {
        assert.deepEqual(payload.models, JSON.parse(JSON.stringify(modelCapabilities(retrieval.ranked[0].recipe))));
        assert.equal(Array.isArray(payload.inputs), false, 'Input descriptors are keyed by stable identity');
        assert.ok(Object.keys(payload.inputs).every(id => /^input[0-9]+$/.test(id)));
        result = { supported: true, inputs: [] };
      }
      return Response.json({ choices: [{ message: { content: JSON.stringify(result) } }] });
    };
    const plan = await selectAssemblyPlan(request, intent, budget, retrieval);
    assert.equal(selectionCalls, 1, 'Uses the existing selection call');
    assert.deepEqual(plan.activities, [retrieval.cards[0].candidate]);
    const response = events.find(event => event.event === 'assembly_plan.response');
    assert.deepEqual(Object.keys(response.data.result), ['candidate', 'complete']);
    console.log('Original selection response and shared executable capability context verified (mocked transport).');
  } finally {
    global.fetch = originalFetch;
    if (mode === undefined) delete process.env.PLANNER_MODE; else process.env.PLANNER_MODE = mode;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
