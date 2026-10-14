import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const source = new URL('../../docs/agent-only/benchmark/final-benchmark-list.md', import.meta.url);
export const benchmarkText = readFileSync(source, 'utf8');
export const benchmarks = Array.from(benchmarkText.matchAll(
  /^(\d+)\. \[([a-z0-9-]+) —[^\n]+\n\s*\n\s*\*\*Prompt:\*\* “([^\n]+)”/gm,
), ([, number, id, prompt]) => ({ number: Number(number), id, prompt }));

// Refuse a partial or changed input format instead of silently running fewer prompts.
assert.equal(benchmarks.length, 40, 'Expected all 40 benchmark prompts');
assert.equal(new Set(benchmarks.map(({ id }) => id)).size, 40, 'Duplicate benchmark IDs');
benchmarks.forEach(({ number, prompt }, index) => {
  assert.equal(number, index + 1, 'Benchmark order must be 1 through 40');
  assert.ok(prompt.trim(), 'Benchmark prompt cannot be empty');
});
