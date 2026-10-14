import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { campaignModels } from '../public/campaign.js';
import { latestDataset, validateRun } from '../public/state.js';

const root = resolve(import.meta.dirname, '..');
const source = realpathSync(join(root, 'public'));
const output = join(root, 'dist');
const index = JSON.parse(readFileSync(join(source, 'benchmarks/index.json'), 'utf8'));
assert.ok(index.protocolVersion === 1 && Array.isArray(index.models), 'Publish current benchmark results before building the evaluator.');
const models = index.models.filter(model => campaignModels.includes(model.modelSlug));
assert.equal(new Set(models.map(model => model.modelSlug)).size, models.length, 'Duplicate campaign model.');
const manifests = models.map(model => {
  assert.equal(model.id, model.modelSlug);
  assert.equal(model.path, `/benchmarks/${model.modelSlug}/current.json`);
  const manifest = validateRun(JSON.parse(readFileSync(join(source, model.path.slice(1)), 'utf8')));
  assert.ok(manifest.current && manifest.id === model.id && manifest.modelSlug === model.modelSlug, 'Invalid current model identity.');
  return manifest;
});
latestDataset(manifests); // Reject mixed prompt sets before publishing a static comparison.

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
function copy(path) {
  const actual = realpathSync(join(source, path));
  assert.ok(actual.startsWith(source + sep), 'Deployment assets must be contained in the evaluator.');
  const target = join(output, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(actual, target);
}
for (const file of ['index.html', 'style.css', 'app.js', 'state.js', 'campaign.js']) copy(file);
let images = 0;
for (const model of manifests) {
  copy(`benchmarks/${model.modelSlug}/current.json`);
  for (const row of model.rows) {
    if (!row.screenshot) continue;
    copy(row.screenshot.split('?')[0].slice(1));
    images++;
  }
}
writeFileSync(join(output, 'benchmarks/index.json'), JSON.stringify({ protocolVersion: 1, models }, null, 2) + '\n');
console.log(`Built standalone evaluator: ${models.length} campaign models, ${images} current images. Output: ${output}`);
