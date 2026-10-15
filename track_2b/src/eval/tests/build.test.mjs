import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fixtureRun } from './fixtures.mjs';

test('standalone build ships current campaign assets only and rejects missing images', () => {
  const root = mkdtempSync(join(tmpdir(), 'eval-static-build-'));
  try {
    const original = resolve(import.meta.dirname, '..');
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'public/benchmarks'), { recursive: true });
    cpSync(join(original, 'scripts/build.mjs'), join(root, 'scripts/build.mjs'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    for (const file of ['index.html', 'style.css', 'app.js', 'state.js', 'campaign.js']) {
      cpSync(join(original, 'public', file), join(root, 'public', file));
    }
    const current = fixtureRun(); current.id = current.modelSlug; current.current = true;
    const modelDir = join(root, 'public/benchmarks', current.modelSlug);
    mkdirSync(join(modelDir, 'images'), { recursive: true });
    current.rows.forEach(row => {
      row.sourceRunId = 'fixture';
      if (row.screenshot) {
        row.screenshot = `/benchmarks/${current.modelSlug}/images/${row.id}.png?version=fixture`;
        writeFileSync(join(modelDir, 'images', `${row.id}.png`), 'fixture image');
      }
    });
    writeFileSync(join(modelDir, 'current.json'), JSON.stringify(current));
    writeFileSync(join(root, 'public/benchmarks/archive-index.json'), '{}');
    const model = { id: current.id, modelSlug: current.modelSlug, path: `/benchmarks/${current.modelSlug}/current.json` };
    writeFileSync(join(root, 'public/benchmarks/index.json'), JSON.stringify({ protocolVersion: 1, models: [model, { id: 'retired', modelSlug: 'gemma-3-12b', path: '/missing.json' }] }));
    execFileSync(process.execPath, [join(root, 'scripts/build.mjs')]);
    assert.equal(JSON.parse(readFileSync(join(root, 'dist/benchmarks/index.json'))).models.length, 1);
    assert.ok(existsSync(join(root, 'dist/benchmarks', current.modelSlug, 'images/question-1.png')));
    assert.equal(existsSync(join(root, 'dist/benchmarks/archive-index.json')), false);
    rmSync(join(modelDir, 'images/question-1.png'));
    assert.throws(() => execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'pipe' }), /ENOENT/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
