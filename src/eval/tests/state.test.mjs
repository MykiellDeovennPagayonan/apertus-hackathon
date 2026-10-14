import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureRun } from './fixtures.mjs';
import { latestDataset, createSession, syncSession, ballot, readSessions, exportSession, validateRun } from '../public/state.js';

test('multi-select, edits, none preferred and export preserve exposure and identity', () => {
  const runs = [fixtureRun(), fixtureRun('qwen3-8b', 'fixture-qwen')];
  const dataset = latestDataset(runs);
  const session = createSession(dataset, () => 'session-id', () => 0);
  const favorites = session.order['question-1'];
  ballot(session, 'question-1', favorites);
  ballot(session, 'question-1', favorites.slice(0, 1));
  assert.equal(Object.keys(session.ballots).length, 1);
  assert.equal(session.ballots['question-1'].selected.length, 1);
  ballot(session, 'question-2', [], true);
  assert.throws(() => ballot(session, 'question-3', session.order['question-3']), /unavailable/);
  assert.throws(() => ballot(session, 'question-1', favorites, true), /None preferred/);
  const restored = readSessions(JSON.stringify({ protocolVersion: 1, active: session.id, sessions: [session] })).sessions[0];
  assert.deepEqual(restored.order, session.order);
  const exported = exportSession(restored);
  assert.equal(exported.completedQuestions, 2);
  assert.equal(exported.questions[0].candidates.length, 2);
  assert.equal(exported.questions[1].ballot.nonePreferred, true);
  assert.equal(exported.questions[2].ballot, null);
  assert.equal(exported.runs[0].rows[2].measurements, null);
});

test('newest complete batches form new datasets without altering earlier sessions', () => {
  const old = createSession(latestDataset([fixtureRun()]), () => 'old');
  ballot(old, 'question-1', old.order['question-1']);
  const newer = fixtureRun('apertus-1.5-8b', 'fixture-new');
  newer.startedAt = '2026-10-15T01:00:00.000Z';
  const incomplete = fixtureRun('qwen3-8b', 'incomplete'); incomplete.complete = false;
  const dataset = latestDataset([fixtureRun(), newer, fixtureRun('qwen3-8b', 'qwen'), incomplete]);
  assert.deepEqual(dataset.runs.map(run => run.id), ['fixture-new', 'qwen']);
  assert.equal(old.dataset.runs.length, 1);
  assert.equal(old.ballots['question-1'].selected[0], 'fixture-apertus/question-1');
  const mismatched = fixtureRun('gemma-4-e4b', 'gemma'); mismatched.promptHash = 'b'.repeat(64);
  assert.throws(() => latestDataset([newer, mismatched]), /different prompt sets/);
  const changedPolicy = fixtureRun('gemma-4-e4b', 'different-policy');
  changedPolicy.configuration.planner = { compositionPolicy: 'optional' };
  assert.equal(latestDataset([newer, changedPolicy]).runs.length, 2);
});

test('models accumulate across executions while votes, position and exposure survive', () => {
  const first = fixtureRun();
  const session = createSession(latestDataset([first]), () => 'session');
  session.question = 7;
  ballot(session, 'question-1', session.order['question-1']);
  ballot(session, 'question-2', [], true);
  const selected = [...session.ballots['question-1'].selected];
  const second = fixtureRun('qwen3-8b', 'qwen');
  second.configuration.source = { revision: 'a-new-revision' };
  const third = fixtureRun('llama-3.1-8b', 'llama');
  const dataset = latestDataset([first, second, third]);
  assert.equal(syncSession(session, dataset, () => 0), session);
  assert.equal(session.dataset.runs.length, 3);
  assert.equal(session.question, 7);
  assert.deepEqual(session.ballots['question-1'].selected, selected);
  assert.equal(session.ballots['question-1'].candidateIds.length, 1);
  assert.equal(session.ballots['question-1'].reviewed, false);
  assert.equal(session.ballots['question-2'].nonePreferred, true);
  assert.equal(session.ballots['question-2'].reviewed, false);
  assert.equal(exportSession(session).completedQuestions, 0);
  ballot(session, 'question-1', selected);
  assert.equal(session.ballots['question-1'].candidateIds.length, 3);
  assert.equal(exportSession(session).completedQuestions, 1);
  const restored = readSessions(JSON.stringify({ protocolVersion: 1, active: session.id, sessions: [session] })).sessions[0];
  assert.deepEqual(restored.order, session.order);
  assert.equal(syncSession(session, dataset), session);
});

test('replacing one model keeps other models and preserves the old evaluation', () => {
  const first = fixtureRun(), second = fixtureRun('qwen3-8b', 'qwen');
  const old = createSession(latestDataset([first, second]), () => 'original');
  ballot(old, 'question-1', old.order['question-1']);
  const rerun = fixtureRun('apertus-1.5-8b', 'new-apertus');
  rerun.startedAt = '2026-10-15T01:00:00.000Z';
  const next = syncSession(old, latestDataset([first, second, rerun]));
  assert.notEqual(next, old);
  assert.equal(next.evaluatorId, old.evaluatorId);
  assert.deepEqual(next.dataset.runs.map(run => run.id), ['new-apertus', 'qwen']);
  assert.equal(old.ballots['question-1'].selected.length, 2);
});

test('invalid artifacts and saved ballots are rejected rather than silently reset', () => {
  const run = fixtureRun(); run.rows[0].screenshot = '/other/model.png';
  assert.throws(() => validateRun(run), /screenshot path/);
  assert.throws(() => readSessions('{bad'), SyntaxError);
  const session = createSession(latestDataset([fixtureRun()]), () => 'session');
  session.order['question-1'] = ['wrong'];
  assert.throws(() => readSessions(JSON.stringify({ protocolVersion: 1, active: 'session', sessions: [session] })), /candidate order/);
});
