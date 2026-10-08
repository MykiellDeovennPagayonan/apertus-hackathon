const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

function getExecutablePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  try {
    const defaultPath = chromium.executablePath();
    if (fs.existsSync(defaultPath)) return defaultPath;
  } catch {}
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

(async () => {
  console.log("Starting Playwright verification for builder AI controls...");
  const executablePath = getExecutablePath();
  console.log("Using browser executable:", executablePath || "(Playwright default)");

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(15000);

  const errors = [];
  page.on("pageerror", (e) => {
    // Ignore harmless hydration warnings if any
    errors.push(e.message);
  });

  try {
    // Navigate to /experiments/builder
    await page.goto("http://localhost:3000/experiments/builder", {
      waitUntil: "networkidle",
    });

    console.log("Page loaded. Verifying builder workspace...");

    // 1. Verify builder composer container exists and is docked in workspace
    const composer = page.locator(".builder-composer");
    await composer.waitFor({ state: "visible" });
    assert.ok(await composer.isVisible(), "Builder composer container should be visible");

    // 2. Verify CommandBar controls inside .builder-composer
    const inputArea = composer.locator("textarea.command-bar__input");
    await inputArea.waitFor({ state: "visible" });

    // Initial placeholder should be builder/composite-tailored
    const placeholder = await inputArea.getAttribute("placeholder");
    console.log("Initial placeholder:", placeholder);
    assert.match(
      placeholder,
      /Describe a composite to build|spring-mass oscillator/i,
      "Initial placeholder should reflect composite building context"
    );

    // Initial submit button should say "Build Composite"
    const submitBtn = composer.locator("button.command-bar__send");
    await submitBtn.waitFor({ state: "visible" });
    const initialSubmitText = (await submitBtn.textContent()).trim();
    console.log("Initial submit button label:", initialSubmitText);
    assert.match(initialSubmitText, /^Build Composite/, "Initial submit button must start with 'Build Composite'");
    assert.ok(await submitBtn.isDisabled(), "Submit button should be disabled when input is empty");

    // 3. Test typing a composite building prompt in CommandBar
    await inputArea.fill("Harmonic oscillator with damping and mass slider");
    await page.waitForTimeout(100);
    assert.ok(!(await submitBtn.isDisabled()), "Submit button should be enabled after entering prompt");

    // Clear input
    await inputArea.fill("");
    await page.waitForTimeout(50);

    // 4. Verify composite-tailored chips via Ideas button
    const ideasBtn = composer.locator("button.command-bar__ideas");
    await ideasBtn.waitFor({ state: "visible" });
    assert.ok(await ideasBtn.isVisible(), "Ideas button should be visible in docked CommandBar");
    await ideasBtn.click();
    await page.waitForTimeout(100);

    const chipElements = composer.locator(".command-bar__suggestion");
    const chipCount = await chipElements.count();
    console.log("Suggestions count in Ideas popover:", chipCount);
    assert.ok(chipCount > 0, "Ideas popover must contain suggestion chips");

    const chipTexts = await chipElements.allInnerTexts();
    console.log("Chip samples:", chipTexts.slice(0, 3));
    const hasCompositeChip = chipTexts.some((t) =>
      /composite|harmonic oscillator|inclined|balance scale|launcher/i.test(t)
    );
    assert.ok(hasCompositeChip, "Chips must include composite building suggestions");

    // Click first suggestion chip to verify it fills the input
    await chipElements.first().click();
    await page.waitForTimeout(50);
    const filledValue = await inputArea.inputValue();
    console.log("Filled value from suggestion:", filledValue);
    assert.ok(filledValue.length > 0, "Clicking suggestion chip should populate input");
    assert.ok(!(await submitBtn.isDisabled()), "Submit button should be enabled after chip selection");

    // Clear input
    await inputArea.fill("");
    await page.waitForTimeout(50);

    // 5. Test clicking "+ Add component" to open the component library dialog
    console.log("Testing Component Library dialog AI builder controls...");
    const addCompBtn = page.getByRole("button", { name: "+ Add component" });
    await addCompBtn.waitFor({ state: "visible" });
    await addCompBtn.click();

    // 6. Verify library dialog opens
    const dialog = page.locator(".component-library-dialog");
    await dialog.waitFor({ state: "visible" });
    assert.ok(await dialog.isVisible(), "Component library dialog should open");

    // 7. Verify "✨ Build with AI" section inside the catalog dialog
    const catalogAi = dialog.locator(".catalog-ai-builder");
    await catalogAi.waitFor({ state: "visible" });
    assert.ok(await catalogAi.isVisible(), "Catalog AI builder section (.catalog-ai-builder) must be visible");

    // Verify label contains "Build with AI"
    const aiLabel = catalogAi.locator(".catalog-ai-label");
    const aiLabelText = await aiLabel.textContent();
    assert.match(aiLabelText, /Build with AI/i, "Label should indicate Build with AI");

    // Verify input and submit button
    const aiInput = catalogAi.locator('input[type="text"]');
    await aiInput.waitFor({ state: "visible" });
    const aiSubmit = catalogAi.locator('button[type="submit"]');
    await aiSubmit.waitFor({ state: "visible" });

    assert.equal(
      await aiInput.getAttribute("placeholder"),
      "Describe a component or behavior to generate…",
      "Catalog AI input should have component builder placeholder"
    );
    assert.ok(await aiSubmit.isDisabled(), "Catalog AI submit button should be disabled when empty");

    // Test entering prompt into catalog AI input
    await aiInput.fill("Damped harmonic oscillator with spring stiffness slider");
    await page.waitForTimeout(100);
    assert.ok(!(await aiSubmit.isDisabled()), "Catalog AI submit button should be enabled after input");
    assert.equal(
      (await aiSubmit.textContent()).trim(),
      "Build with AI",
      "Catalog submit button should read 'Build with AI'"
    );

    // Close the library dialog
    const closeBtn = dialog.getByRole("button", { name: "Close library" });
    await closeBtn.click();
    await dialog.waitFor({ state: "hidden" });
    console.log("Component library dialog closed successfully.");

    // 8. Add a component to verify transition to populated composite state
    console.log("Adding a component to verify dynamic composite context update...");
    await addCompBtn.click();
    await dialog.waitFor({ state: "visible" });

    // Click on the first add button in catalog cards
    const compButton = dialog.locator(".catalog-card-actions button.builder-primary").first();
    await compButton.waitFor({ state: "visible" });
    await compButton.click();
    await page.waitForTimeout(300);

    // Verify dialog closes or close it if needed
    if (await dialog.isVisible()) {
      await closeBtn.click();
      await dialog.waitFor({ state: "hidden" });
    }

    // Now that the canvas has a node, verify the CommandBar updates its composite context
    const updatedPlaceholder = await inputArea.getAttribute("placeholder");
    console.log("Updated placeholder (canvas populated):", updatedPlaceholder);
    assert.match(
      updatedPlaceholder,
      /Add components, wire connections, or configure this composite/i,
      "Placeholder should update to composite editing context"
    );

    const updatedSubmitText = (await submitBtn.textContent()).trim();
    console.log("Updated submit button label:", updatedSubmitText);
    assert.match(
      updatedSubmitText,
      /^Update Composite/,
      "Submit button label should update to start with 'Update Composite'"
    );

    // Check for any unhandled page errors
    const fatalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("hydration")
    );
    if (fatalErrors.length > 0) {
      console.error("Encountered page errors:", fatalErrors);
    }
    assert.equal(fatalErrors.length, 0, "No page errors should occur during verification");

    console.log("All Playwright verifications passed successfully!");
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("Playwright verification failed:", err);
  process.exit(1);
});
