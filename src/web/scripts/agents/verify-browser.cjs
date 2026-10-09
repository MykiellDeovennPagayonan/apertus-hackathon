const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const origin = process.env.AGENT_TEST_ORIGIN || "http://localhost:43100";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromium.executablePath())
      ? {}
      : {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(20000);
  const errors = [];
  const responses = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", async (response) => {
    if (response.url().endsWith("/api/agents")) {
      const body = await response.json().catch(() => null);
      if (body?.run) responses.push(body.run);
    }
  });
  try {
    await page.goto(`${origin}/experiments?experiment=agent-conversation`);
    await page
      .getByRole("button", { name: "Next response", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/apertus-agents-opening.png",
      fullPage: true,
    });
    console.log((await page.locator("body").innerText()).slice(0, 2500));
    assert.equal(
      responses.length,
      0,
      "Opening a view must not generate a response",
    );
    await page
      .getByRole("button", { name: "Next response", exact: true })
      .click();
    await page
      .locator(".agent-messages li")
      .nth(0)
      .waitFor({ timeout: 125000 });
    await page
      .getByRole("button", { name: "Next response", exact: true })
      .click();
    await page
      .locator(".agent-messages li")
      .nth(1)
      .waitFor({ timeout: 125000 });
    assert.equal(await page.locator(".agent-messages li").count(), 2);
    await page.screenshot({
      path: "/tmp/apertus-agents-responses.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Continue automatically", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pause after response", exact: true })
      .click();
    await page
      .locator(".agent-messages li")
      .nth(2)
      .waitFor({ timeout: 125000 });
    assert.equal(await page.locator(".agent-messages li").count(), 3);
    await page
      .getByRole("button", { name: "Continue automatically", exact: true })
      .click();
    await page
      .locator(".agent-messages li")
      .nth(7)
      .waitFor({ timeout: 600000 });
    assert.equal(await page.locator(".agent-messages li").count(), 8);
    assert.ok(
      await page
        .getByRole("button", { name: "Next response", exact: true })
        .isDisabled(),
    );
    const final = responses.filter((run) => run.count === 8).at(-1);
    assert.ok(final);
    fs.writeFileSync(
      "/tmp/apertus-agent-browser-run.json",
      JSON.stringify(final, null, 2),
    );
    await page.screenshot({
      path: "/tmp/apertus-agents-complete.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const b = document
        .querySelector(".agent-primary")
        ?.getBoundingClientRect();
      return b && b.width >= 100 && b.height >= 36;
    });
    await page.screenshot({
      path: "/tmp/apertus-agents-mobile.png",
      fullPage: true,
    });
    const nextBox = await page
      .getByRole("button", { name: "Next response", exact: true })
      .boundingBox();
    assert.ok(nextBox && nextBox.width >= 100 && nextBox.height >= 36);
    const requestCount = responses.length;
    await page
      .getByRole("button", { name: "Replay conversation", exact: true })
      .click();
    assert.equal(await page.locator(".agent-messages li").count(), 0);
    await page
      .getByRole("button", { name: "Next recorded response", exact: true })
      .click();
    assert.equal(await page.locator(".agent-messages li").count(), 1);
    await page
      .getByRole("button", { name: "Show all recorded responses", exact: true })
      .click();
    assert.equal(await page.locator(".agent-messages li").count(), 8);
    assert.equal(
      responses.length,
      requestCount,
      "Replay performs no inference",
    );
    await page
      .getByRole("button", { name: "Restart conversation", exact: true })
      .click();
    assert.equal(await page.locator(".agent-messages li").count(), 0);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".gas-experiment-tools > summary").click();
    console.log("Links:", await page.getByRole("link").allTextContents());
    await page.getByRole("link", { name: /Remix/ }).click();
    await page.waitForURL("**/experiments/builder**");
    const tryLesson = page.getByRole("button", { name: /Try lesson/ });
    await tryLesson.waitFor();
    await page.screenshot({
      path: "/tmp/apertus-agents-builder.png",
      fullPage: true,
    });
    await tryLesson.click();
    await page
      .getByRole("button", { name: "Next response", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/apertus-agents-try-lesson.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Next response", exact: true })
      .click();
    await page
      .locator(".agent-messages li")
      .nth(0)
      .waitFor({ timeout: 125000 });
    assert.deepEqual(errors, []);
    console.log(
      "Browser: live step, pause, autoplay completion, restart, mobile targets, Remix and Try lesson passed. Evidence in /tmp/apertus-agents-*.png",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
