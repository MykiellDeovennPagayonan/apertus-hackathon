import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const target = new URL(process.env.BENCHMARK_URL || 'http://localhost:3000');
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
  throw new Error('BENCHMARK_URL must be an HTTP(S) app URL without credentials');
}
if (target.pathname !== '/' || target.search || target.hash) {
  throw new Error('BENCHMARK_URL must point to the app root, without query parameters');
}
process.env.APERTUS_BENCHMARK_RUN_ID ??= `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const runId = process.env.APERTUS_BENCHMARK_RUN_ID;

export default defineConfig({
  testDir: '.',
  testMatch: 'benchmark.spec.mjs',
  outputDir: resolve(import.meta.dirname, 'runs', runId, 'artifacts'),
  timeout: 300_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  repeatEach: 1,
  fullyParallel: false,
  maxFailures: 0,
  reporter: [['./reporter.mjs']],
  use: {
    baseURL: target.origin,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    storageState: process.env.BENCHMARK_STORAGE_STATE || undefined,
    // Only failure traces are retained; these can contain sensitive account data.
    trace: 'retain-on-failure',
  },
});
