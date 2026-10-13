import { storageKey, latestDataset, createSession, ballot, readSessions, exportSession } from './state.js';

const element = id => document.getElementById(id);
let store, latest, active, view = 'review', storageReadable = true;
function error(message) { element('error').textContent = message; element('error').hidden = false; }
function save() {
  if (!storageReadable) { element('saved').textContent = 'Not saved locally. Download JSON to preserve this session.'; return; }
  try { localStorage.setItem(storageKey, JSON.stringify(store)); element('saved').textContent = 'Saved in this browser'; }
  catch { element('saved').textContent = 'Not saved'; error('Browser storage is unavailable or full. Download JSON to preserve your votes.'); }
}
function addSession() {
  active = createSession(latest);
  store.sessions.push(active); store.active = active.id;
  save(); render();
}
function render() {
  element('empty').hidden = Boolean(active);
  element('workspace').hidden = !active;
  if (!active) return;
  const selector = element('sessions'); selector.replaceChildren();
  for (const session of store.sessions) {
    const option = document.createElement('option'); option.value = session.id;
    option.textContent = `${new Date(session.createdAt).toLocaleString()} · ${session.dataset.runs.length} models · ${session.id.slice(0, 6)}`;
    option.selected = session.id === active.id; selector.append(option);
  }
  element('new-results').hidden = !latest || latest.id === active.dataset.id;
  element('review').hidden = view !== 'review'; element('metrics').hidden = view !== 'metrics';
  element('review-tab').setAttribute('aria-pressed', String(view === 'review'));
  element('metrics-tab').setAttribute('aria-pressed', String(view === 'metrics'));
  renderQuestion(); renderMetrics();
}
function renderQuestion() {
  const row = active.dataset.runs[0].rows[active.question];
  const vote = active.ballots[row.id];
  const reviewed = Object.values(active.ballots).filter(item => item.reviewed).length;
  element('progress').textContent = `Question ${active.question + 1} of 40 · ${reviewed} reviewed`;
  element('prompt').textContent = row.prompt;
  element('single').hidden = active.dataset.runs.length !== 1;
  element('none').checked = Boolean(vote?.nonePreferred);
  element('previous').disabled = active.question === 0;
  element('next').textContent = active.question === 39 ? 'Download results' : 'Next question';
  const cards = element('candidates'); cards.replaceChildren();
  active.order[row.id].forEach((id, position) => {
    const run = active.dataset.runs.find(run => id === `${run.id}/${row.id}`);
    const candidate = run.rows[active.question];
    const article = document.createElement('article'); article.className = 'candidate';
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = id;
    checkbox.disabled = !candidate.screenshot; checkbox.checked = vote?.selected.includes(id) ?? false;
    const name = document.createElement('span'); name.textContent = `Result ${String.fromCharCode(65 + position)}`;
    label.append(checkbox, name); article.append(label);
    if (candidate.screenshot) {
      const image = document.createElement('img'); image.src = candidate.screenshot; image.alt = `Generated experiment, result ${String.fromCharCode(65 + position)}`;
      image.addEventListener('error', () => {
        checkbox.disabled = true;
        error('A screenshot could not be loaded. Restore the benchmark image before evaluating this question.');
      });
      const full = document.createElement('a'); full.href = candidate.screenshot; full.target = '_blank'; full.rel = 'noopener';
      full.setAttribute('aria-label', `Open result ${String.fromCharCode(65 + position)} at full size`);
      full.append(image); article.append(full);
    } else {
      const message = document.createElement('p'); message.className = 'unavailable';
      message.textContent = 'No successful screenshot available.'; article.append(message);
    }
    checkbox.addEventListener('change', () => {
      const selected = [...cards.querySelectorAll('input:checked')].map(input => input.value);
      ballot(active, row.id, selected); element('none').checked = false;
      save(); element('progress').textContent = `Question ${active.question + 1} of 40 · ${Object.values(active.ballots).filter(item => item.reviewed).length} reviewed`;
    });
    cards.append(article);
  });
}
const seconds = value => Number.isFinite(value) ? `${(value / 1000).toFixed(1)}s` : 'Unknown';
function renderMetrics() {
  const body = element('metric-rows'); body.replaceChildren();
  const details = element('details'); details.replaceChildren();
  for (const run of active.dataset.runs) {
    const measured = run.rows.filter(row => row.measurements?.validationReached);
    const first = measured.filter(row => row.measurements.firstPass === true).length;
    const passed = run.rows.filter(row => row.status === 'PASS');
    const times = passed.map(row => row.generationMs).filter(Number.isFinite).sort((a, b) => a - b);
    const midpoint = Math.floor(times.length / 2);
    const median = times.length ? times.length % 2 ? times[midpoint] : (times[midpoint - 1] + times[midpoint]) / 2 : null;
    const tr = document.createElement('tr');
    for (const value of [run.configuration?.llm?.model ?? run.modelSlug,
      `${passed.length}/40 (${(passed.length / 40 * 100).toFixed(1)}%)`, `${first}/40 (${(first / 40 * 100).toFixed(1)}%)`,
      measured.length ? `${first}/${measured.length} (${(first / measured.length * 100).toFixed(1)}%)` : 'Unknown', `${seconds(median)} (${times.length} samples)`,
      seconds(times.length ? times[Math.ceil(times.length * .95) - 1] : null),
      String(run.rows.filter(row => !row.measurements?.terminal).length)]) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    body.append(tr);
    const disclosure = document.createElement('details');
    const title = document.createElement('summary'); title.textContent = `${run.modelSlug} · per-question measurements and configuration`;
    const pre = document.createElement('pre'); pre.textContent = JSON.stringify({ runId: run.id, configuration: run.configuration,
      questions: run.rows.map(row => ({ id: row.id, status: row.status, generationMs: row.generationMs, observedMs: row.observedMs,
        screenshotAvailable: row.screenshotAvailable, measurements: row.measurements })) }, null, 2);
    disclosure.append(title, pre); details.append(disclosure);
  }
}
function download() {
  if (!active) return;
  const blob = new Blob([JSON.stringify(exportSession(active), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `evaluation-${active.id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function load() {
  try {
    if (!store) {
      try { store = readSessions(localStorage.getItem(storageKey)); }
      catch (problem) {
        storageReadable = false;
        store = readSessions(null);
        error(`Saved data could not be read: ${problem.message} Existing browser data will not be overwritten; use JSON export for new votes.`);
      }
    }
    const response = await fetch('/benchmarks/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load benchmark catalog.');
    const index = await response.json();
    if (index.protocolVersion !== 1 || !Array.isArray(index.runs)) throw new Error('Unsupported benchmark catalog.');
    const manifests = await Promise.all(index.runs.filter(run => run.complete).map(async run => {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(run.modelSlug) ||
          !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(run.id) ||
          run.path !== `/benchmarks/${run.modelSlug}/${run.id}/run.json`) throw new Error('Invalid catalog path.');
      const response = await fetch(run.path, { cache: 'no-store' });
      if (!response.ok) throw new Error('A benchmark manifest could not be loaded.');
      const manifest = await response.json();
      if (manifest.id !== run.id || manifest.modelSlug !== run.modelSlug) throw new Error('Catalog identity mismatch.');
      return manifest;
    }));
    latest = latestDataset(manifests);
    active = store.sessions.find(session => session.id === store.active);
    if (!active && latest) addSession(); else render();
  } catch (problem) { error(problem.message); if (store) { active = store.sessions.find(session => session.id === store.active); render(); } }
}
element('review-tab').onclick = () => { view = 'review'; render(); };
element('metrics-tab').onclick = () => { view = 'metrics'; render(); };
element('sessions').onchange = event => { store.active = event.target.value; active = store.sessions.find(session => session.id === store.active); save(); render(); };
element('new-session').onclick = addSession;
element('reload').onclick = load;
element('export').onclick = download;
element('none').onchange = event => { ballot(active, active.dataset.runs[0].rows[active.question].id, [], event.target.checked); save(); renderQuestion(); };
element('previous').onclick = () => { active.question--; save(); renderQuestion(); element('prompt').focus(); };
element('next').onclick = () => { if (active.question === 39) download(); else { active.question++; save(); renderQuestion(); element('prompt').focus(); } };
load();
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
