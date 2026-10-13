import { test, expect } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { benchmarks } from './benchmarks.mjs';

const evidence = new Map();
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '(invalid URL)';
  }
};

test.afterEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(30_000);
  const record = evidence.get(testInfo.testId);
  if (!record) return;
  if (record.submittedAt !== undefined && record.endedAt === undefined) record.endedAt = performance.now();
  // Hooks have their own bounded cleanup allowance, including after a test timeout.
  const capture = async (name) => {
    try {
      const path = testInfo.outputPath(`${name}.png`);
      await page.screenshot({ path, fullPage: true, timeout: 10_000 });
      await testInfo.attach(name, { path, contentType: 'image/png' });
    } catch (error) {
      record.log('screenshot-error', { message: error.message });
      if (testInfo.status === 'passed') throw error;
    }
  };
  try {
    await capture('result');
    if (testInfo.status === 'passed') expect(record.errors).toEqual([]);
    if (testInfo.status !== 'passed') {
      const details = page.locator('.command-bar__details-action');
      if (await details.isVisible()) {
        await details.click({ timeout: 3_000 });
        record.log('error-details', {
          message: await page.locator('.command-bar__popover').innerText({ timeout: 3_000 }),
        });
        await capture('error-details');
      }
    }
  } finally {
    let measurements = null;
    if (process.env.BENCHMARK_REQUIRE_MEASUREMENTS === 'true' && record.requestId) {
      try {
        const response = await page.request.get(`/api/benchmark?id=${encodeURIComponent(record.requestId)}`, { timeout: 8_000 });
        if (response.ok()) measurements = (await response.json()).measurements;
      } catch { record.log('measurement-unavailable', { requestId: record.requestId }); }
    }
    const metricPath = testInfo.outputPath('measurements.json');
    writeFileSync(metricPath, JSON.stringify({
      requestId: record.requestId ?? null,
      generationMs: record.rendered && record.submittedAt !== undefined ? record.endedAt - record.submittedAt : null,
      observedMs: record.submittedAt !== undefined ? record.endedAt - record.submittedAt : null,
      measurements,
    }));
    await testInfo.attach('measurements', { path: metricPath, contentType: 'application/json' });
    await testInfo.attach('events', { path: record.path, contentType: 'application/x-ndjson' });
    evidence.delete(testInfo.testId);
    if (process.env.BENCHMARK_REQUIRE_MEASUREMENTS === 'true' && record.requestId && !measurements?.terminal)
      throw new Error('Missing terminal benchmark measurements; saved as unknown, never a first-pass success.');
  }
});

for (const benchmark of benchmarks) {
  test(`${String(benchmark.number).padStart(2, '0')} ${benchmark.id}`, async ({ page }, testInfo) => {
    const started = Date.now();
    mkdirSync(testInfo.outputDir, { recursive: true });
    const path = testInfo.outputPath('events.jsonl');
    const errors = [];
    const log = (event, data) => {
      appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), event, ...data })}\n`);
    };
    const fail = (event, data) => {
      errors.push({ event, ...data });
      log(event, data);
    };
    const record = { path, log, errors };
    evidence.set(testInfo.testId, record);
    log('start', { ...benchmark, timeoutMs: 300_000 });
    page.on('pageerror', (error) => fail('page-error', { message: error.stack || error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') fail('console-error', { message: message.text() });
    });
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/apertus' && request.method() === 'POST') {
        let requestId;
        try { requestId = request.postDataJSON()?.requestId; } catch {}
        record.requestId = requestId;
        record.submittedAt ??= performance.now();
        log('generation-request', { requestId, method: request.method(), url: safeUrl(request.url()) });
      }
    });
    page.on('response', (response) => {
      const data = { status: response.status(), method: response.request().method(), url: safeUrl(response.url()) };
      if (response.status() >= 400) fail('http-error', data);
      else if (new URL(response.url()).pathname === '/api/apertus') log('generation-response', data);
    });
    page.on('requestfailed', (request) => {
      const message = request.failure()?.errorText || 'Unknown network failure';
      const data = { method: request.method(), url: safeUrl(request.url()), message };
      // requestGeneration cancels its stream reader in finally, even after a valid result.
      if (message.includes('ERR_ABORTED') && new URL(request.url()).pathname === '/api/apertus') {
        log('generation-stream-cancellation', data);
      } else if (message.includes('ERR_ABORTED') && request.method() === 'GET') log('navigation-cancellation', data);
      else fail('network-error', data);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const composer = page.getByRole('textbox', { name: 'Describe an experiment…', exact: true });
    await expect(composer).toBeEditable();
    // An explicitly supplied account must resolve before its startup effect can reset a request.
    if (process.env.BENCHMARK_STORAGE_STATE) {
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    }
    await composer.fill(benchmark.prompt);
    const promptScreenshot = testInfo.outputPath('prompt.png');
    await page.screenshot({ path: promptScreenshot, fullPage: true, timeout: 10_000 });
    await testInfo.attach('prompt', { path: promptScreenshot, contentType: 'image/png' });
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    log('submitted', { prompt: benchmark.prompt });

    const remaining = () => Math.max(1, testInfo.timeout - (Date.now() - started));
    const terminal = await page.waitForFunction(() => {
      const status = document.querySelector('.command-bar__status');
      const workspace = document.querySelector('.workspace-stage > *');
      const composer = document.querySelector('.workspace-composer textarea');
      if (status?.classList.contains('command-bar__status--error') ||
          (!workspace && status?.classList.contains('command-bar__status--info'))) {
        return { status: 'ERROR', message: status.textContent.trim() };
      }
      // Apply stays disabled for an empty draft; an editable composer signals completion.
      if (workspace && composer && !composer.readOnly &&
          !status?.classList.contains('command-bar__status--working')) {
        return { status: 'RENDERED', message: status?.textContent.trim() || 'Generation rendered' };
      }
      return false;
    }, undefined, { timeout: remaining() });
    const result = await terminal.jsonValue();
    record.endedAt = performance.now();
    record.rendered = result.status === 'RENDERED';
    log('terminal', result);
    expect(result.status, result.message).toBe('RENDERED');
    await expect(page.locator('.workspace-stage > *').first()).toBeVisible();
    // Observe only startup/render errors, without interacting or checking correctness.
    await page.waitForTimeout(2_000);
    // Next's clipped route announcer uses role=alert for navigation, not errors.
    const alerts = await page.getByRole('alert').and(page.locator(':not(#__next-route-announcer__)')).filter({ visible: true }).allTextContents();
    for (const message of alerts.filter((value) => value.trim())) fail('visible-alert', { message });
    expect(errors, `Observed errors:\n${JSON.stringify(errors, null, 2)}`).toEqual([]);
    log('accepted', { message: 'Rendered without observed errors; correctness not evaluated' });
  });
}
