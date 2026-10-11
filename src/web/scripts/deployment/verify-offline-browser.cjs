const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { chromium } = require("playwright");
const { load } = require("../test-loader.cjs");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { RECIPE_LIBRARY_KEY } = load(
  "src/simulations/builder/library/RecipeRepository.ts",
);

(async () => {
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const root = path.resolve(__dirname, "../..");
  const dist = process.env.APERTUS_BROWSER_TEST_DIR || ".next";
  assert.ok(
    fs.existsSync(path.join(root, dist, "BUILD_ID")),
    "Run a production build first",
  );
  let log = "";
  const server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        OFFLINE: "true",
        MONGODB_URI: "mongodb://must-not-connect:27017",
        MONGODB_DB_NAME: "offline-fixture",
        NEXTAUTH_SECRET: "x".repeat(32),
        NEXTAUTH_URL: base,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => {
    log = (log + chunk).slice(-5000);
  });
  server.stderr.on("data", (chunk) => {
    log = (log + chunk).slice(-5000);
  });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null) throw Error(log);
      try {
        const response = await fetch(`${base}/api/health`);
        if (response.ok && (await response.json()).offline) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, log);
    for (const route of ["/community", "/community/fixture", "/auth/sign-in"])
      assert.equal((await fetch(base + route)).status, 404, route);
    for (const route of [
      "/api/community",
      "/api/projects",
      "/api/library/simulations",
    ])
      assert.equal((await fetch(base + route)).status, 503, route);
    assert.deepEqual(
      await (await fetch(`${base}/api/auth/session`)).json(),
      {},
    );

    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) =>
      requests.push(new URL(request.url()).pathname),
    );
    await page.goto(`${base}/projects`);
    await page.getByRole("heading", { name: "My projects" }).waitFor();
    assert.equal(
      await page.getByRole("link", { name: "Sign in", exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByRole("link", { name: "Community", exact: true }).count(),
      0,
    );
    const recipe = premadeRecipe("area-perimeter");
    await page.evaluate(
      ({ key, recipe }) => localStorage.setItem(key, JSON.stringify([recipe])),
      { key: RECIPE_LIBRARY_KEY, recipe },
    );
    await page.reload();
    await page.getByRole("heading", { name: "Saved on this device" }).waitFor();
    assert.ok((await page.locator("body").innerText()).includes(recipe.title));
    await page.goto(`${base}/experiments/builder?new=1`);
    await page
      .getByRole("button", { name: "Download recipe", exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Publish", exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByRole("link", { name: "Sign in", exact: true }).count(),
      0,
    );
    assert.ok(
      await page.evaluate(() => isSecureContext && Boolean(navigator.locks)),
    );
    assert.equal(
      requests.filter(
        (route) =>
          route.startsWith("/api/auth") ||
          route.startsWith("/api/community") ||
          route.startsWith("/api/projects"),
      ).length,
      0,
      "Offline UI must not poll account services",
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "Offline production browser checks passed: runtime flag, disabled routes/navigation, local library, builder, secure-context APIs, and no auth polling.",
    );
  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await exited;
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
