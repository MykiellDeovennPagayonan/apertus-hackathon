// A controlled HTTP stream verifies visible progress while generation is pending.
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const h = require("./helpers.cjs");
const { cases } = require("./cases.cjs");
(async () => {
  let current;
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    response.writeHead(200, {
      "Content-Type": "application/x-ndjson",
      "X-Request-ID": input.requestId,
      "Access-Control-Allow-Origin": "*",
    });
    const send = (event) =>
      response.write(
        `${JSON.stringify({ requestId: input.requestId, ...event })}\n`,
      );
    current = { input, response, send };
    send({ type: "progress", stage: "understanding" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await h.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    await page.route("**/api/apertus", (route) =>
      route.continue({
        url: `http://127.0.0.1:${server.address().port}/api/apertus`,
      }),
    );
    await page.goto(h.base);
    const field = page.getByRole("textbox", {
      name: "Describe an experiment…",
      exact: true,
    });
    await field.fill(cases[0].prompt);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page
      .getByText("Understanding your request…", { exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector(".command-bar__elapsed")?.textContent !==
        "0s elapsed",
    );
    while (!current) await new Promise((resolve) => setTimeout(resolve, 20));
    current.send({ type: "progress", stage: "choosing" });
    await page
      .getByText("Choosing suitable activities…", { exact: true })
      .waitFor();
    current.send({ type: "progress", stage: "building" });
    await page.getByText("Building your lesson…", { exact: true }).waitFor();
    assert.equal(await page.locator(".command-bar__progress li").count(), 2);
    fs.mkdirSync("/tmp/apertus-progress", { recursive: true });
    await page.screenshot({ path: "/tmp/apertus-progress/desktop.png" });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.screenshot({ path: "/tmp/apertus-progress/phone.png" });
    assert.ok(
      await page.locator(".command-bar").evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          bounds.left >= 0 &&
          bounds.right <= window.innerWidth &&
          element.scrollWidth <= element.clientWidth
        );
      }),
    );
    const stop = page.getByRole("button", { name: /Stop/ });
    await stop.click();
    await page
      .getByText("Stopped — your prompt is still here.", { exact: true })
      .waitFor();
    assert.equal(await field.inputValue(), cases[0].prompt);
    assert.equal(await page.locator(".command-bar__elapsed").count(), 0);
    current = null;
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page
      .getByText("Understanding your request…", { exact: true })
      .waitFor();
    assert.equal(await page.locator(".command-bar__progress li").count(), 0);
    while (!current) await new Promise((resolve) => setTimeout(resolve, 20));
    current.send({ type: "progress", stage: "adjusting" });
    await page.getByText("Making adjustments…", { exact: true }).waitFor();
    current.send({
      type: "result",
      result: {
        protocolVersion: 1,
        requestId: current.input.requestId,
        status: "failed",
        message: "Please try again.",
        retryable: true,
      },
    });
    current.response.end();
    await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
    assert.equal(await page.locator(".command-bar__elapsed").count(), 0);
    current = null;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    while (!current) await new Promise((resolve) => setTimeout(resolve, 20));
    const accepted = h.fixtureResult(cases[0], current.input);
    current.send({ type: "progress", stage: "checking" });
    await page.getByText("Checking your lesson…", { exact: true }).waitFor();
    current.send({ type: "result", result: accepted });
    current.response.end();
    await page
      .getByText("Ready — explore your lesson.", { exact: true })
      .waitFor();
    assert.equal(await page.locator(".command-bar__elapsed").count(), 0);
    console.log(
      "Progress browser passed: streamed stages, completed steps, elapsed time, 320px layout, Stop, clean restart, adjustments, Retry and lesson activation.",
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
