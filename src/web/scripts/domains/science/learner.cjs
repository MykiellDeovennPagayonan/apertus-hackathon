const assert = require("node:assert/strict");
const h = require("../../generation/helpers.cjs");
const primary = {
  cell: "Next stage",
  immune: "Next response stage",
  genome: "Create an offspring",
  pollination: "Next day",
  invasive: "Next season",
  plates: "Advance movement",
  volcano: "See what happens next",
  water: "Follow the water",
};
exports.primary = primary;
exports.state = async (page) => {
  await page.waitForFunction(
    () => window.__experimentSnapshot?.()?.state?.state?.model,
  );
  return (await h.snapshot(page)).state.state.model;
};
exports.begin = async (page, kind) => {
  if (kind === "immune")
    await page
      .getByRole("button", { name: "Introduce infection", exact: true })
      .click();
  if (kind === "invasive")
    await page
      .getByRole("button", { name: "Introduce a plant", exact: true })
      .click();
};
exports.steps = async (page, kind, n) => {
  for (let i = 0; i < n; i++)
    await page
      .getByRole("button", { name: primary[kind], exact: true })
      .click();
};
exports.open = async (page) => {
  const dialog = page.locator(".science-investigation[open]");
  if (!(await dialog.count()))
    await page.locator(".science-investigation-trigger").click();
  await dialog.waitFor();
  return dialog;
};
exports.set = async (page, spec, key, value) => {
  if (spec.kind === "cell") {
    await page
      .getByRole("switch", { name: "Separation error" })
      .setChecked(!!value);
    assert.equal((await exports.state(page)).settings[key], value);
    return;
  }
  const d = await exports.open(page);
  const f = spec.settings.find((f) => f.key === key);
  if (spec.settings.length > 1)
    await d
      .getByLabel("Change one condition", { exact: true })
      .selectOption(key);
  if (f.options)
    await d.getByLabel(f.label, { exact: true }).selectOption(String(value));
  else {
    const field = d.getByLabel(`Exact ${f.label.toLowerCase()}`, {
      exact: true,
    });
    await field.fill(String(value));
    await field.press("Tab");
  }
  if (f.restart)
    await d
      .getByRole("button", { name: "Apply and restart", exact: true })
      .click();
  assert.equal((await exports.state(page)).settings[key], value);
};
exports.close = async (page) => {
  const d = page.locator(".science-investigation[open]");
  if (await d.count())
    await d.getByRole("button", { name: "Done", exact: true }).click();
};
