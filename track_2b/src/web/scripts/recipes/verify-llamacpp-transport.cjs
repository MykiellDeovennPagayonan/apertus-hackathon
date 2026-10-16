const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { load } = require('../test-loader.cjs');
const { requestStructured } = load('src/simulations/creation-and-editing/input/inference/transport.ts');
const { readLlmConfig } = load('src/simulations/creation-and-editing/input/inference/config.ts');
const { GenerationBudget } = load('src/simulations/creation-and-editing/budget.ts');

const previousDeadline = process.env.PLANNER_TIMEOUT_MS;
try {
  process.env.PLANNER_TIMEOUT_MS = '1200000';
  assert.equal(new GenerationBudget().signal.aborted, false);
  process.env.PLANNER_TIMEOUT_MS = '1200001';
  assert.throws(() => new GenerationBudget(), /Invalid PLANNER_TIMEOUT_MS/);
} finally {
  if (previousDeadline === undefined) delete process.env.PLANNER_TIMEOUT_MS;
  else process.env.PLANNER_TIMEOUT_MS = previousDeadline;
}

(async () => {
  let mode = 'success';
  let calls = 0;
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    calls++;
    assert.equal(req.url, '/v1/chat/completions');
    assert.equal(JSON.parse(body).stream, false);
    if (mode === 'redirect') {
      res.writeHead(307, { Location: '/elsewhere' });
      return res.end();
    }
    if (mode === 'oversized') return res.end('x'.repeat(128001));
    if (mode === 'cancel-body') res.writeHead(200).flushHeaders();
    const payload = JSON.stringify({ choices: [{ message: { content: '{"ready":true}' }, finish_reason: 'stop' }] });
    const timer = setTimeout(() => {
      res.write(payload.slice(0, 20));
      res.end(payload.slice(20));
    }, mode.startsWith('cancel') ? 500 : 30);
    res.on('close', () => clearTimeout(timer));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const config = readLlmConfig({
    APERTUS_LOCAL_RUNTIME: 'llamacpp',
    LLM_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`,
    APERTUS_STRUCTURED_OUTPUT: 'strict-json',
    APERTUS_TIMEOUT_MS: '1000',
  });
  const generate = (overrides = {}, signal) => requestStructured(
    [{ role: 'user', content: 'Return JSON' }], JSON.parse, 'Fix JSON', signal,
    { config: { ...config, ...overrides }, maxRepairsPerIssue: 0 },
  );
  const originalFetch = global.fetch;
  // Simulate the fetch transport failing before the configured inference deadline.
  global.fetch = () => { throw new Error('UND_ERR_HEADERS_TIMEOUT'); };
  try {
    assert.deepEqual(await generate(), { ready: true });
    mode = 'redirect';
    const before = calls;
    await assert.rejects(generate(), error => error.status === 502 && /HTTP 307/.test(error.message));
    assert.equal(calls, before + 1, 'Redirects must not be followed');
    mode = 'oversized';
    await assert.rejects(generate(), /exceeds bounds/);
    for (mode of ['cancel-headers', 'cancel-body']) {
      await assert.rejects(generate({ timeout: 50 }), error => error.status === 504);
    }
    await assert.rejects(generate({}, AbortSignal.timeout(50)), error => error.status === 499);
    mode = 'success';
    assert.deepEqual(await generate(), { ready: true }, 'Cancellation must release the inference slot');
    console.log('llama.cpp transport: delayed/chunked JSON, redirects, bounds, deadlines, cancellation, and slot release passed.');
  } finally {
    global.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
