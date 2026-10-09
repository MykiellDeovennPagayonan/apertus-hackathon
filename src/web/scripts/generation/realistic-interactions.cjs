const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { idealPendulumPeriod } = require("./pendulum-oracle.cjs");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
module.exports.exercise = async (page, recipe, c, dir, h) => {
  const node = recipe.document.nodes.find((n) => n.definition === c.definition);
  const links = recipe.document.connections;

  async function control(target, command, value) {
    const link = links.find(
      (l) =>
        l.kind === "command" &&
        l.to.node === target.id &&
        l.to.port === command,
    );
    assert.ok(link, `Missing ${command}`);
    const n = recipe.document.nodes.find((n) => n.id === link.from.node);
    // The shared layout helper resolves presentation IDs without assuming model labels.
    const layout = (function visit(l) {
      return l.node === n.id ? l : l.children.map(visit).find(Boolean);
    })(recipe.document.layout);
    const item = recipe.document.presentation.items.find(
      (i) => i.layoutId === layout.id,
    );
    assert.ok(item);
    const host = page.locator(`[data-board-id="${item.id}"]`);
    if (n.definition === "controls/Button")
      await host.getByRole("button").click();
    else if (n.definition === "controls/Toggle") {
      const toggle = host.locator('input[type="checkbox"]');
      if (await toggle.count()) await toggle.setChecked(value);
      else {
        const button = host.getByRole("button");
        if ((await button.getAttribute("aria-pressed")) !== String(value))
          await button.click();
      }
    } else if (n.definition === "controls/Select") {
      if (await host.locator("select").count())
        await host.locator("select").selectOption(String(value));
      else
        await host
          .locator(`input[type="radio"][value='${JSON.stringify(value)}']`)
          .check();
    } else {
      const input = host
        .locator(
          'input[inputmode="decimal"],input[inputmode="numeric"],input[type="number"]',
        )
        .first();
      await input.fill(String(value));
      await input.press("Enter");
      await input.blur();
    }
    const apply = host.getByRole("button", {
      name: "Apply changes",
      exact: true,
    });
    if (await apply.count()) await apply.click();
  }
  const state = () => h.snapshot(page);
  if (c.id === "pendulum") {
    await control(node, "PHYS_PLAY", false);
    await control(node, "PEND_SET_LENGTH", 1);
    await control(node, "PEND_SET_LENGTH", 4);
    await h.poll(
      page,
      (s) =>
        Math.abs(
          s.state.outputs[node.id].period -
            idealPendulumPeriod(
              4,
              s.state.state[node.id].gravity,
              s.state.state[node.id].amplitude,
            ),
        ) < 1e-6,
      "Period mismatch",
    );
    await control(node, "PEND_SET_AMPLITUDE", 30);
    const rodLength = () =>
      page.locator("[data-pendulum-rod]").evaluate((line) => {
        const scale = line.getScreenCTM().a;
        return (
          Math.hypot(
            line.x2.baseVal.value - line.x1.baseVal.value,
            line.y2.baseVal.value - line.y1.baseVal.value,
          ) * scale
        );
      });
    await control(node, "PEND_SET_LENGTH", 5);
    const short = await rodLength();
    await h.capture(page, dir, "length-5-metres");
    await control(node, "PEND_SET_LENGTH", 17.4);
    const long = await rodLength();
    near(long / short, 17.4 / 5);
    await h.capture(page, dir, "length-17-4-metres");
    for (const amplitude of [60, 90]) {
      await control(node, "PEND_SET_AMPLITUDE", amplitude);
      const snapshot = (await state()).state;
      near(snapshot.outputs[node.id].angle, amplitude);
      near(
        snapshot.outputs[node.id].period,
        idealPendulumPeriod(17.4, snapshot.state[node.id].gravity, amplitude),
      );
      await h.capture(page, dir, `starting-angle-${amplitude}`);
    }
    fs.writeFileSync(
      path.join(dir, "pendulum-visual-oracle.json"),
      JSON.stringify(
        { short, long, ratio: long / short, expected: 17.4 / 5 },
        null,
        2,
      ),
    );
  }
  if (c.id === "circuit") {
    await control(node, "CIRC_SET_BULBS", 2);
    await control(node, "CIRC_SET_TOPOLOGY", "series");
    let s = await state();
    near(
      s.state.outputs[node.id].bulbPower,
      s.state.state[node.id].voltage ** 2 /
        (4 * s.state.state[node.id].resistance),
    );
    await h.capture(page, dir, "series-power");
    await control(node, "CIRC_SET_TOPOLOGY", "parallel");
    s = await state();
    near(
      s.state.outputs[node.id].bulbPower,
      s.state.state[node.id].voltage ** 2 / s.state.state[node.id].resistance,
    );
    await h.capture(page, dir, "parallel-power");
  }
  if (c.id === "eclipse") {
    await control(node, "set:moonOffset", 0);
    await control(node, "set:moonAngle", 180);
    await h.poll(
      page,
      (s) => /Solar/.test(s.state.outputs[node.id].event),
      "Solar alignment missing",
    );
    await h.capture(page, dir, "solar-alignment");
    await control(node, "set:moonAngle", 0);
    await h.poll(
      page,
      (s) => /lunar/.test(s.state.outputs[node.id].event),
      "Lunar alignment missing",
    );
    await h.capture(page, dir, "lunar-alignment");
    await control(node, "set:moonAngle", 90);
    await h.poll(
      page,
      (s) => s.state.outputs[node.id].event === "No eclipse",
      "Off-axis falsely eclipses",
    );
  }
  if (c.id === "sound") {
    const sources = recipe.document.nodes.filter(
      (n) => n.definition === "models/SinusoidalSignal",
    );
    assert.equal(sources.length, 2);
    for (const source of sources) {
      await control(source, "set:amplitude", 1);
      await control(source, "set:frequency", 200);
      await control(source, "set:phase", 0);
    }
    await control(sources[1], "set:phase", 180);
    await h.poll(
      page,
      (s) => s.state.outputs[node.id].residualPeak < 1e-9,
      "Cancellation failed",
    );
    await h.capture(page, dir, "wave-cancellation");
    await control(sources[1], "set:phase", 0);
    await h.poll(
      page,
      (s) => s.state.outputs[node.id].residualPeak > 1.9,
      "Reinforcement failed",
    );
    await h.capture(page, dir, "wave-reinforcement");
  }
  if (c.id === "traffic") {
    const options = page.getByText("Experiment options", { exact: true });
    const reset = async () => {
      await options.click();
      await page
        .getByRole("button", { name: "Reset lesson", exact: true })
        .click();
      await options.click();
      await control(node, "TRAFFIC_SET_HEADWAY", 0.5);
    };
    const motionHelp = page.getByLabel("Board navigation help", {
      exact: true,
    });
    const advance = async () => {
      await motionHelp.click();
      for (let step = 0; step < 32; step++)
        await page
          .getByRole("button", {
            name: "Advance time by 0.25 seconds",
            exact: true,
          })
          .click();
      await motionHelp.click();
    };
    await reset();
    await control(node, "TRAFFIC_SET_PLAYING", true);
    await advance();
    const baseline = (await state()).state;
    await reset();
    await control(node, "TRAFFIC_BRAKE");
    await h.poll(
      page,
      (s) => s.state.outputs[node.id].disturbanceActive,
      "Brake disturbance absent",
    );
    await advance();
    const disturbed = (await state()).state;
    near(baseline.outputs[node.id].elapsed, disturbed.outputs[node.id].elapsed);
    assert.equal(
      disturbed.outputs[node.id].vehicleCount,
      baseline.outputs[node.id].vehicleCount,
    );
    assert.ok(disturbed.outputs[node.id].minimumGap >= 0);
    assert.ok(disturbed.outputs[node.id].minimumSpeed >= 0);
    assert.ok(
      baseline.outputs[node.id].averageSpeed >
        disturbed.outputs[node.id].averageSpeed + 0.05,
      "Disturbance did not reduce average speed",
    );
    assert.ok(
      disturbed.state[node.id].vehicles.some(
        (v, i) =>
          i !== 0 && baseline.state[node.id].vehicles[i].speed - v.speed > 0.05,
      ),
      "Braking did not propagate to followers",
    );
    fs.writeFileSync(
      path.join(dir, "traffic-comparison.json"),
      JSON.stringify({ baseline, disturbed }, null, 2),
    );
    await control(node, "TRAFFIC_SET_PLAYING", false);
  }
  fs.writeFileSync(
    path.join(dir, "oracle.json"),
    JSON.stringify(
      { case: c.id, status: "passed", snapshot: await state() },
      null,
      2,
    ),
  );
};
