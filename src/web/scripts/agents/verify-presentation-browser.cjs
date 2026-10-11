const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("../test-loader.cjs");
const { AgentRunner, createAgentRun } = load(
  "src/simulations/runtime/agents/runner.ts",
);
const { MemoryRunRepository } = load(
  "src/simulations/runtime/agents/memoryRepository.ts",
);
const { debateEnvironment, debatePolicy } = load(
  "src/simulations/components/systems/debate/environment.ts",
);
const { runView } = load("src/simulations/runtime/agents/contracts.ts");
const origin = process.env.AGENT_TEST_ORIGIN || "http://127.0.0.1:43100";
const identity = {
  provider: "fixture",
  model: "scripted-presentation",
  connection: "test",
};
const slugs = process.env.AGENT_PRESENTATION_SLUG
  ? [process.env.AGENT_PRESENTATION_SLUG]
  : ["debate", "agent-conversation"];
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
  try {
    for (const slug of slugs) {
      const debate = slug === "debate",
        total = debate ? 18 : 8,
        participants = debate ? 6 : 2;
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      page.setDefaultTimeout(30000);
      const errors = [],
        repo = new MemoryRunRepository();
      let calls = 0,
        ids = 0,
        fail = false;
      let heldSpeech = null,
        releaseSpeech;
      page.on("pageerror", (error) => errors.push(error.message));
      const runner = new AgentRunner(
        repo,
        {
          generate: async (observation) => {
            calls++;
            if (fail) {
              fail = false;
              throw new Error("Scripted inference failure");
            }
            const paragraph = debate
              ? "School projects give students time to work together and ask questions while a teacher is present. But this change needs care: independent practice still helps students check what they understand. I would preserve short practice tasks and use projects for deeper learning."
              : "A safer crossing could make the bus stop easier to reach for families and people with limited mobility. We should talk with residents about where they feel unsafe, then try a small change before rebuilding the entire street. Costs and travel time matter too.";
            const references = observation.requiredReferenceActors
              ? [
                  observation.events.find((e) =>
                    observation.requiredReferenceActors.includes(e.actor),
                  ).id,
                ]
              : observation.events.length
                ? [observation.events.at(-1).id]
                : [];
            return {
              proposal: {
                action: "speak",
                text: `${paragraph} ${paragraph}`,
                references,
                memory: "PRIVATE fixture note",
                plan: [],
              },
              metadata: {
                model: identity,
                elapsedMs: 12,
                inputTokens: null,
                outputTokens: null,
              },
            };
          },
        },
        debate ? debateEnvironment : undefined,
        undefined,
        debate ? debatePolicy : undefined,
      );
      await page.route("**/api/agents", async (route) => {
        const body = route.request().postDataJSON();
        try {
          let result;
          if (body.operation === "create") {
            const run = createAgentRun(
              `fixture-${slug}-${++ids}`,
              "owner",
              body.configuration,
              identity,
            );
            await repo.create(run);
            result = {
              handle: { id: run.id },
              run: runView(run),
              persistence: "process",
            };
          } else if (body.operation === "step") {
            await new Promise((resolve) => setTimeout(resolve, 180));
            if (heldSpeech) await heldSpeech;
            result = {
              run: runView(
                await runner.step(
                  body.handle.id,
                  "owner",
                  body.expectedRevision,
                  new AbortController().signal,
                ),
              ),
            };
          } else if (body.operation === "cancel")
            result = {
              run: runView(await runner.cancel(body.handle.id, "owner")),
            };
          else
            result = { run: runView(await repo.read(body.handle.id, "owner")) };
          await route.fulfill({ status: 200, json: result });
        } catch (error) {
          await route.fulfill({
            status: 502,
            json: {
              error: error.message,
              run: body.handle
                ? runView(await repo.read(body.handle.id, "owner"))
                : undefined,
            },
          });
        }
      });
      const button = (name) => page.getByRole("button", { name, exact: true });
      const next = () => button(debate ? "Next speech" : "Next response");
      const count = (n) =>
        page.waitForFunction(
          (n) =>
            Number(
              document.querySelector(".agent-conversation")?.dataset
                .acceptedCount,
            ) === n,
          n,
        );
      const capture = (state) =>
        page.screenshot({
          path: `/tmp/apertus-${slug}-redesign-${state}.png`,
          fullPage: true,
        });
      const option = async (name) => {
        await button("More options").click();
        await button(name).click();
      };
      const stageGeometry = () =>
        page.locator(".agent-conversation").evaluate((el) => {
          const host = el.closest(".board-item");
          return {
            zoom: new DOMMatrix(getComputedStyle(host).transform).a,
            height: el.getBoundingClientRect().height,
          };
        });
      await page.goto(`${origin}/experiments?experiment=${slug}`);
      await next().waitFor();
      assert.equal(await page.locator(".agent-profile").count(), participants);
      assert.equal(calls, 0);
      assert.equal(
        await page
          .locator(".agent-actions > .agent-action-row > button:visible")
          .count(),
        3,
        "Only next, autoplay and options compete in the opening controls",
      );
      await capture("opening");
      const openingGeometry = await stageGeometry();
      assert.equal(
        await page.getByText("Run information", { exact: true }).isVisible(),
        false,
      );
      await option("Conversation details");
      await page
        .getByRole("dialog", { name: "Conversation details", exact: true })
        .waitFor();
      await capture("details-opening");
      assert.deepEqual(
        await stageGeometry(),
        openingGeometry,
        "Details do not expand or shrink the conversation stage",
      );
      await page.keyboard.press("Escape");
      assert.ok(
        await button("More options").evaluate(
          (el) => el === document.activeElement,
        ),
      );
      await page.setViewportSize({ width: 1024, height: 540 });
      await page.waitForTimeout(250);
      await capture("compact-opening");
      const compactTarget = await next().boundingBox();
      assert.ok(
        compactTarget &&
          compactTarget.y >= 35 &&
          compactTarget.y + compactTarget.height < 450 &&
          compactTarget.height >= 36,
        "Primary controls must remain visible in the screenshot-sized viewport",
      );
      const compactZoom = (await stageGeometry()).zoom;
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      await page.waitForFunction(
        (zoom) =>
          new DOMMatrix(
            getComputedStyle(
              document
                .querySelector(".agent-conversation")
                .closest(".board-item"),
            ).transform,
          ).a > zoom,
        compactZoom,
      );
      const enlargedTarget = await next().boundingBox();
      assert.ok(
        enlargedTarget.x >= 0 &&
          enlargedTarget.x + enlargedTarget.width <= 1024 &&
          enlargedTarget.y >= 30 &&
          enlargedTarget.y + enlargedTarget.height < 450,
        "Primary controls remain visible when the short viewport is zoomed in",
      );
      await capture("compact-zoomed");
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(250);
      await capture("short-opening");
      const shortTarget = await next().boundingBox();
      assert.ok(
        shortTarget &&
          shortTarget.y >= 0 &&
          shortTarget.y + shortTarget.height < 640 &&
          shortTarget.height >= 36,
        "The main action must remain above workspace controls on a short desktop",
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page
        .getByRole("button", { name: /^Meet / })
        .first()
        .click();
      await page.getByRole("dialog", { name: /personality/ }).waitFor();
      await capture("personality");
      await page.keyboard.press("Escape");
      assert.equal(
        await page.getByRole("dialog", { name: /personality/ }).count(),
        0,
      );
      assert.ok(
        await page
          .getByRole("button", { name: /^Meet / })
          .first()
          .evaluate((el) => el === document.activeElement),
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () =>
          document.querySelector(".agent-conversation").getBoundingClientRect()
            .width < 400,
      );
      await capture("mobile-opening");
      const openingTarget = await next().boundingBox();
      assert.ok(
        openingTarget &&
          openingTarget.y >= 0 &&
          openingTarget.y + openingTarget.height < 760 &&
          openingTarget.height >= 44,
        "The main action must be visible above workspace controls on a phone",
      );

      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.waitForTimeout(200);
      const beforeSpeech = await stageGeometry();
      fail = true;
      heldSpeech = new Promise((resolve) => {
        releaseSpeech = resolve;
      });
      await next().focus();
      await page.keyboard.press("Enter");
      const speaking = page.locator(".agent-profile.is-speaking");
      await speaking.waitFor();
      await page.waitForFunction(() => {
        const ring = document.querySelector(
          ".agent-profile.is-speaking .agent-person .agent-speaking-ring",
        );
        return ring && Number(getComputedStyle(ring).opacity) > 0.99;
      });
      const ringGeometry = await speaking
        .locator(".agent-person .agent-speaking-ring")
        .evaluate((el) => {
          const ring = el.getBoundingClientRect(),
            svg = el.ownerSVGElement.getBoundingClientRect(),
            host = el.closest(".board-item").getBoundingClientRect();
          return {
            visible: Number(getComputedStyle(el).opacity) > 0.99,
            ring: {
              top: ring.top,
              left: ring.left,
              bottom: ring.bottom,
              right: ring.right,
            },
            svg: {
              top: svg.top,
              left: svg.left,
              bottom: svg.bottom,
              right: svg.right,
            },
            host: { top: host.top },
            inside:
              ring.top > svg.top &&
              ring.left > svg.left &&
              ring.bottom < svg.bottom &&
              ring.right < svg.right &&
              svg.top >= host.top,
          };
        });
      await capture("speaking");
      assert.ok(
        ringGeometry.visible && ringGeometry.inside,
        `Speaking ring stays inside the portrait and canvas item: ${JSON.stringify(ringGeometry)}`,
      );
      await speaking.locator(".agent-person").hover();
      await capture("speaking-hover");
      assert.ok(
        await speaking.locator(".agent-person > svg").evaluate((el) => {
          const avatar = el.getBoundingClientRect(),
            host = el.closest(".board-item").getBoundingClientRect();
          return (
            avatar.top >= host.top &&
            avatar.left >= host.left &&
            avatar.right <= host.right &&
            avatar.bottom <= host.bottom
          );
        }),
        "Hovering the speaking portrait must keep its ring inside the canvas item",
      );
      releaseSpeech();
      heldSpeech = null;
      await button(debate ? "Retry speech" : "Retry response").waitFor();
      await capture("failure");
      assert.equal(await page.locator(".agent-speech-bubble").count(), 0);
      await button(debate ? "Retry speech" : "Retry response").click();
      await count(1);
      assert.equal(
        (await stageGeometry()).zoom,
        beforeSpeech.zoom,
        "Accepting speech must not zoom out",
      );
      await capture("speech");
      const speakerLayout = await page
        .locator(".agent-speaker-line")
        .evaluate((el) => ({
          avatar: el.querySelector("svg").getBoundingClientRect().width,
          content: el.scrollWidth,
          available: el.clientWidth,
        }));
      assert.ok(
        speakerLayout.avatar <= 64 &&
          speakerLayout.content <= speakerLayout.available + 2,
        "Speaker identity must fit beside its small portrait",
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () =>
          document.querySelector(".agent-conversation").getBoundingClientRect()
            .width < 400,
      );
      await capture("mobile-speech");
      assert.ok(
        await page
          .locator(".agent-speech-bubble")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 2),
        "Phone speeches use normal page scrolling instead of a nested reading area",
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      await button("Autoplay").click();
      await button(
        debate ? "Pause after speech" : "Pause after response",
      ).click();
      await count(2);
      await page.waitForFunction(
        () => !document.querySelector(".agent-primary").disabled,
      );
      await button("Autoplay").click();
      await count(total);
      assert.ok(await next().isDisabled());
      const beforeBrowsing = calls;
      await button("← Back").click();
      assert.equal(
        await page
          .locator(".agent-conversation")
          .getAttribute("data-showing-speech"),
        String(total - 1),
      );
      await button("Forward →").click();
      assert.equal(
        await page
          .locator(".agent-conversation")
          .getAttribute("data-showing-speech"),
        String(total),
      );
      assert.equal(
        calls,
        beforeBrowsing,
        "Browsing accepted speeches makes no inference calls",
      );
      await capture("complete");
      const completedGeometry = await stageGeometry();
      await option("Conversation details");
      await page.getByText(new RegExp(`^Full transcript · ${total}`)).click();
      assert.deepEqual(
        await stageGeometry(),
        completedGeometry,
        "Expanding all recorded speeches leaves stage geometry unchanged",
      );
      const links = page
        .locator(".agent-full-transcript")
        .getByRole("link", { name: /Responds to/ });
      assert.ok((await links.count()) >= (debate ? 6 : 1));
      await links.first().click();
      assert.equal(
        await page
          .locator(".agent-conversation")
          .getAttribute("data-showing-speech"),
        "1",
      );
      await option("Conversation details");
      const downloaded = page.waitForEvent("download");
      await button(
        debate ? "Download debate" : "Download conversation",
      ).click();
      const artifact = JSON.parse(
        fs.readFileSync(await (await downloaded).path(), "utf8"),
      );
      assert.equal(artifact.run.count, total);
      assert.ok(!JSON.stringify(artifact).includes("PRIVATE"));
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Zoom out", exact: true }).click();
      await page.waitForFunction((oldZoom) => {
        const el = document
          .querySelector(".agent-conversation")
          .closest(".board-item");
        return new DOMMatrix(getComputedStyle(el).transform).a < oldZoom;
      }, completedGeometry.zoom);
      const chosenZoom = (await stageGeometry()).zoom;
      await option("Conversation details");
      await page.keyboard.press("Escape");
      assert.equal(
        (await stageGeometry()).zoom,
        chosenZoom,
        "Inspection preserves an explicitly chosen zoom",
      );
      await page.reload();
      await next().waitFor();
      await option("Resume saved run");
      await count(total);
      assert.equal(calls, beforeBrowsing);
      await option(debate ? "Replay debate" : "Replay conversation");
      await count(0);
      await button(
        debate ? "Next recorded speech" : "Next recorded response",
      ).click();
      await count(1);
      await button(
        debate ? "Show all recorded speeches" : "Show all recorded responses",
      ).click();
      await count(total);
      assert.equal(calls, beforeBrowsing);
      await option(debate ? "Restart debate" : "Restart conversation");
      await count(0);
      if (debate) {
        await option("Conversation details");
        await page.getByLabel("Inspect a run").selectOption({ index: 1 });
        await count(total);
        await option("Conversation details");
        await page.getByLabel("Inspect a run").selectOption("");
        await count(0);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await capture("mobile-restart");
      const target = await next().boundingBox();
      assert.ok(target.width >= 100 && target.height >= 44);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator(".gas-experiment-tools > summary").click();
      await page.getByRole("link", { name: /Remix/ }).click();
      await page.waitForURL("**/experiments/builder**");
      await button("Build").click();
      await page
        .locator(".agent-profile")
        .nth(participants - 1)
        .waitFor();
      await page.waitForFunction(() => {
        const rect = document
          .querySelector(".agent-conversation")
          ?.getBoundingClientRect();
        return rect && rect.width >= 400 && rect.top >= 250 && rect.top < 600;
      });
      await capture("build");
      await button("Save experiment").click();
      await page.reload();
      await page.getByRole("button", { name: /Try lesson/ }).click();
      await next().waitFor();
      await next().click();
      await count(1);
      await page.waitForFunction(
        () => !document.querySelector(".agent-primary").disabled,
      );
      await page.waitForFunction(() => {
        const transcript = document.querySelector(".agent-conversation");
        const host = transcript?.closest(".board-item");
        return (
          host &&
          transcript.getBoundingClientRect().bottom <=
            host.getBoundingClientRect().bottom + 2
        );
      });
      assert.ok(
        await page
          .locator(".agent-person")
          .evaluateAll((els) =>
            els.every(
              (el) =>
                getComputedStyle(el).borderTopWidth === "0px" &&
                getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)",
            ),
          ),
        "Builder styling must not turn portrait buttons back into cards",
      );
      await capture("try-lesson");
      assert.deepEqual(errors, []);
      console.log(
        `${slug}: illustrated opening, personality modal/focus recovery, mobile targets, keyboard failure/retry, autoplay/pause, ${total} speeches, back/forward, references, private-free export, reload/resume/replay, restart, save, Build, Remix and Try lesson passed (scripted model).`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
