import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { benchmarks } from '../benchmarks.mjs';

// Exercise the actual forty-prompt spec/reporter against a deterministic local app.
const requests = new Map();
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><textarea aria-label="Describe an experiment…"></textarea><button id="create">Create</button>
<div class="command-bar__status"></div><div class="workspace-stage"></div><div class="workspace-composer"><textarea></textarea></div>
<script>document.getElementById('create').onclick=async()=>{
 const announcer=document.createElement('next-route-announcer');
 announcer.attachShadow({mode:'open'}).innerHTML='<div id="__next-route-announcer__" role="alert" style="position:absolute;height:1px;width:1px;clip:rect(0,0,0,0)">Pick an experiment.</div>';
 document.body.appendChild(announcer);
 const status=document.querySelector('.command-bar__status');status.className='command-bar__status command-bar__status--working';
 const requestId=crypto.randomUUID();const response=await fetch('/api/apertus',{method:'POST',body:JSON.stringify({requestId,prompt:document.querySelector('textarea').value})});
 const result=await response.json();status.className='command-bar__status';
 if(!response.ok){status.classList.add('command-bar__status--error');status.textContent='Fixture failure';return;}
 document.querySelector('.workspace-stage').innerHTML='<h1>Fixture experiment</h1>';status.textContent='Ready';
 if(result.alert)document.querySelector('.workspace-stage').innerHTML+='<p role="alert">Actual experiment error</p>';
};</script></body></html>`;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/api/apertus') {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    const index = benchmarks.findIndex(item => item.prompt === body.prompt);
    const failed = index === 1;
    requests.set(body.requestId, { terminal: failed ? 'failed' : 'created', elapsedMs: 10,
      validationReached: !failed, firstPass: failed ? null : index !== 0,
      composerFeedback: index === 0 ? 1 : 0, schemaRepairs: 0, deterministicRepairs: 0 });
    response.writeHead(failed ? 422 : 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ready: !failed, alert: index === 2 }));
  } else if (url.pathname === '/api/benchmark') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ measurements: requests.get(url.searchParams.get('id')) }));
  } else { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const runId = `fixture-runner-${Date.now()}`;
const root = resolve(import.meta.dirname, '..');
const runDir = join(root, 'runs', runId);
try {
  const env = { ...process.env, BENCHMARK_URL: `http://127.0.0.1:${server.address().port}`,
    APERTUS_BENCHMARK_RUN_ID: runId, BENCHMARK_REQUIRE_MEASUREMENTS: 'true' };
  delete env.BENCHMARK_MODEL_SLUG; delete env.BENCHMARK_CONFIGURATION; delete env.BENCHMARK_STORAGE_STATE;
  const child = spawn(process.execPath, [join(root, 'node_modules/@playwright/test/cli.js'), 'test'], { cwd: root, env, stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  assert.equal(code, 1, 'Fixture failures must keep the command unsuccessful');
  const run = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8'));
  assert.equal(run.complete, true); assert.equal(run.rows.length, 40); assert.equal(run.summary.passed, 38);
  assert.equal(requests.size, 40); assert.equal(run.rows[1].status, 'ERROR');
  assert.equal(run.rows[0].status, 'PASS', 'Navigation announcements must not count as errors');
  assert.equal(run.rows[2].status, 'ERROR');
  assert.ok(run.rows[2].errors.some(error => error.includes('Actual experiment error')), 'Genuine alerts must still fail');
  assert.equal(run.summary.firstPass, 38); assert.equal(run.summary.unknownMeasurements, 0);
  for (const row of run.rows.filter(row => row.status === 'PASS')) {
    assert.ok(row.generationMs >= 0 && row.generationMs < 2000, 'Latency must exclude the two-second observation delay');
    assert.ok(Number(row.seconds) * 1000 > row.generationMs + 1900);
    assert.ok(row.files.some(file => file.name === 'result'));
  }
  console.log('Actual forty-prompt runner passed: 38 PASS/2 preserved ERROR, navigation announcements excluded, genuine alerts detected, all measurements and no retries. No provider calls.');
} finally {
  await new Promise(resolve => server.close(resolve));
  await rm(runDir, { recursive: true, force: true });
}
