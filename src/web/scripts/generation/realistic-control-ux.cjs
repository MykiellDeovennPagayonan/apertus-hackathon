const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Operate the real shared controls in accepted live graphs. No generation mocks.
module.exports.auditControls = async (page, dir, h) => {
  const records = [];
  for (const host of await page
    .locator(".board-item:has(.recipe-playback)")
    .all()) {
    const button = host.locator(".recipe-playback button");
    assert.equal(await host.locator('input[type="checkbox"]').count(), 0);
    assert.equal(
      await host.getByRole("button", { name: "Apply changes" }).count(),
      0,
    );
    const initial = await button.getAttribute("aria-pressed");
    assert.ok(initial === "true" || initial === "false");
    await button.focus();
    await button.press("Space");
    assert.equal(
      await button.getAttribute("aria-pressed"),
      String(initial !== "true"),
    );
    assert.equal(
      (await button.innerText()).trim(),
      initial === "true" ? "Play" : "Pause",
    );
    await button.press("Space");
    assert.equal(await button.getAttribute("aria-pressed"), initial);
    records.push({ control: "playback", keyboard: "passed", immediate: true });
  }
  for (const form of await page
    .locator(".board-item .catalog-form:has(input[inputmode])")
    .all()) {
    assert.equal(
      await form.locator('button[type="submit"]').count(),
      0,
      "A live exploration parameter still requires Apply",
    );
    const input = form.locator("input[inputmode]").first();
    const accepted = await input.inputValue();
    const before = (await h.snapshot(page)).state;
    // A syntactically valid intermediate edit must also remain local until commit.
    await input.fill(accepted === "1" ? "2" : "1");
    assert.deepEqual(
      (await h.snapshot(page)).state,
      before,
      "Typing changed the experiment before Enter/blur",
    );
    await input.press("Escape");
    assert.equal(await input.inputValue(), accepted);
    assert.deepEqual((await h.snapshot(page)).state, before);
    records.push({
      control: await input.getAttribute("aria-label"),
      typing: "local until commit",
      escape: "passed",
    });
  }
  fs.writeFileSync(
    path.join(dir, "control-ux.json"),
    JSON.stringify(records, null, 2),
  );
};
