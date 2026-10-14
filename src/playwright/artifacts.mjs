import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, unlinkSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { validateRun } from '../eval/public/state.js';

export const artifactRoot = resolve(import.meta.dirname, '../eval/public/benchmarks');
export function safeId(value) {
  assert.equal(typeof value, 'string', 'Artifact ID must be a string');
  assert.match(value, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/, 'Invalid artifact ID');
  return value;
}
export function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}
export function summary(rows) {
  const passed = rows.filter(row => row.status === 'PASS');
  const times = passed.map(row => row.generationMs).filter(Number.isFinite).sort((a, b) => a - b);
  const first = rows.filter(row => row.measurements?.firstPass === true).length;
  const reached = rows.filter(row => row.measurements?.validationReached).length;
  const midpoint = Math.floor(times.length / 2);
  return {
    total: rows.length, passed: passed.length, successRate: passed.length / rows.length,
    firstPass: first, firstPassRate: first / rows.length, validationReached: reached,
    firstPassAmongValidated: reached ? first / reached : null,
    unknownMeasurements: rows.filter(row => !row.measurements?.terminal).length,
    zeroRepairCompletions: passed.filter(row => row.measurements?.terminal &&
      row.measurements.schemaRepairs + row.measurements.composerFeedback + row.measurements.deterministicRepairs === 0).length,
    latencySamples: times.length,
    medianMs: times.length ? (times.length % 2 ? times[midpoint] : (times[midpoint - 1] + times[midpoint]) / 2) : null,
    p95Ms: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
    statuses: Object.fromEntries([...new Set(rows.map(row => row.status))].map(status => [status, rows.filter(row => row.status === status).length])),
  };
}

// One active result per model/question; archived evidence never controls gallery grouping.
function updateCurrent(run, root) {
  const path = join(root, run.modelSlug, 'current.json');
  const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
  if (previous) assert.equal(previous.promptHash, run.promptHash, 'Cannot mix prompt sets in a model gallery');
  const current = structuredClone(previous ?? run);
  current.id = run.modelSlug;
  current.current = true;
  current.rows = run.rows.map((row, index) => {
    const old = previous?.rows[index];
    if (!['PASS', 'ERROR', 'TIMEOUT', 'INTERRUPTED'].includes(row.status) ||
        (old?.sourceStartedAt && old.sourceStartedAt > run.startedAt)) {
      return old ?? { ...row, screenshot: null, screenshotAvailable: false };
    }
    const next = { ...row, sourceRunId: run.id, sourceStartedAt: run.startedAt,
      sourceConfiguration: run.configuration, screenshot: null, screenshotAvailable: false };
    const target = join(root, run.modelSlug, 'images', `${row.id}.png`);
    if (row.status === 'PASS' && row.screenshot) {
      const source = resolve(root, row.screenshot.slice('/benchmarks/'.length));
      assert.ok(source.startsWith(`${resolve(root)}/`), 'Screenshot must belong to evaluator assets');
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, `${target}.tmp`);
      renameSync(`${target}.tmp`, target);
      next.screenshot = `/benchmarks/${run.modelSlug}/images/${row.id}.png?version=${run.id}`;
      next.screenshotAvailable = true;
    } else if (existsSync(target)) {
      unlinkSync(target);
    }
    return next;
  });
  if (!previous || run.startedAt >= previous.startedAt) {
    current.startedAt = run.startedAt;
    current.endedAt = run.endedAt;
    current.configuration = run.configuration;
  }
  current.complete = current.rows.every(row => ['PASS', 'ERROR', 'TIMEOUT'].includes(row.status));
  delete current.sourceHash;
  validateRun(current);
  atomicJson(path, current);
  return { id: current.id, modelSlug: current.modelSlug, startedAt: current.startedAt,
    complete: current.complete, path: `/benchmarks/${current.modelSlug}/current.json` };
}

export function migrateGallery(root = artifactRoot) {
  const path = join(root, 'index.json');
  if (!existsSync(path)) return;
  const index = JSON.parse(readFileSync(path, 'utf8'));
  const models = new Map((index.models ?? []).map(model => [model.modelSlug, model]));
  for (const item of [...index.runs].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    safeId(item.modelSlug); safeId(item.id);
    assert.equal(item.path, `/benchmarks/${item.modelSlug}/${item.id}/run.json`);
    const run = validateRun(JSON.parse(readFileSync(join(root, item.modelSlug, item.id, 'run.json'), 'utf8')));
    const model = updateCurrent(run, root);
    models.set(model.modelSlug, model);
  }
  index.models = [...models.values()];
  atomicJson(path, index);
}

export function publishRun(runDir, root = artifactRoot) {
  const run = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'));
  validateRun(run);
  assert.equal(run.protocolVersion, 1);
  safeId(run.id); safeId(run.modelSlug);
  assert.equal(run.rows.length, 40);
  assert.equal(new Set(run.rows.map(row => row.id)).size, 40);
  const destination = join(root, run.modelSlug, run.id);
  const manifest = join(destination, 'run.json');
  const sourceHash = createHash('sha256').update(JSON.stringify(run)).digest('hex');
  if (existsSync(manifest)) {
    const previous = JSON.parse(readFileSync(manifest, 'utf8'));
    assert.equal(previous.promptHash, run.promptHash, 'Cannot replace a different prompt set');
    assert.equal(previous.startedAt, run.startedAt, 'Cannot replace an earlier batch');
    assert.equal(JSON.stringify(previous.configuration), JSON.stringify(run.configuration), 'Cannot change batch configuration');
    assert.ok(!previous.complete || previous.sourceHash === sourceHash, 'Cannot change a completed batch');
  }
  mkdirSync(join(destination, 'images'), { recursive: true });
  const published = structuredClone(run);
  published.sourceHash = sourceHash;
  for (const row of published.rows) {
    safeId(row.id);
    const screenshot = row.files.find(file => file.name === 'result');
    row.screenshot = null;
    row.screenshotAvailable = false;
    if (screenshot) {
      const source = resolve(runDir, screenshot.path);
      assert.ok(source.startsWith(`${resolve(runDir)}/`), 'Screenshot must belong to the run');
      if (existsSync(source)) {
        const target = join(destination, 'images', `${row.id}.png`);
        copyFileSync(source, `${target}.tmp`);
        renameSync(`${target}.tmp`, target);
        row.screenshotAvailable = true;
        if (row.status === 'PASS') row.screenshot = `/benchmarks/${run.modelSlug}/${run.id}/images/${row.id}.png`;
      }
    }
    // Browser traces/error messages stay in runner evidence, not the public voting dataset.
    delete row.files; delete row.errors;
  }
  atomicJson(manifest, published);
  const indexPath = join(root, 'index.json');
  const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : { protocolVersion: 1, runs: [] };
  assert.equal(index.protocolVersion, 1);
  index.runs = index.runs.filter(item => item.id !== run.id);
  index.runs.push({ id: run.id, modelSlug: run.modelSlug, startedAt: run.startedAt, complete: run.complete,
    path: `/benchmarks/${run.modelSlug}/${run.id}/run.json` });
  const model = updateCurrent(published, root);
  index.models = (index.models ?? []).filter(item => item.modelSlug !== model.modelSlug);
  index.models.push(model);
  atomicJson(indexPath, index);
  return published;
}
