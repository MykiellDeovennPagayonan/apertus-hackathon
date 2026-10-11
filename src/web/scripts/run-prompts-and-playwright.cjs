const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const targetDir = process.env.CAPTURE_DIR || path.join(__dirname, "../../captures-playwright");
fs.mkdirSync(targetDir, { recursive: true });

const artifactDir = "C:/Users/Zero/.gemini/antigravity/brain/f1477b94-f5da-4df1-a5bc-f4d9a670701a";
if (fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

function copyToArtifacts(filename) {
  const src = path.join(targetDir, filename);
  const dest = path.join(artifactDir, filename);
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    console.warn(`Could not sync to artifact: ${err.message}`);
  }
}

function getLaunchOptions() {
  if (fs.existsSync(chromium.executablePath())) {
    return { headless: true };
  }
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  if (fs.existsSync(edgePath)) {
    return { headless: true, executablePath: edgePath };
  }
  return { headless: true, channel: "msedge" };
}

const testPrompts = [
  {
    name: "molecules-composition",
    domain: "Chemistry (Molecules)",
    prompt: "Test molecules by changing their properties and observing the effects",
    expectedModelKeyword: "Conservation",
    verifyDom: async (page) => {
      const items = page.locator(".chem-molecules, .board-item");
      assert.ok((await items.count()) >= 3, "Expected at least 3 molecule items");
    }
  },
  {
    name: "market-equilibrium",
    domain: "Economics",
    prompt: "Explore market equilibrium with supply and demand",
    expectedModelKeyword: "Equilibrium",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const readouts = page.locator('.board-item[data-board-component*="Readout"]');
      assert.ok((await readouts.count()) >= 2, "Expected at least 2 equilibrium readouts");
    }
  },
  {
    name: "price-elasticity",
    domain: "Economics",
    prompt: "Explore price elasticity of demand and total revenue",
    expectedModelKeyword: "Elasticity",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const sliders = page.locator(".catalog-form--slider, input[type='range'], input[type='text']");
      assert.ok((await sliders.count()) >= 1, "Expected price slider");
    }
  },
  {
    name: "acid-base-titration",
    domain: "Chemistry",
    prompt: "Acid base titration experiment with pH",
    expectedModelKeyword: "Titration",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const phReadout = page.locator('.board-item[data-board-component*="Readout"]');
      assert.ok((await phReadout.count()) >= 1, "Expected pH readout");
    }
  },
  {
    name: "phases-of-matter",
    domain: "Chemistry",
    prompt: "Phases of matter with temperature and pressure",
    expectedModelKeyword: "Phase",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const sliders = page.locator(".catalog-form--slider, input[type='range'], input[type='text']");
      assert.ok((await sliders.count()) >= 2, "Expected temperature and pressure sliders");
    }
  }
];

const premadeSims = [
  { slug: "phase-change", name: "Phases of Matter" },
  { slug: "acid-base-titration", name: "Acid-Base Titration" },
  { slug: "market-equilibrium", name: "Market Equilibrium" },
  { slug: "price-elasticity", name: "Price Elasticity" },
  { slug: "cost-and-profit", name: "Cost and Profit" }
];

async function runIntegratedSuite() {
  console.log("================================================================================");
  console.log("       APERTUS INTEGRATED PROMPT GENERATION & PLAYWRIGHT TEST RUNNER           ");
  console.log("================================================================================\n");

  const results = {
    promptEngineResults: [],
    playwrightResults: [],
    premadeResults: [],
    startTime: new Date().toISOString()
  };

  // ============================================================================
  // STEP 1: API / ENGINE PROMPT VERIFICATION
  // ============================================================================
  console.log(">>> [STAGE 1/3] RUNNING BACKEND PROMPT GENERATION SUITE (/api/apertus)...");
  
  for (const item of testPrompts) {
    const start = Date.now();
    const requestId = `test-req-${Math.random().toString(36).slice(2, 9)}`;
    const payload = {
      protocolVersion: 1,
      requestId,
      prompt: item.prompt,
      viewport: { width: 1280, height: 800 },
      active: null
    };

    try {
      const res = await fetch("http://localhost:3000/api/apertus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const latencyMs = Date.now() - start;
      assert.equal(res.status, 200, `Expected 200 OK for prompt "${item.prompt}", got ${res.status}`);

      const data = await res.json();
      assert.equal(data.protocolVersion, 1);
      assert.ok(["created", "updated"].includes(data.status), `Unexpected status "${data.status}"`);
      assert.ok(data.recipe, "Recipe object must be present in response");
      assert.ok(data.recipe.document.nodes.length >= 3, `Expected at least 3 nodes, got ${data.recipe.document.nodes.length}`);
      assert.ok(data.recipe.document.presentation.items.length >= 2, `Expected at least 2 presentation items, got ${data.recipe.document.presentation.items.length}`);

      console.log(`  ✔ [PASS] Prompt: "${item.prompt}"`);
      console.log(`     - Nodes: ${data.recipe.document.nodes.length} | Board items: ${data.recipe.document.presentation.items.length} | Latency: ${latencyMs}ms`);

      results.promptEngineResults.push({
        name: item.name,
        prompt: item.prompt,
        status: "PASS",
        nodes: data.recipe.document.nodes.length,
        items: data.recipe.document.presentation.items.length,
        latencyMs
      });
    } catch (err) {
      console.error(`  ✖ [FAIL] Prompt: "${item.prompt}" - ${err.message}`);
      results.promptEngineResults.push({
        name: item.name,
        prompt: item.prompt,
        status: "FAIL",
        error: err.message
      });
    }
  }

  // ============================================================================
  // STEP 2: PLAYWRIGHT BROWSER PROMPT GENERATION (E2E UI & RE-RUN DUPLICATE CHECK)
  // ============================================================================
  console.log("\n>>> [STAGE 2/3] RUNNING PLAYWRIGHT BROWSER PROMPT SUBMISSIONS...");
  const browser = await chromium.launch(getLaunchOptions());
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  for (const item of testPrompts) {
    console.log(`\n  Testing UI Prompt: "${item.prompt}"...`);
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    const input = page.locator(".command-bar__input, textarea");
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.fill(item.prompt);
    await page.locator(".command-bar__send").click();

    // Wait for generation to complete
    await page.waitForFunction(() => {
      const boardItems = document.querySelectorAll(".board-item");
      const emptyBoard = document.querySelector(".board-empty");
      const errorMsg = document.querySelector(".command-bar__status--error, .status-banner--error");
      return (boardItems.length > 0 && !emptyBoard) || !!errorMsg;
    }, { timeout: 35000 });

    // Assert no error banners
    const errorBanner = page.locator(".command-bar__status--error, .status-banner--error, [role='alert']");
    if ((await errorBanner.count()) > 0) {
      const text = await errorBanner.first().innerText();
      if (/failed|couldn't be saved|error/i.test(text)) {
        throw new Error(`Prompt submission produced error banner: "${text}"`);
      }
    }

    // Assert board is not empty
    const emptyBoard = page.locator(".board-empty");
    assert.strictEqual(await emptyBoard.count(), 0, "Board must not show empty placeholder");

    // Assert board item count
    const boardItems = page.locator(".board-item");
    const count = await boardItems.count();
    assert.ok(count >= 3, `Expected at least 3 board items, got ${count}`);

    // Verify DOM specifics
    await item.verifyDom(page);

    // Capture screenshot
    const filename = `integrated-${item.name}.png`;
    const capturePath = path.join(targetDir, filename);
    await page.screenshot({ path: capturePath, fullPage: false });
    copyToArtifacts(filename);

    console.log(`  ✔ [PASS] Rendered ${count} board items. Captured: ${filename}`);

    results.playwrightResults.push({
      name: item.name,
      prompt: item.prompt,
      status: "PASS",
      renderedItems: count,
      capture: filename,
      errors: pageErrors.length
    });
  }

  // Duplicate prompt re-run check (verifies storage persistence without error banner)
  console.log(`\n  Testing Storage Persistence Re-Run (Same Prompt in Same Session)...`);
  const reRunPrompt = "Phases of matter with temperature and pressure";
  const reInput = page.locator(".command-bar__input, textarea");
  await reInput.fill(reRunPrompt);
  await page.locator(".command-bar__send").click();

  await page.waitForTimeout(2000);
  await page.waitForFunction(() => {
    const working = document.querySelector(".command-bar__status--working");
    return !working;
  }, { timeout: 30000 });

  const reErr = page.locator(".command-bar__status--error");
  assert.equal(await reErr.count(), 0, "Duplicate re-run must not produce error banner");
  const reCount = await page.locator(".board-item").count();
  console.log(`  ✔ [PASS] Storage duplicate re-run verified cleanly with ${reCount} items.`);

  // ============================================================================
  // STEP 3: PRE-MADE DOMAIN SIMULATIONS (DESKTOP & MOBILE RESPONSIVE CHECK)
  // ============================================================================
  console.log("\n>>> [STAGE 3/3] RUNNING PLAYWRIGHT PRE-MADE DOMAINS & RESPONSIVE CHECKS...");


  for (const sim of premadeSims) {
    console.log(`  Testing Simulation: ${sim.name} (${sim.slug})...`);
    // Desktop Viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:3000/experiments?experiment=${sim.slug}`, { waitUntil: "networkidle" });
    await page.locator(".board-item").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);

    const desktopCapture = `integrated-${sim.slug}-desktop.png`;
    await page.screenshot({ path: path.join(targetDir, desktopCapture), fullPage: false });
    copyToArtifacts(desktopCapture);

    // Mobile Viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const board = document.querySelector(".workspace-board, .experiments-layout");
      return board ? board.scrollWidth > window.innerWidth + 25 : false;
    });
    assert.equal(hasHorizontalOverflow, false, `Mobile layout overflowed on ${sim.slug}`);

    const mobileCapture = `integrated-${sim.slug}-mobile.png`;
    await page.screenshot({ path: path.join(targetDir, mobileCapture), fullPage: false });
    copyToArtifacts(mobileCapture);

    console.log(`  ✔ [PASS] ${sim.name} verified on Desktop & Mobile (Zero horizontal overflow).`);

    results.premadeResults.push({
      slug: sim.slug,
      name: sim.name,
      desktopCapture,
      mobileCapture,
      status: "PASS"
    });
  }

  await browser.close();

  // ============================================================================
  // FINAL CONSOLIDATED SUMMARY TABLE
  // ============================================================================
  console.log("\n================================================================================");
  console.log("                           FINAL TEST RESULTS MATRIX                            ");
  console.log("================================================================================");
  console.log("\n--- BACKEND PROMPT TESTS ---");
  console.table(results.promptEngineResults);

  console.log("\n--- PLAYWRIGHT BROWSER PROMPT TESTS ---");
  console.table(results.playwrightResults.map(r => ({
    Name: r.name,
    Status: r.status,
    Items: r.renderedItems,
    Capture: r.capture
  })));

  console.log("\n--- PLAYWRIGHT PRE-MADE DOMAIN SIMULATIONS (DESKTOP & MOBILE) ---");
  console.table(results.premadeResults);

  const allPassed =
    results.promptEngineResults.every(r => r.status === "PASS") &&
    results.playwrightResults.every(r => r.status === "PASS") &&
    results.premadeResults.every(r => r.status === "PASS");

  assert.ok(allPassed, "All prompt tests and Playwright browser tests must pass 100%");
  console.log("\n🎉 ALL PROMPT TESTS AND PLAYWRIGHT SUITES PASSED 100%!");
}

runIntegratedSuite().catch((err) => {
  console.error("\nFATAL ERROR IN INTEGRATED SUITE:", err);
  process.exit(1);
});
