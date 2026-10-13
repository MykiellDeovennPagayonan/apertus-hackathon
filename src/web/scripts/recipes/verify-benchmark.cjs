const assert = require('node:assert/strict');
const { load } = require('../test-loader.cjs');
const { BenchmarkMeasurements } = load('src/simulations/creation-and-editing/benchmark.ts');
const { GenerationBudget } = load('src/simulations/creation-and-editing/budget.ts');
const { requestStructured } = load('src/simulations/creation-and-editing/input/inference/transport.ts');
const { readLlmConfig } = load('src/simulations/creation-and-editing/input/inference/config.ts');
const config = readLlmConfig({ LLM_PROVIDER: 'openai', LLM_MODEL: 'gpt-6-luna', OPENAI_API_KEY: 'fixture-secret', LLM_STRUCTURED_OUTPUT: 'strict-json' });
const { requiresLayaComposition } = load('src/simulations/creation-and-editing/composer/policy.ts');
const { createProviderRequest } = load('src/simulations/creation-and-editing/input/inference/adapters.ts');

async function attempt(responses, verify, selectedConfig = config) {
  const measurements = new BenchmarkMeasurements();
  const trace = (event, data) => measurements.record(event, data, 100);
  const budget = new GenerationBudget(undefined, trace);
  let calls = 0;
  let outputCap;
  global.fetch = async (_url, options) => {
    outputCap = JSON.parse(options.body).max_output_tokens;
    calls++;
    const text = responses.shift();
    if (text === 'HTTP_ERROR') return new Response(null, { status: 503 });
    return Response.json({ status: 'completed', model: 'fixture-model', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } });
  };
  try {
    await requestStructured([{ role: 'user', content: 'fixture' }], JSON.parse, 'fix', undefined,
      { config: selectedConfig, maxTokens: 64, budget, stage: 'fixture', onEvent: (event, data) => trace(`fixture.${event}`, data), verify });
    trace('result', { status: 'created' });
  } catch { trace('failure', { status: 502 }); }
  return { ...measurements.snapshot(), calls, outputCap };
}

(async () => {
  const originalFetch = global.fetch;
  try {
    const first = await attempt(['{"value":1}'], result => assert.equal(result.value, 1));
    assert.equal(first.firstPass, true); assert.equal(first.validationChecks, 1);
    assert.equal(first.outputCap, 64);
    const reasoning = await attempt(['{"value":1}'], () => {}, { ...config, reasoningEffort: 'low' });
    assert.equal(reasoning.outputCap, config.maxTokens);
    const corrected = await attempt(['{"value":2}', '{"value":1}'], result => assert.equal(result.value, 1));
    assert.equal(corrected.terminal, 'created'); assert.equal(corrected.firstPass, false);
    assert.equal(corrected.composerFeedback, 1); assert.equal(corrected.schemaRepairs, 0);
    assert.equal(corrected.firstValidatorOutcomes[0].passed, false);
    const schema = await attempt(['bad json', '{"value":1}'], result => assert.equal(result.value, 1));
    assert.equal(schema.firstPass, true); assert.equal(schema.schemaRepairs, 1); assert.equal(schema.composerFeedback, 0);
    const failed = await attempt(['HTTP_ERROR'], () => {});
    assert.equal(failed.terminal, 'failed'); assert.equal(failed.firstPass, null); assert.equal(failed.validationReached, false);
    const deterministic = new BenchmarkMeasurements();
    deterministic.record('benchmark.validation', { id: 'runnable', passed: false }, 0);
    deterministic.record('benchmark.repair', { kind: 'deterministic' }, 1);
    deterministic.record('benchmark.validation', { id: 'runnable', passed: true }, 2);
    deterministic.record('result', { status: 'created' }, 3);
    assert.equal(deterministic.snapshot().firstPass, false); assert.equal(deterministic.snapshot().deterministicRepairs, 1);
    const timeout = new BenchmarkMeasurements(); timeout.record('failure', { status: 504 }, 300000);
    assert.equal(timeout.snapshot().firstPass, null); assert.equal(timeout.snapshot().elapsedMs, 300000);
    assert.equal(requiresLayaComposition({ COMPOSITION_DECISION_POLICY: 'required-laya', LLM_PROVIDER: 'openai' }), true);
    assert.throws(() => requiresLayaComposition({ COMPOSITION_DECISION_POLICY: 'required-laya', DECISION_PROVIDER: 'jev' }), /DECISION_PROVIDER=laya/);
    const localConfig = { ...config, provider: 'apertus', connection: 'local', localRuntime: 'llamacpp' };
    const wireSchema = { type: 'object', properties: { ready: { type: 'boolean' } }, required: ['ready'] };
    const localWire = createProviderRequest(localConfig, [], 128, wireSchema).body;
    assert.equal(localWire.reasoning_effort, 'none'); assert.ok(localWire.response_format.schema);
    const hostedWire = createProviderRequest({ ...localConfig, connection: 'huggingface' }, [], 128, wireSchema).body;
    assert.equal(hostedWire.reasoning_effort, undefined); assert.ok(hostedWire.response_format.json_schema);
    const qwenWire = createProviderRequest({ ...localConfig, connection: 'huggingface', model: 'Qwen/Qwen3-8B:featherless-ai' }, [], 128, wireSchema).body;
    assert.deepEqual(qwenWire.chat_template_kwargs, { enable_thinking: false });
    assert.equal(hostedWire.chat_template_kwargs, undefined);
    assert.equal(readLlmConfig({ APERTUS_PROVIDER: 'huggingface', APERTUS_HF_MODEL: 'model', HF_TOKEN: 'fixture' }).label, 'Hugging Face');
    const { startTrace, readTrace } = load('src/simulations/creation-and-editing/diagnostics.ts');
    const route = load('src/app/api/benchmark/route.ts');
    const original = { ...process.env };
    try {
      Object.assign(process.env, { BENCHMARK_MEASUREMENTS: 'true', NODE_ENV: 'development', LLM_PROVIDER: 'openai', LLM_MODEL: 'gpt-6-luna', OPENAI_API_KEY: 'fixture-secret' });
      const trace = startTrace('fixture-request', 'private prompt');
      for (let i = 0; i < 300; i++) trace('noise', { body: 'private body' });
      trace('benchmark.validation', { id: 'final', passed: true }); trace('result', { status: 'created' });
      trace('failure', { status: 499 });
      assert.equal(readTrace('fixture-request').events.length, 240);
      assert.equal(readTrace('fixture-request').measurements.firstPass, true);
      assert.equal(readTrace('fixture-request').measurements.terminal, 'created');
      const metadata = await route.GET(new Request('http://127.0.0.1/api/benchmark')).text();
      assert.ok(!metadata.includes('fixture-secret'));
      const result = await route.GET(new Request('http://127.0.0.1/api/benchmark?id=fixture-request')).text();
      assert.ok(!result.includes('private prompt') && !result.includes('private body'));
      assert.equal(route.GET(new Request('https://example.com/api/benchmark')).status, 404);
      process.env.NODE_ENV = 'production'; assert.equal(route.GET(new Request('http://127.0.0.1/api/benchmark')).status, 404);
    } finally {
      for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
      Object.assign(process.env, original);
    }
    for (let i = 0; i < 500; i++) deterministic.record('noise', {}, i);
    assert.equal(deterministic.snapshot().validationChecks, 2);
    console.log('Benchmark validation, feedback, schema repair, deterministic repair and unknown measurements passed.');
  } finally { global.fetch = originalFetch; }
})().catch(error => { console.error(error); process.exitCode = 1; });
