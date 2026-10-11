const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const targetDir = process.env.CAPTURE_DIR || path.join(__dirname, "../../captures-playwright");
fs.mkdirSync(targetDir, { recursive: true });

const artifactDirs = [
  "C:/Users/Zero/.gemini/antigravity/brain/f1477b94-f5da-4df1-a5bc-f4d9a670701a",
  "C:/Users/Zero/.gemini/antigravity/brain/122e4938-ae25-48aa-a528-61702cbb4e6b"
];
for (const dir of artifactDirs) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

function copyToArtifacts(filename) {
  const src = path.join(targetDir, filename);
  if (!fs.existsSync(src)) return;
  for (const dir of artifactDirs) {
    try {
      fs.copyFileSync(src, path.join(dir, filename));
    } catch (err) {
      console.warn(`Could not sync ${filename} to ${dir}: ${err.message}`);
    }
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

const economicsPrompts = [
  {
    name: "market-equilibrium",
    prompt: "Explore market equilibrium with supply and demand",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const readouts = page.locator('.board-item[data-board-component*="Readout"]');
      assert.ok((await readouts.count()) >= 2, "Expected at least 2 equilibrium readouts");
    }
  },
  {
    name: "price-elasticity",
    prompt: "Explore price elasticity of demand and total revenue",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const sliders = page.locator(".catalog-form--slider, input[type='range'], input[type='text']");
      assert.ok((await sliders.count()) >= 1, "Expected price slider");
    }
  },
  {
    name: "trade-and-tariffs",
    prompt: "Explore trade tariffs and deadweight loss with imports",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const readouts = page.locator('.board-item[data-board-component*="Readout"]');
      assert.ok((await readouts.count()) >= 2, "Expected at least 2 trade readouts");
    }
  },
  {
    name: "monopoly-pricing",
    prompt: "Explore monopoly pricing and deadweight loss with market power",
    verifyDom: async (page) => {
      const svg = page.locator(".board-item svg");
      await svg.first().waitFor({ state: "visible", timeout: 10000 });
      const readouts = page.locator('.board-item[data-board-component*="Readout"]');
      assert.ok((await readouts.count()) >= 2, "Expected at least 2 monopoly readouts");
    }
  }
];

const economicsSims = [
  { slug: "market-equilibrium", name: "Market Equilibrium" },
  { slug: "price-elasticity", name: "Price Elasticity" },
  { slug: "cost-and-profit", name: "Cost and Profit" },
  { slug: "trade-and-tariffs", name: "Trade and Tariffs" },
  { slug: "monopoly-pricing", name: "Monopoly Pricing" }
];

async function main() {
  console.log("=== ECONOMICS DOMAIN TEST & CAPTURE SUITE ===");

  // Stage 1: API / Backend
  console.log("\n>>> [STAGE 1] Testing Economics Prompt Generation API...");
  for (const item of economicsPrompts) {
    let success = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const payload = {
          protocolVersion: 1,
          requestId: `econ-${Math.random().toString(36).slice(2, 9)}`,
          prompt: item.prompt,
          viewport: { width: 1280, height: 800 },
          active: null
        };
        const res = await fetch("http://localhost:3000/api/apertus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.status === 429 || res.status === 503) {
          console.warn(`  [WAIT] Server busy (${res.status}), retrying ${item.name} (${attempt}/5)...`);
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }
        assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
        const data = await res.json();
        assert.ok(["created", "updated"].includes(data.status));
        assert.ok(data.recipe);
        console.log(`  ✔ [PASS] Backend generation: "${item.prompt}" (nodes: ${data.recipe.document.nodes.length})`);
        success = true;
        break;
      } catch (err) {
        if (attempt === 5) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    assert.ok(success, `Prompt failed: ${item.prompt}`);
  }

  // Stage 2: Browser Generation & Captures
  console.log("\n>>> [STAGE 2] Running Playwright UI Generation for Economics Prompts...");
  const browser = await chromium.launch(getLaunchOptions());
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  for (const item of economicsPrompts) {
    console.log(`  Testing UI generation: "${item.prompt}"...`);
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });

    const input = page.locator(".command-bar__input, textarea");
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.fill(item.prompt);
    await page.locator(".command-bar__send").click();

    await page.waitForFunction(() => {
      const boardItems = document.querySelectorAll(".board-item");
      const emptyBoard = document.querySelector(".board-empty");
      const working = document.querySelector(".command-bar__status--working, .command-bar__stop");
      const errorMsg = document.querySelector(".command-bar__status--error, .status-banner--error");
      return (boardItems.length > 0 && !emptyBoard && !working) || !!errorMsg;
    }, { timeout: 45000 });
    await page.waitForTimeout(500);

    const err = page.locator(".command-bar__status--error, .status-banner--error");
    assert.equal(await err.count(), 0, "No error banner allowed");

    await item.verifyDom(page);
    const count = await page.locator(".board-item").count();
    const filename = `integrated-${item.name}.png`;
    await page.screenshot({ path: path.join(targetDir, filename) });
    copyToArtifacts(filename);
    console.log(`  ✔ [PASS] Generated ${count} items. Captured: ${filename}`);
  }

  // Stage 3: Pre-made Simulations Desktop & Mobile
  console.log("\n>>> [STAGE 3] Capturing Pre-made Economics Simulations (Desktop & Mobile)...");
  for (const sim of economicsSims) {
    console.log(`  Simulation: ${sim.name} (${sim.slug})...`);
    // Desktop Viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:3000/experiments?experiment=${sim.slug}`, { waitUntil: "networkidle" });
    await page.locator(".board-item").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);

    const desktopCapture = `integrated-${sim.slug}-desktop.png`;
    await page.screenshot({ path: path.join(targetDir, desktopCapture) });
    copyToArtifacts(desktopCapture);

    // Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    const hasOverflow = await page.evaluate(() => {
      const board = document.querySelector(".workspace-board, .experiments-layout");
      return board ? board.scrollWidth > window.innerWidth + 25 : false;
    });
    assert.equal(hasOverflow, false, `Mobile overflow detected on ${sim.slug}`);

    const mobileCapture = `integrated-${sim.slug}-mobile.png`;
    await page.screenshot({ path: path.join(targetDir, mobileCapture) });
    copyToArtifacts(mobileCapture);

    console.log(`  ✔ [PASS] Captured ${desktopCapture} & ${mobileCapture} (Zero mobile overflow)`);
  }

  await browser.close();
  console.log("\n🎉 ALL ECONOMICS TESTS PASSED WITH 100% COMPLIANCE!\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in Economics Suite:", err);
  process.exit(1);
});
