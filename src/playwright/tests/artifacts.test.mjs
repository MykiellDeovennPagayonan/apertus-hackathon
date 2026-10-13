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
