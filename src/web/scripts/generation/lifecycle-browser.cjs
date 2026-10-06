const assert = require("node:assert/strict");
const path = require("node:path");
const { cases } = require("./cases.cjs");
const h = require("./helpers.cjs");
module.exports = async function lifecycle(browser, records) {
  for (const storageFailure of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const dir = path.join(
      h.out,
      "fixtures",
      storageFailure ? "storage-recovery" : "lifecycle",
    );
    const record = {
      case: storageFailure ? "storage-recovery" : "lifecycle",
      evidence: "deterministic-failure-fixture",
      status: "running",
      intentionalAborts: [],
    };
    records.push(record);
    h.recordPage(page, record);
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    let release;
    try {
      if (storageFailure)
        await context.addInitScript(() => {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key === "apertus-builder-library-v1")
              throw new DOMException(
                "Fixture storage quota",
                "QuotaExceededError",
              );
            return original.call(this, key, value);
          };
        });
      let mode = "created";
      let accepted;
      let captured;
      let enter;
      let entered;
      await page.route("**/api/apertus", async (route) => {
        const request = route.request().postDataJSON();
        let result;
        if (mode === "hold") {
          captured = request;
          enter();
          await new Promise((resolve) => (release = resolve));
          result = h.fixtureResult(cases[2], request);
        } else if (mode === "unsupported")
          result = {
            protocolVersion: 1,
            status: "unsupported",
            requestId: request.requestId,
            message: "Momentum is outside the supported teaching contracts.",
          };
        else if (mode === "malformed")
          result = {
            ...h.fixtureResult(cases[0], request),
            recipe: { bad: true },
          };
        else if (mode === "failed")
          result = {
            protocolVersion: 1,
            status: "failed",
            requestId: request.requestId,
            message: "Fixture timeout",
            retryable: true,
          };
        else {
          accepted = h.fixtureResult(cases[0], request);
          result = accepted;
        }
        await route
          .fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "x-request-id": request.requestId },
            body: JSON.stringify(result),
          })
          .catch((error) => {
            if (mode !== "created" && !record.intentionalAborts.length)
              throw error;
          });
      });
      await page.goto(new URL("/", h.base).href);
      await page
        .getByRole("textbox", { name: "Describe an experiment…", exact: true })
        .fill(cases[0].prompt);
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await h.poll(
        page,
        (s) => !!accepted && s.requestId === accepted.requestId,
        "Initial failure fixture lesson did not activate",
      );
      if (storageFailure) {
        await page.getByText(/couldn't be saved in this browser/).waitFor();
        assert.equal((await h.snapshot(page)).recipe.id, accepted.recipe.id);
        await h.exportRecipe(page, dir);
      } else {
        const prior = (await h.snapshot(page)).sessionId;
        const prompt = page.getByRole("textbox", {
          name: "Ask for a change…",
          exact: true,
        });
        for (const [next, text, feedback] of [
          ["unsupported", "Explain momentum", /That request isn't supported/],
          ["failed", "A timeout fixture", /Fixture timeout/],
          ["malformed", "A malformed result", /Couldn't complete your request/],
        ]) {
          mode = next;
          await prompt.fill(text);
          await page
            .getByRole("button", { name: "Apply", exact: true })
            .click();
          await page.getByText(feedback).waitFor();
          assert.equal((await h.snapshot(page)).sessionId, prior);
          assert.equal(await prompt.inputValue(), text);
        }
        mode = "hold";
        entered = new Promise((resolve) => (enter = resolve));
        await prompt.fill("Create a bridge while keeping this lesson");
        await page.getByRole("button", { name: "Apply", exact: true }).click();
        await entered;
        await page.getByRole("button", { name: "Stop", exact: true }).click();
        record.intentionalAborts.push({
          requestId: captured.requestId,
          reason: "User pressed Stop",
        });
        assert.equal(
          await prompt.inputValue(),
          "Create a bridge while keeping this lesson",
        );
        assert.equal((await h.snapshot(page)).sessionId, prior);
        mode = "created";
        await prompt.fill(cases[0].prompt);
        await page.getByRole("button", { name: "Apply", exact: true }).click();
        await h.poll(
          page,
          (s) => s.requestId === accepted.requestId && s.sessionId !== prior,
          "Newer request did not supersede stopped request",
        );
        const newer = accepted.requestId;
        release();
        release = null;
        await page.waitForFunction(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve(true)),
              ),
            ),
        );
        assert.equal((await h.snapshot(page)).requestId, newer);
        assert.equal(
          (await h.snapshot(page)).recipe.document.nodes.find(
            (n) => n.definition === "models/arithmetic",
          ).configuration.task.a,
          7,
        );
        await h.capture(page, dir, "recovered");
      }
      assert.deepEqual(record.browserErrors, []);
      record.status = "passed";
    } catch (error) {
      record.status = "failed";
      record.error = String(error.stack || error);
      await h.capture(page, dir, "failure").catch(() => {});
    } finally {
      release?.();
      try {
        await h.saveEvidence(page, record, dir);
      } finally {
        try {
          await context.tracing.stop({ path: path.join(dir, "trace.zip") });
        } finally {
          await context.close();
        }
      }
    }
  }
};
