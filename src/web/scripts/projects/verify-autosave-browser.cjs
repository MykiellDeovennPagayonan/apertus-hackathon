const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('../test-loader.cjs');
const { launch } = require('../generation/helpers.cjs');
const { premadeRecipe } = load('src/simulations/runtime/recipes/registry.ts');
const { parseDocument } = load('src/simulations/builder/document/serialization.ts');
const base = process.env.UX_TEST_URL || 'http://localhost:43100';
const key = 'apertus-builder-library-v1';
const recipe = premadeRecipe('projectile');
const legacy = { id: 'legacy-unknown', document: { documentVersion: 999 } };
const original = { id: 'existing-projectile', document: parseDocument(JSON.stringify(recipe)) };
(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({key, entries}) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(entries));
  }, {key, entries: [legacy, original]});
  // Generation is fixed here so this check exercises real UI and storage without model latency.
  await page.route('**/api/apertus', async route => {
    const request = route.request().postDataJSON();
    const editing = Boolean(request.active);
    const next = structuredClone(editing ? request.active.recipe : recipe);
    if (editing) for (const node of next.document.nodes)
      if (node.definition === 'models/Projectile') node.configuration.gravity = 1.62;
    await route.fulfill({headers: {"X-Request-ID": request.requestId}, json: {
      protocolVersion: 1, requestId: request.requestId, status: editing ? 'updated' : 'created',
      expectedSessionId: request.active?.sessionId ?? null,
      expectedAuthoredRevision: request.active?.authoredRevision ?? null,
      ...(editing ? {expectedInteractionRevision: request.active.interactionRevision} : {coverage: {level:'full', covered:['Projectile motion'], omitted:[], explanation:'Projectile motion'}}),
      recipe: next, learnerExplanation: editing ? 'Updated gravity.' : 'Projectile experiment created.',
    }});
  });
  try {
    await page.goto(base);
    await page.locator('textarea').fill('create a projectile experiment');
    await page.getByRole('button', {name:'Create', exact:true}).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).length === 3, key, {timeout:15000});
    await page.waitForURL('**/experiments?resume=1');
    await page.getByRole('heading', {name:/Projectile motion/}).waitFor();
    let entries = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)), key);
    assert.deepEqual(entries[0], legacy);
    assert.deepEqual(entries[1], original);
    assert.equal(entries[2].document.lesson.title, 'Projectile motion (1)');
    const id = entries[2].id;
    await page.locator('textarea').fill('set gravity to Moon gravity');
    await page.getByRole('button', {name:'Apply', exact:true}).click();
    await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).find(x=>x.id===id)?.document.authored.nodes.filter(x=>x.definition==='models/Projectile').every(x=>x.configuration.gravity===1.62), {key,id});
    entries = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)), key);
    assert.equal(entries.length, 3);
    assert.ok(!(await page.locator('body').innerText()).includes('autosave failed'));
    assert.deepEqual(errors, []);
    await page.screenshot({path:'/tmp/apertus-autosave-passed.png', fullPage:true});
    console.log('Playwright autosave passed: create with legacy data and name collision, resume, edit same copy, preserve originals, no save warning. Generation fixture only.');
  } catch(e) {
    console.error(await page.locator('body').innerText());
    await page.screenshot({path:'/tmp/apertus-autosave-failure.png', fullPage:true});
    throw e;
  } finally { await browser.close(); }
})().catch(e=>{console.error(e); process.exitCode=1;});
