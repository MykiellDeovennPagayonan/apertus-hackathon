import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, relative, join, basename } from 'node:path';
import { benchmarks, benchmarkText } from './benchmarks.mjs';
import { atomicJson, publishRun, summary } from './artifacts.mjs';

const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
const plain = (value) => String(value).replace(/\x1b\[[0-9;]*m/g, '');

export default class BenchmarkReporter {
  onBegin(config) {
    this.dir = dirname(config.projects[0].outputDir);
    mkdirSync(this.dir, { recursive: true });
    this.started = new Date().toISOString();
    this.target = config.projects[0].use.baseURL;
    this.configuration = process.env.BENCHMARK_CONFIGURATION ? JSON.parse(process.env.BENCHMARK_CONFIGURATION) : null;
    this.rows = benchmarks.map((item) => ({ ...item, status: 'NOT_RUN', seconds: '—', files: [], errors: [] }));
    this.state = 'RUNNING';
    this.progress(`Run folder: ${this.dir}`);
    this.write();
  }

  progress(message) {
    const line = `${new Date().toISOString()} ${plain(message)}`;
    console.log(line);
    appendFileSync(join(this.dir, 'progress.log'), `${line}\n`);
  }

  onTestBegin(test) {
    const row = this.rows[Number(test.title.slice(0, 2)) - 1];
    row.status = 'RUNNING';
    this.progress(`[${row.number}/40] Starting ${row.id} (one attempt, 5-minute timeout)`);
    this.write();
  }

  onTestEnd(test, result) {
    const row = this.rows[Number(test.title.slice(0, 2)) - 1];
    row.status = result.status === 'passed' ? 'PASS' : result.status === 'timedOut' ? 'TIMEOUT'
      : result.status === 'interrupted' ? 'INTERRUPTED' : 'ERROR';
    row.seconds = (result.duration / 1000).toFixed(1);
    row.errors = result.errors.map((error) => plain(error.message || error.value || 'Unknown error'));
    row.files = result.attachments.filter(({ path }) => path).map(({ name, path }) => ({
      name, path: relative(this.dir, path).split('\\').join('/'),
    }));
    const metricFile = result.attachments.find(file => file.name === 'measurements' && file.path);
    if (metricFile) Object.assign(row, JSON.parse(readFileSync(metricFile.path, 'utf8')));
    const completed = this.rows.filter(({ status }) => !['NOT_RUN', 'RUNNING'].includes(status)).length;
    const passed = this.rows.filter(({ status }) => status === 'PASS').length;
    this.progress(`[${completed}/40 complete] ${row.id}: ${row.status} — ${passed} PASS, ${completed - passed} non-pass; ${row.seconds}s`);
    this.write();
  }

  onError(error) {
    this.globalErrors ??= [];
    this.globalErrors.push(plain(error.message || error.value || 'Runner error'));
    this.progress(`Runner error: ${this.globalErrors.at(-1)}`);
    this.write();
  }

  onEnd(result) {
    this.state = result.status === 'interrupted' ? 'INTERRUPTED' : 'FINISHED';
    this.ended = new Date().toISOString();
    this.write();
    const passed = this.rows.filter(({ status }) => status === 'PASS').length;
    this.progress(`Finished: ${passed}/40 PASS (${(passed / 40 * 100).toFixed(1)}%). Report: ${join(this.dir, 'report.md')}`);
    if (process.env.BENCHMARK_MODEL_SLUG) {
      try {
        publishRun(this.dir);
        this.progress('Published screenshots and run.json to src/eval.');
      } catch (error) {
        this.progress(`Publication failed: ${error.message}. Evidence remains in ${this.dir}; use publish.mjs to retry without regeneration.`);
        process.exitCode = 1;
      }
    }
  }

  write() {
    atomicJson(join(this.dir, 'run.json'), {
      protocolVersion: 1, id: basename(this.dir), modelSlug: process.env.BENCHMARK_MODEL_SLUG || 'unconfigured',
      scope: process.env.BENCHMARK_SCOPE || 'full-batch',
      startedAt: this.started, endedAt: this.ended ?? null, state: this.state,
      complete: this.state === 'FINISHED' && this.rows.every(row => ['PASS', 'ERROR', 'TIMEOUT'].includes(row.status)),
      promptHash: createHash('sha256').update(benchmarkText).digest('hex'),
      configuration: this.configuration,
      rows: this.rows.map(row => ({ requestId: null, generationMs: null, observedMs: null, measurements: null, ...row })),
      summary: summary(this.rows),
    });
    const passed = this.rows.filter(({ status }) => status === 'PASS').length;
    const counts = [...new Set(this.rows.map(({ status }) => status))].map((status) =>
      `${status}: ${this.rows.filter((row) => row.status === status).length}`).join('; ');
    const lines = [
      `# Benchmark run ${this.started}`, '', `State: ${this.state}`, '',
      `App: ${this.target}`, `Started: ${this.started}; ended: ${this.ended || 'in progress'}`, '',
      ...(process.env.BENCHMARK_SCOPE === 'first-prompt' ? ['**First-prompt trial only. Remaining prompts are NOT_RUN; PASS/40 below is not a full-batch score.**', ''] : []),
      'Scope: generation completes and visibly renders without observed errors. Correctness, interactions, scientific accuracy, and pgvector population are not evaluated.', '',
      'One attempt per prompt; 300-second test timeout; no manual retries. Fresh context per prompt. Screenshot/cleanup hooks can take additional time.', '',
      `Source SHA-256: ${createHash('sha256').update(benchmarkText).digest('hex')}`, '',
      `**${passed}/40 PASS (${(passed / 40 * 100).toFixed(1)}%)**. ${counts}.`, '',
      `95% target (38/40): ${passed >= 38 ? 'MET' : 'NOT MET'}; 90% minimum (36/40): ${passed >= 36 ? 'MET' : 'NOT MET'}.`, '',
      '| # | Experiment | Status | Seconds | Evidence |', '| --- | --- | --- | --- | --- |',
      ...this.rows.map((row) => `| ${row.number} | ${row.id} | ${row.status} | ${row.seconds} | ${row.files.map((file) => `[${cell(file.name)}](<${file.path}>)`).join(', ')} |`),
      '', '## Per-prompt log', '',
    ];
    for (const row of this.rows) {
      lines.push(`### ${row.number}. ${row.id} — ${row.status}`, '', `Prompt: ${row.prompt}`, '');
      for (const error of row.errors) lines.push(...error.split('\n').map((line) => `    ${line}`), '');
      for (const file of row.files) {
        lines.push(file.path.endsWith('.png') ? `![${file.name}](<${file.path}>)` : `[${cell(file.name)}](<${file.path}>)`, '');
      }
    }
    if (this.globalErrors?.length) lines.push('## Runner errors', '', ...this.globalErrors.map((error) => `    ${cell(error)}`), '');
    const path = join(this.dir, 'report.md');
    writeFileSync(`${path}.tmp`, `${lines.join('\n')}\n`);
    renameSync(`${path}.tmp`, path);
  }
}
