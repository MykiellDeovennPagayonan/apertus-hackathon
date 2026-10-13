export const storageKey = 'apertus-evaluation-v1';
const statuses = ['PASS', 'ERROR', 'TIMEOUT', 'INTERRUPTED', 'NOT_RUN', 'RUNNING'];
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;
function requireValue(condition, message) { if (!condition) throw new Error(message); }

export function validateRun(run) {
  requireValue(run?.protocolVersion === 1 && typeof run.id === 'string' && typeof run.modelSlug === 'string' && idPattern.test(run.id) && idPattern.test(run.modelSlug), 'Invalid batch identity.');
  requireValue(typeof run.startedAt === 'string' && Number.isFinite(Date.parse(run.startedAt)), 'Invalid batch timestamp.');
  requireValue(typeof run.promptHash === 'string' && /^[a-f0-9]{64}$/.test(run.promptHash), 'Invalid prompt hash.');
  requireValue(Array.isArray(run.rows) && run.rows.length === 40 && new Set(run.rows.map(row => row.id)).size === 40, 'A batch must contain forty unique questions.');
  run.rows.forEach((row, index) => {
    requireValue(typeof row.id === 'string' && idPattern.test(row.id) && row.number === index + 1 && typeof row.prompt === 'string' && row.prompt.trim() && statuses.includes(row.status), 'Invalid batch question.');
    requireValue(row.screenshot == null || (row.status === 'PASS' &&
      row.screenshot === `/benchmarks/${run.modelSlug}/${run.id}/images/${row.id}.png`), 'Invalid screenshot path.');
  });
  requireValue(typeof run.complete === 'boolean' && (!run.complete || run.rows.every(row => ['PASS', 'ERROR', 'TIMEOUT'].includes(row.status))), 'Invalid batch completion.');
  return run;
}

export function latestDataset(input) {
  const newest = new Map();
  for (const run of [...input].map(validateRun).filter(run => run.complete).sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
    if (!newest.has(run.modelSlug)) newest.set(run.modelSlug, run);
  }
  const runs = [...newest.values()].sort((a, b) => a.modelSlug.localeCompare(b.modelSlug));
  if (!runs.length) return null;
  requireValue(runs.every(run => run.promptHash === runs[0].promptHash && run.rows.every((row, index) =>
    row.id === runs[0].rows[index].id && row.prompt === runs[0].rows[index].prompt)), 'Batches have different prompt sets. Keep these campaigns separate.');
  const pipeline = run => JSON.stringify({ planner: run.configuration?.planner, decision: run.configuration?.decision,
    capture: run.configuration?.capture, source: run.configuration?.source });
  requireValue(runs.every(run => pipeline(run) === pipeline(runs[0])), 'Batches use different pipeline settings or source revisions. Keep these campaigns separate.');
  return { id: runs.map(run => run.id).join('|'), promptHash: runs[0].promptHash, runs };
}

// getRandomValues also works on a teammate's HTTP LAN origin, unlike randomUUID.
export function createSession(dataset, uuid = () => [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join(''), random = Math.random) {
  const order = {};
  for (const row of dataset.runs[0].rows) {
    const candidates = dataset.runs.map(run => `${run.id}/${row.id}`);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    order[row.id] = candidates;
  }
  return { protocolVersion: 1, id: uuid(), evaluatorId: uuid(), createdAt: new Date().toISOString(),
    dataset: structuredClone(dataset), order, ballots: {}, question: 0 };
}

export function ballot(session, promptId, selected, nonePreferred = false) {
  const order = session.order[promptId];
  requireValue(Array.isArray(order) && Array.isArray(selected) && new Set(selected).size === selected.length, 'Invalid ballot.');
  requireValue(!nonePreferred || selected.length === 0, 'None preferred cannot include favorites.');
  requireValue(selected.every(id => order.includes(id) && session.dataset.runs.some(run =>
    `${run.id}/${promptId}` === id && run.rows.find(row => row.id === promptId)?.screenshot)), 'Cannot select unavailable candidates.');
  session.ballots[promptId] = { selected: [...selected], nonePreferred, reviewed: nonePreferred || selected.length > 0, updatedAt: new Date().toISOString() };
}

export function validateSession(session) {
  requireValue(session?.protocolVersion === 1 && typeof session.id === 'string' && typeof session.evaluatorId === 'string', 'Unsupported saved session.');
  requireValue(session.dataset?.id === latestDataset(session.dataset.runs)?.id, 'Invalid saved dataset.');
  requireValue(Number.isInteger(session.question) && session.question >= 0 && session.question < 40, 'Invalid saved position.');
  for (const row of session.dataset.runs[0].rows) {
    const expected = session.dataset.runs.map(run => `${run.id}/${row.id}`).sort();
    requireValue(Array.isArray(session.order?.[row.id]) && JSON.stringify([...session.order[row.id]].sort()) === JSON.stringify(expected), 'Invalid saved candidate order.');
  }
  requireValue(session.ballots && typeof session.ballots === 'object', 'Invalid saved ballots.');
  for (const [id, vote] of Object.entries(session.ballots)) {
    requireValue(typeof vote.nonePreferred === 'boolean' && typeof vote.reviewed === 'boolean' && typeof vote.updatedAt === 'string', 'Invalid saved ballot.');
    const checked = { ...session, ballots: {} };
    ballot(checked, id, vote.selected, vote.nonePreferred);
    requireValue(checked.ballots[id].reviewed === vote.reviewed, 'Invalid saved review state.');
  }
  return session;
}

export function readSessions(text) {
  if (text === null) return { protocolVersion: 1, active: null, sessions: [] };
  const store = JSON.parse(text);
  requireValue(store?.protocolVersion === 1 && Array.isArray(store.sessions), 'Unsupported saved evaluation data. Export or back it up before starting again.');
  store.sessions.forEach(validateSession);
  requireValue(new Set(store.sessions.map(session => session.id)).size === store.sessions.length &&
    (store.active === null || store.sessions.some(session => session.id === store.active)), 'Invalid saved session index.');
  return store;
}

export function exportSession(session) {
  validateSession(session);
  return { protocolVersion: 1, exportedAt: new Date().toISOString(), sessionId: session.id, evaluatorId: session.evaluatorId,
    createdAt: session.createdAt, datasetId: session.dataset.id, promptHash: session.dataset.promptHash,
    completedQuestions: Object.values(session.ballots).filter(vote => vote.reviewed).length,
    totalQuestions: 40, runs: session.dataset.runs,
    questions: session.dataset.runs[0].rows.map(row => ({ id: row.id, prompt: row.prompt,
      candidates: session.order[row.id].map((id, index) => ({ id, position: index + 1,
        runId: session.dataset.runs.find(run => id === `${run.id}/${row.id}`).id })),
      ballot: session.ballots[row.id] ?? null })),
  };
}
