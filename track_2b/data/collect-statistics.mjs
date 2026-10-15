import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { atomicJson, safeId, summary } from '../src/playwright/artifacts.mjs';
import { campaignModels } from '../src/eval/public/campaign.js';

const root = resolve(import.meta.dirname, '..');
const data = import.meta.dirname;
const reports = join(root, 'docs/agent-only/benchmark/results');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const repoPath = path => relative(root, path).split('\\').join('/');
const sum = values => values.reduce((total, value) => total + value, 0);
const mean = values => values.length ? sum(values) / values.length : null;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), midpoint = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2 : null;
};
const countBy = values => Object.fromEntries([...new Set(values)].map(value => [value, values.filter(item => item === value).length]));
const runs = new Map(), sourceRecords = [], reviews = new Map();

for (const filename of readdirSync(reports).filter(name => name.includes('-laya-40-') && name.endsWith('.md')).sort()) {
  const reportPath = join(reports, filename), text = readFileSync(reportPath, 'utf8');
  const id = safeId(text.match(/Run: `([^`]+)`/)?.[1]);
  const original = join(root, 'src/playwright/runs', id, 'run.json');
  const snapshot = join(data, 'benchmarking/runs', `${id}.json`);
  const bytes = readFileSync(existsSync(original) ? original : snapshot);
  if (existsSync(snapshot)) assert.equal(hash(bytes), hash(readFileSync(snapshot)), 'Recorded run snapshots are immutable');
  const run = JSON.parse(bytes);
  assert.equal(run.id, id);
  assert.ok(campaignModels.includes(run.modelSlug) && !runs.has(run.modelSlug));
  assert.ok(run.complete && run.state === 'FINISHED');
  assert.equal(run.rows.length, 40);
  assert.equal(new Set(run.rows.map(row => row.id)).size, 40);
  run.rows.forEach((row, index) => {
    assert.equal(row.number, index + 1);
    assert.ok(['PASS', 'ERROR', 'TIMEOUT'].includes(row.status));
    assert.ok(row.measurements?.terminal);
  });
  assert.deepEqual(summary(run.rows), run.summary);
  mkdirSync(join(data, 'benchmarking/runs'), { recursive: true });
  if (!existsSync(snapshot)) writeFileSync(snapshot, bytes);
  const wall = text.replaceAll('**', '').match(/\| Scored batch wall time \| (\d+) min ([\d.]+) s \|/);
  assert.ok(wall);
  sourceRecords.push({ modelSlug: run.modelSlug, runId: id, original: repoPath(original),
    snapshot: repoPath(snapshot), sha256: hash(bytes), report: repoPath(reportPath),
    reportSha256: hash(readFileSync(reportPath)), batchWallMs: (Number(wall[1]) * 60 + Number(wall[2])) * 1000 });
  const reviewRows = [...text.matchAll(/^\| (\d+) \| (.+)$/gm)];
  assert.equal(reviewRows.length, 40);
  for (const [, number, rest] of reviewRows) {
    const cells = rest.split(' | '), row = run.rows[Number(number) - 1];
    assert.equal(cells[0], row.id);
    assert.equal(cells[1], row.status);
    assert.equal(Number(cells[4]), row.measurements.schemaRepairs);
    assert.equal(Number(cells[5]), row.measurements.composerFeedback);
    reviews.set(`${run.modelSlug}/${row.id}`, cells[6].replace(/\[Image\]\([^)]+\)/g, '').replace(/\s*\|\s*$/, '').trim());
  }
  runs.set(run.modelSlug, run);
}
assert.equal(runs.size, campaignModels.length);
assert.equal(new Set([...runs.values()].map(run => run.promptHash)).size, 1);
assert.equal(new Set([...runs.values()].map(run => run.configuration.source.fingerprint)).size, 1);
const prompts = runs.get(campaignModels[0]).rows.map(({ number, id, prompt }) => ({ number, simulationId: id, prompt }));
for (const run of runs.values()) assert.deepEqual(run.rows.map(({ number, id, prompt }) => ({ number, simulationId: id, prompt })), prompts);

// Keep compact diagnostic evidence so rebuilding does not need ignored runner artifacts.
const evidencePath = join(data, 'benchmarking/pipeline-evidence.json');
let evidence;
if (existsSync(evidencePath)) evidence = read(evidencePath);
else evidence = campaignModels.flatMap(modelSlug => {
  const run = runs.get(modelSlug), base = join(root, 'src/playwright/runs', run.id);
  return run.rows.map(row => {
    const file = row.files.find(file => file.name === 'planner-diagnostics');
    assert.ok(file);
    const path = join(base, file.path), diagnostics = read(path);
    const events = diagnostics.events;
    const browser = row.files.find(file => file.name === 'events');
    const browserEvents = browser ? readFileSync(join(base, browser.path), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
    return { modelSlug, runId: run.id, simulationId: row.id, source: repoPath(path), sha256: hash(readFileSync(path)),
      inferenceEvents: events.filter(event => event.event.endsWith('.inference')).map(event => event.data),
      selectionDecisions: events.filter(event => event.event === 'selection.decision').map(event => event.data),
      retrievedActivities: events.find(event => event.event === 'retrieval')?.data.map(card => card.title) ?? [],
      capabilityRejections: events.filter(event => event.event === 'assembly_plan.rejected').map(event => event.data),
      argumentFailures: events.filter(event => /\.(schemaFailure|semanticFailure)$/.test(event.event)).map(event => {
        const { content, ...failure } = event.data;
        return { event: event.event, ...failure };
      }),
      errorDetails: browserEvents.filter(event => event.event === 'error-details').map(event => event.message) };
  });
});
assert.equal(evidence.length, campaignModels.length * prompts.length);
assert.equal(new Set(evidence.map(row => `${row.modelSlug}/${row.simulationId}`)).size, evidence.length);
const evidenceByRow = new Map(evidence.map(row => [`${row.modelSlug}/${row.simulationId}`, row]));
const commonPrompts = prompts.filter(prompt => campaignModels.every(model => runs.get(model).rows[prompt.number - 1].status === 'PASS'));
const modelStatistics = campaignModels.map(modelSlug => {
  const run = runs.get(modelSlug), source = sourceRecords.find(source => source.modelSlug === modelSlug);
  const successes = run.rows.filter(row => row.status === 'PASS'), times = successes.map(row => row.generationMs);
  assert.ok(times.every(Number.isFinite));
  const measurements = run.rows.map(row => row.measurements);
  const calls = evidence.filter(row => row.modelSlug === modelSlug).flatMap(row => row.inferenceEvents);
  assert.equal(calls.length, measurements.flatMap(value => value.inference).length);
  const decisions = evidence.filter(row => row.modelSlug === modelSlug).flatMap(row => row.selectionDecisions);
  const commonTimes = commonPrompts.map(prompt => run.rows[prompt.number - 1].generationMs);
  const failedTerminalMs = sum(run.rows.filter(row => row.status !== 'PASS').map(row => row.measurements.elapsedMs));
  return { modelSlug, runId: run.id, ...summary(run.rows), source,
    schemaRepairAttempts: sum(measurements.map(value => value.schemaRepairs)),
    validatorReturns: sum(measurements.map(value => value.composerFeedback)),
    deterministicRepairs: sum(measurements.map(value => value.deterministicRepairs)),
    meanMs: mean(times), minMs: Math.min(...times), maxMs: Math.max(...times),
    sampleStandardDeviationMs: times.length > 1 ? Math.sqrt(sum(times.map(value => (value - mean(times)) ** 2)) / (times.length - 1)) : null,
    commonPromptSamples: commonTimes.length, commonPromptMeanMs: mean(commonTimes), commonPromptMedianMs: median(commonTimes),
    failedTerminalMs, batchWallMs: source.batchWallMs, wallMsPerRender: source.batchWallMs / successes.length,
    generationAndFailedMsPerRender: (sum(times) + failedTerminalMs) / successes.length,
    recordedInferenceEvents: calls.length, inferenceMsByStage: Object.fromEntries([...new Set(calls.map(call => call.stage))].map(stage => [stage, sum(calls.filter(call => call.stage === stage).map(call => call.elapsedMs))])),
    outputConstraintCounts: countBy(calls.map(call => String(call.constrained))), finishReasonCounts: countBy(calls.map(call => call.finishReason)),
    promptTokens: sum(calls.map(call => call.usage?.promptTokens ?? 0)), outputTokens: sum(calls.map(call => call.usage?.outputTokens ?? 0)),
    inferenceEventsWithTokenUsage: calls.filter(call => Number.isFinite(call.usage?.promptTokens) && Number.isFinite(call.usage?.outputTokens)).length,
    layaDecisions: countBy(decisions.map(decision => decision.status)), layaMeanDurationMs: mean(decisions.map(decision => decision.durationMs).filter(Number.isFinite)),
    failedSimulations: run.rows.filter(row => row.status !== 'PASS').map(row => row.id) };
});
const promptResults = campaignModels.flatMap(modelSlug => runs.get(modelSlug).rows.map(row => {
  const run = runs.get(modelSlug), detail = evidenceByRow.get(`${modelSlug}/${row.id}`);
  assert.equal(detail?.runId, run.id);
  return { modelSlug, runId: run.id, number: row.number, simulationId: row.id, prompt: row.prompt,
    status: row.status, generationMs: row.generationMs, observedMs: row.observedMs,
    measurements: row.measurements, qualitativeReview: reviews.get(`${modelSlug}/${row.id}`),
    errorDetails: detail.errorDetails,
    evidence: row.files.filter(file => ['result', 'events', 'planner-diagnostics'].includes(file.name)).map(file => ({ name: file.name, source: `src/playwright/runs/${run.id}/${file.path}` })) };
}));
const matrix = prompts.map(prompt => {
  const statusByModel = Object.fromEntries(campaignModels.map(model => [model, runs.get(model).rows[prompt.number - 1].status]));
  const renderedModels = Object.values(statusByModel).filter(status => status === 'PASS').length;
  return { ...prompt, renderedModels, renderRate: renderedModels / campaignModels.length, statusByModel };
});

const evaluationDirectory = join(data, 'human-evaluations');
const evaluators = readdirSync(evaluationDirectory).filter(name => /^evaluation-.*\.json$/.test(name)).sort().map(name => {
  const path = join(evaluationDirectory, name), exported = read(path);
  assert.equal(exported.protocolVersion, 2);
  assert.equal(exported.totalQuestions, prompts.length);
  const votes = exported.votes.filter(vote => vote.reviewed);
  assert.equal(votes.length, exported.completedQuestions);
  assert.equal(new Set(exported.votes.map(vote => vote.simulationId)).size, exported.votes.length);
  for (const vote of votes) {
    const prompt = prompts.find(prompt => prompt.simulationId === vote.simulationId);
    assert.ok(prompt);
    assert.equal(vote.prompt, prompt.prompt);
    assert.equal(new Set(vote.selectedModels).size, vote.selectedModels.length);
    assert.equal(typeof vote.nonePreferred, 'boolean');
    assert.equal(Boolean(vote.selectedModels.length), !vote.nonePreferred);
    for (const model of vote.selectedModels) assert.equal(runs.get(model)?.rows[prompt.number - 1].status, 'PASS');
  }
  return { evaluatorId: exported.evaluatorId, source: repoPath(path), sha256: hash(readFileSync(path)), exportedAt: exported.exportedAt, votes };
});
assert.ok(evaluators.length);
assert.equal(new Set(evaluators.map(evaluator => evaluator.evaluatorId)).size, evaluators.length, 'Duplicate evaluator exports would double-count preferences');
const ballots = evaluators.flatMap(evaluator => evaluator.votes.map(vote => ({ evaluatorId: evaluator.evaluatorId, ...vote })));
const commonBallots = ballots.filter(vote => commonPrompts.some(prompt => prompt.simulationId === vote.simulationId));
const reviewerStatistics = evaluators.map(({ votes, ...source }) => ({ ...source,
  reviewed: votes.length, missingSimulations: prompts.filter(prompt => !votes.some(vote => vote.simulationId === prompt.simulationId)).map(prompt => prompt.simulationId),
  nonePreferred: votes.filter(vote => vote.nonePreferred).length,
  soleFavoriteBallots: votes.filter(vote => vote.selectedModels.length === 1).length,
  totalSelections: sum(votes.map(vote => vote.selectedModels.length)),
  meanSelectionsPerBallot: mean(votes.map(vote => vote.selectedModels.length)),
  selectedByModel: Object.fromEntries(campaignModels.map(model => [model, votes.filter(vote => vote.selectedModels.includes(model)).length])) }));
const humanModels = campaignModels.map(modelSlug => {
  const selected = ballots.filter(vote => vote.selectedModels.includes(modelSlug));
  const available = ballots.filter(vote => {
    const prompt = prompts.find(prompt => prompt.simulationId === vote.simulationId);
    return runs.get(modelSlug).rows[prompt.number - 1].status === 'PASS';
  }).length;
  const commonSelected = commonBallots.filter(vote => vote.selectedModels.includes(modelSlug)).length;
  return { modelSlug, selected: selected.length, selectionRate: selected.length / ballots.length,
    soleFavorites: selected.filter(vote => vote.selectedModels.length === 1).length,
    fractionalCredit: sum(selected.map(vote => 1 / vote.selectedModels.length)),
    availableBallots: available, selectionRateWhenRendered: available ? selected.length / available : null,
    commonSelected, commonReviewed: commonBallots.length, commonSelectionRate: commonBallots.length ? commonSelected / commonBallots.length : null };
});
const humanSimulations = prompts.map(prompt => {
  const votes = ballots.filter(vote => vote.simulationId === prompt.simulationId);
  const nonePreferred = votes.filter(vote => vote.nonePreferred).length;
  return { ...prompt, reviewed: votes.length, missing: evaluators.length - votes.length, nonePreferred,
    unanimousNonePreferred: votes.length === evaluators.length && nonePreferred === votes.length,
    unanimousSoleFavorite: votes.length === evaluators.length && votes.every(vote => vote.selectedModels.length === 1 && vote.selectedModels[0] === votes[0].selectedModels[0]) ? votes[0].selectedModels[0] : null,
    selectedByModel: Object.fromEntries(campaignModels.map(model => [model, votes.filter(vote => vote.selectedModels.includes(model)).length])), ballots: votes };
});
const nonePreferred = ballots.filter(vote => vote.nonePreferred).length;
const totalSelections = sum(ballots.map(vote => vote.selectedModels.length));
assert.equal(sum(humanModels.map(model => model.selected)), totalSelections);
assert.ok(Math.abs(sum(humanModels.map(model => model.fractionalCredit)) - (ballots.length - nonePreferred)) < 1e-8);
assert.equal(sum(matrix.map(row => row.renderedModels)), sum(modelStatistics.map(model => model.passed)));
assert.equal(sum(humanSimulations.map(row => row.reviewed)), ballots.length);

const catalogPath = join(root, 'docs/agent-only/benchmark/component-catalog-report.md');
const catalog = readFileSync(catalogPath, 'utf8').split('## Summary')[1].split('## 1.')[0];
const catalogMetrics = [...catalog.matchAll(/^\| ([^|]+) \| (\d+) \|$/gm)].map(([, measure, count]) => ({ measure: measure.trim(), count: Number(count) }));
const catalogCategories = [...catalog.matchAll(/^\| (appearance|canvases|controls|displays|models) \| (\d+) \| (\d+) \|$/gm)].map(([, category, uniqueDefinitions, instances]) => ({ category, uniqueDefinitions: Number(uniqueDefinitions), instances: Number(instances) }));
assert.equal(sum(catalogCategories.map(row => row.uniqueDefinitions)), 110);
assert.equal(sum(catalogCategories.map(row => row.instances)), 251);

const benchmarkTotals = { models: runs.size, simulations: prompts.length, attempts: promptResults.length,
  rendered: sum(modelStatistics.map(model => model.passed)), firstValidatorPasses: sum(modelStatistics.map(model => model.firstPass)),
  validationReached: sum(modelStatistics.map(model => model.validationReached)), zeroRepairCompletions: sum(modelStatistics.map(model => model.zeroRepairCompletions)),
  schemaRepairAttempts: sum(modelStatistics.map(model => model.schemaRepairAttempts)), validatorReturns: sum(modelStatistics.map(model => model.validatorReturns)),
  terminalOutcomes: countBy(promptResults.map(row => row.measurements.terminal)), renderCountDistribution: countBy(matrix.map(row => row.renderedModels)),
  layaDecisions: countBy(evidence.flatMap(row => row.selectionDecisions.map(decision => decision.status))) };
const humanTotals = { evaluators: evaluators.length, possibleBallots: evaluators.length * prompts.length, reviewed: ballots.length,
  missing: evaluators.length * prompts.length - ballots.length, nonePreferred, totalSelections,
  soleFavoriteBallots: ballots.filter(vote => vote.selectedModels.length === 1).length,
  multipleFavoriteBallots: ballots.filter(vote => vote.selectedModels.length > 1).length,
  commonReviewed: commonBallots.length, selectionCountDistribution: countBy(ballots.map(vote => vote.selectedModels.length)) };
const definitions = { timingUnit: 'milliseconds', rateUnit: 'fraction from 0 to 1',
  renderSuccess: 'Visible rendering without an observed terminal error; scientific correctness and learner interactions are not certified.',
  firstValidatorPass: 'First validator outcome; earlier JSON/schema repairs may have occurred. Null means validation was not reached.',
  zeroRepairCompletion: 'Successful result with zero schema repairs, validator returns, and deterministic repairs.',
  successfulLatency: 'Submission to final render, only for PASS rows; P95 is nearest rank; standard deviation is the sample statistic.',
  humanPreference: 'Multiple models can be selected per reviewed ballot; missing answers are excluded, not rejected.',
  commonSubset: 'The same simulations rendered under all seven campaign models.',
  fractionalCredit: 'Each selected model receives 1 divided by the number selected; an analytical tie normalization, not the original rubric.',
  provenanceLimit: 'Human exports do not embed screenshot versions or candidate exposure logs; availability uses these fixed campaign runs.' };
const outputs = {
  'benchmarking/model-statistics.json': { definitions, totals: benchmarkTotals, commonPrompts, models: modelStatistics },
  'benchmarking/prompt-results.json': { definitions, rows: promptResults },
  'benchmarking/simulation-matrix.json': { definition: definitions.renderSuccess, models: campaignModels, rows: matrix },
  'benchmarking/pipeline-evidence.json': evidence,
  'benchmarking/component-catalog-statistics.json': { source: repoPath(catalogPath), sha256: hash(readFileSync(catalogPath)), scope: 'Authored premade-recipe inventory in the documented source snapshot; not model-generated outcomes.', metrics: catalogMetrics, categories: catalogCategories },
  'human-evaluations/model-statistics.json': { definitions, totals: humanTotals, reviewers: reviewerStatistics, models: humanModels },
  'human-evaluations/simulation-preferences.json': { definitions, rows: humanSimulations },
  'summary.json': { campaign: '2026-10-14 seven-model 40-prompt campaign', promptHash: runs.get(campaignModels[0]).promptHash,
    pipelineFingerprint: runs.get(campaignModels[0]).configuration.source.fingerprint, definitions, benchmarkTotals, humanTotals,
    sources: sourceRecords,
    models: campaignModels.map(modelSlug => ({ modelSlug, benchmark: modelStatistics.find(model => model.modelSlug === modelSlug), human: humanModels.find(model => model.modelSlug === modelSlug) })) },
};
outputs['summary.json'].outputs = Object.keys(outputs);
for (const [path, content] of Object.entries(outputs)) atomicJson(join(data, path), content);
console.log(`Collected ${runs.size} runs, ${promptResults.length} prompt outcomes, and ${ballots.length} reviewed human ballots from ${evaluators.length} evaluators.`);
