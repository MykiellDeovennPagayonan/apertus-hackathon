import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicJson, publishRun, summary, safeId } from '../artifacts.mjs';
import { modelEnvironment } from '../models.mjs';
import { fixtureRun } from '../../eval/tests/fixtures.mjs';

test('publication is repeatable without generation, isolates models and preserves complete outcomes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apertus-artifacts-'));
  try {
    const runDir = join(dir, 'runner'), destination = join(dir, 'public'); mkdirSync(runDir);
    writeFileSync(join(runDir, 'result.png'), 'image fixture');
    const run = fixtureRun();
    run.rows.forEach(row => { delete row.screenshot; row.files = [{ name: 'result', path: 'result.png' }]; row.errors = ['private trace']; });
    atomicJson(join(runDir, 'run.json'), run);
    const published = publishRun(runDir, destination);
    assert.equal(published.rows[0].screenshot, '/benchmarks/apertus-1.5-8b/fixture-apertus/images/question-1.png');
    assert.equal(published.rows[2].screenshot, null);
    assert.equal(published.rows[0].errors, undefined);
    publishRun(runDir, destination);
    assert.equal(JSON.parse(readFileSync(join(destination, 'index.json'))).runs.length, 1);
    run.rows[0].status = 'ERROR'; atomicJson(join(runDir, 'run.json'), run);
    assert.throws(() => publishRun(runDir, destination), /completed batch/);
    run.id = 'different'; run.rows[0].files[0].path = '../outside.png'; atomicJson(join(runDir, 'run.json'), run);
    assert.throws(() => publishRun(runDir, destination), /belong to the run/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('summary keeps unknown evidence distinct and excludes timeout from latency', () => {
  const run = fixtureRun();
  const measured = summary(run.rows);
  assert.equal(measured.passed, 39); assert.equal(measured.firstPass, 38);
  assert.equal(measured.validationReached, 39); assert.equal(measured.unknownMeasurements, 1);
  assert.equal(measured.latencySamples, 39); assert.ok(measured.p95Ms < 300000);
  assert.throws(() => safeId('../escape'));
});

test('profiles select exactly one model, enforce credentials and avoid memory contamination', () => {
  assert.throws(() => modelEnvironment('apertus-1.5-8b', {}), /HF_TOKEN/);
  const apertus = modelEnvironment('apertus-1.5-8b', { HF_TOKEN: 'test', APERTUS_PROVIDER: 'local', LAYA_BASE_URL: 'http://127.0.0.1:43102' });
  assert.equal(apertus.APERTUS_PROVIDER, 'huggingface');
  assert.equal(apertus.LLM_MODEL, 'swiss-ai/Apertus-v1.5-8B');
  assert.equal(apertus.LAYA_BASE_URL, 'http://127.0.0.1:43102');
  const local = modelEnvironment('apertus-1.5-8b', { BENCHMARK_APERTUS_LOCAL: 'true', APERTUS_LOCAL_MODEL: 'Apertus-v1.5-8B', LAYA_BASE_URL: 'http://127.0.0.1:43102' });
  assert.equal(local.APERTUS_PROVIDER, 'local');
  assert.equal(local.LAYA_BASE_URL, 'http://127.0.0.1:43102');
  assert.throws(() => modelEnvironment('qwen3-8b', {}), /HF_TOKEN/);
  assert.throws(() => modelEnvironment('gpt-6-luna', {}), /OPENAI_API_KEY/);
  assert.throws(() => modelEnvironment('apertus-1.5-8b', { REPAIR_MEMORY_MODE: 'repair' }), /memory comparison/);
  assert.equal(modelEnvironment('qwen3-8b', { HF_TOKEN: 'test' }).LLM_MODEL, 'Qwen/Qwen3-8B:featherless-ai');
  assert.equal(modelEnvironment('llama-3.1-8b', { HF_TOKEN: 'test' }).LLM_MODEL, 'meta-llama/Llama-3.1-8B-Instruct:featherless-ai');
  assert.equal(modelEnvironment('mistral-small-3.1-24b', { HF_TOKEN: 'test' }).APERTUS_HF_BASE_URL, 'https://router.huggingface.co/featherless-ai/v1');
  assert.equal(modelEnvironment('mistral-small-3.1-24b', { HF_TOKEN: 'test', APERTUS_HF_BASE_URL: 'https://dedicated.example/v1/' }).APERTUS_HF_BASE_URL, 'https://dedicated.example/v1/');
  assert.equal(modelEnvironment('gpt-6.1-sol', { OPENAI_API_KEY: 'test' }).LLM_MODEL, 'gpt-6.1-sol');
  assert.equal(modelEnvironment('gpt-6.1-sol', { OPENAI_API_KEY: 'test' }).OPENAI_REASONING_EFFORT, 'low');
  assert.equal(modelEnvironment('gpt-6-luna', { OPENAI_API_KEY: 'test' }).OPENAI_REASONING_EFFORT, 'none');
  assert.throws(() => modelEnvironment('gpt-6.1-sol', { OPENAI_API_KEY: 'test', OPENAI_REASONING_EFFORT: 'none' }), /requires reasoning/);
  assert.equal(modelEnvironment('qwen3-32b', { HF_TOKEN: 'test', BENCHMARK_HF_MODEL: 'Qwen/Qwen3-32B:provider' }).LLM_MODEL, 'Qwen/Qwen3-32B:provider');
});

test('current gallery merges focused attempts per question, preserves other models and never restores stale successes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'apertus-current-'));
  try {
    const runner = join(dir, 'runner'), root = join(dir, 'public'); mkdirSync(runner);
    writeFileSync(join(runner, 'result.png'), 'original image');
    const prepare = run => {
      run.rows.forEach(row => { delete row.screenshot; row.files = row.status === 'PASS' ? [{ name: 'result', path: 'result.png' }] : []; });
      atomicJson(join(runner, 'run.json'), run);
      publishRun(runner, root);
    };
    const original = fixtureRun(); prepare(original);
    prepare(fixtureRun('qwen3-8b', 'qwen'));
    const focused = fixtureRun('apertus-1.5-8b', 'focused');
    focused.startedAt = '2026-10-15T01:00:00.000Z'; focused.complete = false;
    focused.rows.forEach(row => { row.status = 'NOT_RUN'; row.measurements = null; });
    focused.rows[0].status = 'PASS'; focused.rows[1].status = 'ERROR';
    writeFileSync(join(runner, 'result.png'), 'replacement image'); prepare(focused);
    const currentPath = join(root, original.modelSlug, 'current.json');
    let current = JSON.parse(readFileSync(currentPath));
    assert.equal(current.rows[0].sourceRunId, 'focused');
    assert.equal(current.rows[1].status, 'ERROR');
    assert.equal(current.rows[1].screenshot, null);
    assert.equal(current.rows[3].sourceRunId, original.id, 'Unattempted prompts retain their last result');
    assert.equal(readFileSync(join(root, original.modelSlug, 'images/question-1.png'), 'utf8'), 'replacement image');
    assert.equal(JSON.parse(readFileSync(join(root, 'qwen3-8b/current.json'))).rows[0].sourceRunId, 'qwen');
    prepare(original); // Re-importing old evidence cannot replace newer per-question results.
    current = JSON.parse(readFileSync(currentPath));
    assert.equal(current.rows[0].sourceRunId, 'focused');
    assert.equal(current.rows[1].status, 'ERROR');
    const index = JSON.parse(readFileSync(join(root, 'index.json')));
    assert.equal(index.models.length, 2);
    assert.ok(index.models.every(model => model.path.endsWith('/current.json')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
