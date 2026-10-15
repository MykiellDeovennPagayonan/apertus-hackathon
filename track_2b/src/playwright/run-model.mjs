import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, closeSync, unlinkSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { hostname, cpus, platform, arch, totalmem } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { modelEnvironment } from './models.mjs';
import { artifactRoot, atomicJson, safeId } from './artifacts.mjs';

const root = resolve(import.meta.dirname, '../..');
const webDir = join(root, 'src/web');
const children = new Set();
let interrupted = false;
const cancellation = new AbortController();
const boundedSignal = milliseconds => AbortSignal.any([cancellation.signal, AbortSignal.timeout(milliseconds)]);
function stop(child, signal = 'SIGTERM') {
  if (child.exitCode === null && child.signalCode === null) {
    try { process.kill(-child.pid, signal); } catch { /* already exited */ }
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = true;
  cancellation.abort();
  for (const child of children) stop(child, signal);
});
function launch(args, options = {}) {
  const child = spawn(process.execPath, args, { detached: true, ...options });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}
function completion(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(signal ? 130 : code ?? 1));
  });
}

async function main() {
  const slug = process.argv[2];
  const firstOnly = process.argv[3] === '--first';
  const caseFlag = process.argv[3]?.startsWith('--cases=') ? process.argv[3].slice(8) : null;
  const cases = caseFlag === null ? null : caseFlag.split(',').map(Number);
  if (cases && (!cases.length || cases.some(value => !Number.isInteger(value) || value < 1 || value > 40) || new Set(cases).size !== cases.length))
    throw new Error('Focused cases must be distinct question numbers from 1 through 40.');
  if (process.argv.length > (firstOnly || cases ? 4 : 3)) throw new Error('Usage: run-model.mjs <model> [--first | --cases=1,2]');
  const env = modelEnvironment(slug);
  const next = join(webDir, 'node_modules/next/dist/bin/next');
  const playwright = join(root, 'src/playwright/node_modules/@playwright/test/cli.js');
  if (!existsSync(next) || !existsSync(playwright)) throw new Error('Install web and src/playwright dependencies first; see src/eval/README.md.');
  safeId(slug);
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
  const runDir = join(root, 'src/playwright/runs', runId);
  mkdirSync(join(root, 'src/playwright/runs'), { recursive: true });
  mkdirSync(runDir, { recursive: false });
  mkdirSync(artifactRoot, { recursive: true });
  const publicationProbe = join(artifactRoot, `.write-check-${process.pid}`);
  const publicationHandle = openSync(publicationProbe, 'wx');
  closeSync(publicationHandle);
  unlinkSync(publicationProbe);
  // Check publication permissions before any provider call.
  const probe = join(runDir, 'setup.json');
  atomicJson(probe, { stage: 'configuration', scored: false });
  const net = createServer();
  await new Promise((resolve, reject) => { net.once('error', reject); net.listen(0, '127.0.0.1', resolve); });
  const port = net.address().port;
  await new Promise(resolve => net.close(resolve));
  env.BENCHMARK_URL = `http://127.0.0.1:${port}`;
  env.BENCHMARK_SCOPE = firstOnly ? 'first-prompt' : cases ? 'focused-trial' : 'full-batch';
  env.APERTUS_BENCHMARK_RUN_ID = runId;
  env.APERTUS_BROWSER_TEST_DIR = '.next-benchmark';
  const log = openSync(join(runDir, 'web.log'), 'wx');
  const server = launch([next, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: webDir, env, stdio: ['ignore', log, log] });
  closeSync(log);
  const serverDone = completion(server);
  console.log(`Starting isolated ${slug} benchmark. Evidence: ${runDir}`);
  try {
    const deadline = Date.now() + 120_000;
    let ready = false;
    while (Date.now() < deadline && !interrupted) {
      if (server.exitCode !== null || server.signalCode !== null) throw new Error(`Web process exited. See ${join(runDir, 'web.log')}.`);
      try { ready = (await fetch(`${env.BENCHMARK_URL}/api/health`, { signal: boundedSignal(3000) })).ok; } catch {}
      if (ready) break;
      await delay(500);
    }
    if (!ready) throw new Error('Web readiness failed or was interrupted. No scored attempts started.');
    const response = await fetch(`${env.BENCHMARK_URL}/api/benchmark`, { signal: boundedSignal(30_000) });
    if (!response.ok) throw new Error('Benchmark metadata unavailable. Check model/decision configuration and web.log.');
    const configuration = await response.json();
    if (configuration.decision.provider === 'laya') {
      const status = await fetch(`${configuration.decision.baseUrl}/api/status`, { signal: boundedSignal(8000) });
      const runtime = status.ok ? await status.json() : null;
      if (runtime?.state !== 'ready') throw new Error('Laya is not ready. Start the decision service before the scored batch.');
      configuration.decision.runtimeModel = runtime.model;
    }
    if (slug === 'apertus-1.5-8b' && !/apertus.*v?1[.-]5.*8b/i.test(configuration.llm.model))
      throw new Error('Resolved Apertus model is not identifiable as Apertus 1.5 8B. Set the correct LLM_MODEL or server alias.');
    if (configuration.planner.timeoutMs >= 280_000 || configuration.llm.timeout >= 280_000)
      throw new Error('Pipeline/provider deadlines must leave room within the fixed 300-second browser budget.');
    let revision = null, dirty = null, fingerprint = null;
    try {
      revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
      dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim());
      const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard',
        'src/web/src', 'src/web/next.config.ts', 'src/web/package.json',
        'src/playwright/benchmark.spec.mjs', 'src/playwright/playwright.config.mjs', 'src/playwright/benchmarks.mjs'],
        { cwd: root, encoding: 'utf8' }).trim().split('\n').sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(file).update('\0').update(existsSync(join(root, file)) ? readFileSync(join(root, file)) : 'deleted').update('\0');
      fingerprint = hash.digest('hex');
    } catch {}
    configuration.source = { revision, dirty, fingerprint };
    configuration.capture = { width: 1440, height: 1000, testTimeoutMs: 300000, workers: 1, retries: 0 };
    configuration.hardware = { hostname: hostname(), platform: platform(), arch: arch(), cpu: cpus()[0]?.model, memoryBytes: totalmem(),
      inferenceHardware: env.BENCHMARK_INFERENCE_HARDWARE ?? 'not supplied', quantization: env.BENCHMARK_QUANTIZATION ?? 'not supplied' };
    env.BENCHMARK_CONFIGURATION = JSON.stringify(configuration);
    if (!firstOnly && !cases) {
      console.log('Running the provider setup smoke check (unscored, may use billed tokens).');
      const smoke = await fetch(`${env.BENCHMARK_URL}/api/benchmark`, { method: 'POST', headers: { 'X-Benchmark-Setup': 'true' }, signal: boundedSignal(180_000) });
      atomicJson(probe, { stage: 'provider-smoke', scored: false, ready: smoke.ok, configuration });
      if (!smoke.ok) throw new Error('Provider setup failed. Verify endpoint, model access and credentials before a scored batch.');
    } else atomicJson(probe, { stage: env.BENCHMARK_SCOPE, scored: false, configuration });
    if (interrupted) return 130;
    console.log(firstOnly || cases ? `Running a ${env.BENCHMARK_SCOPE} development check; this is not a complete benchmark batch.` : 'Setup passed. Running all 40 prompts once, sequentially.');
    const runner = launch([playwright, 'test', ...(firstOnly ? ['--grep', '01 projectile$'] : cases ? ['--grep', ` (${cases.map(value => String(value).padStart(2, '0')).join('|')}) `] : [])], { cwd: join(root, 'src/playwright'), env, stdio: 'inherit' });
    return await completion(runner);
  } finally {
    stop(server);
    await Promise.race([serverDone, delay(5000)]);
    stop(server, 'SIGKILL');
  }
}

try { process.exitCode = await main(); }
catch (error) { console.error(error.message); process.exitCode = interrupted ? 130 : 1; }
