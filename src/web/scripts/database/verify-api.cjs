const fs = require("node:fs");
const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const net = require("node:net");
const path = require("node:path");
const { MongoClient } = require("mongodb");
const { chromium } = require("playwright");
const { load } = require("../test-loader.cjs");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function main() {
  const originalTsconfig = fs.readFileSync("tsconfig.json", "utf8");
  assert.ok(
    process.env.MONGODB_TEST_URI,
    "Set MONGODB_TEST_URI to a disposable local MongoDB server.",
  );
  const client = new MongoClient(process.env.MONGODB_TEST_URI);
  const dbName = `apertus_test_${randomUUID().replaceAll("-", "")}`;
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const secret = randomUUID() + randomUUID();
  let output = "";
  const startServer = (configured) => {
    const child = spawn(
      process.execPath,
      [
        require.resolve("next/dist/bin/next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: path.resolve(__dirname, "../.."),
        windowsHide: true,
        env: {
          ...process.env,
          MONGODB_URI: process.env.MONGODB_TEST_URI,
          MONGODB_DB_NAME: dbName,
          NEXTAUTH_SECRET: configured ? secret : "",
          NEXTAUTH_URL: base,
          GOOGLE_CLIENT_ID: configured ? "integration-test" : "",
          GOOGLE_CLIENT_SECRET: configured ? "integration-test" : "",
          APERTUS_BROWSER_TEST_DIR: ".next/database-tests",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout.on("data", (chunk) => {
      output = (output + chunk).slice(-5000);
    });
    child.stderr.on("data", (chunk) => {
      output = (output + chunk).slice(-5000);
    });
    return child;
  };
  let server = startServer(false);
  const stopServer = async () => {
    if (server.exitCode !== null) return;
    const exited = new Promise((resolve) => server.once("exit", resolve));
    if (process.platform === "win32")
      execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else server.kill("SIGTERM");
    await exited;
  };
  const waitUntilReady = async () => {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        const response = await fetch(`${base}/api/auth/session`);
        if (response.status === 200 || response.status === 404) {
          ready = true;
          break;
        }
      } catch {
        /* The test server is still starting. */
      }
      if (server.exitCode !== null) throw new Error(output);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, `Test server did not start. ${output}`);
  };
  try {
    await client.connect();
    await waitUntilReady();
    assert.equal(
      (await fetch(`${base}/api/auth/signin`)).status,
      503,
      "Missing server credentials must disable sign-in.",
    );
    assert.deepEqual(
      await (await fetch(`${base}/api/auth/session`)).json(),
      {},
    );
    console.log(
      "Incomplete server configuration disables sign-in and retains guest sessions.",
    );
    await stopServer();
    server = startServer(true);
    await waitUntilReady();
    const response = await fetch(`${base}/api/library/simulations`);
    assert.equal(
      response.status,
      401,
      "Unauthenticated library reads are denied.",
    );
    console.log("Unauthenticated library access is denied.");

    const { MongoDBAdapter } = await import("@auth/mongodb-adapter");
    const adapter = MongoDBAdapter(client, { databaseName: dbName });
    const alice = await adapter.createUser({
      name: "Alice",
      email: "alice@example.test",
      emailVerified: null,
    });
    const bob = await adapter.createUser({
      name: "Bob",
      email: "bob@example.test",
      emailVerified: null,
    });
    const { encode } = require("next-auth/jwt");
    const token = await encode({
      secret,
      token: { sub: alice.id, sessionVersion: 0 },
      maxAge: 600,
    });
    const bobToken = await encode({
      secret,
      token: { sub: bob.id, sessionVersion: 0 },
      maxAge: 600,
    });
    const request = (url, cookie = token, body, origin = base) =>
      fetch(`${base}${url}`, {
        method: body ? "PUT" : "GET",
        headers: {
          cookie: `next-auth.session-token=${cookie}`,
          origin,
          "content-type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const session = await request("/api/auth/session");
    assert.equal((await session.json()).user.id, alice.id);
    const providers = await request("/api/auth/providers");
    assert.equal((await providers.json()).google.type, "oauth");
    assert.equal((await request("/api/auth/signin")).status, 200);
    const forged = await request("/api/library/simulations", "invented-token");
    assert.equal(forged.status, 401);
    const document = canonicalDocument();
    document.authored.lesson.title = document.lesson.title =
      "Alice's saved lesson";
    const write = { id: "shared-name", document, expectedRevision: null };
    const save = await request("/api/library/simulations", token, write);
    assert.equal(save.status, 200, await save.clone().text());
    assert.equal((await save.json()).entry.revision, 1);
    const read = await request("/api/library/simulations?id=shared-name");
    assert.deepEqual((await read.json()).entry.document, document);
    const privateRead = await request(
      "/api/library/simulations?id=shared-name",
      bobToken,
    );
    assert.equal(privateRead.status, 404);
    assert.deepEqual(
      (await (await request("/api/library/simulations", bobToken)).json())
        .entries,
      [],
    );
    assert.equal(
      (await request("/api/library/simulations", bobToken, write)).status,
      200,
    );
    assert.equal(
      (await request("/api/library/simulations", token, write)).status,
      409,
    );
    assert.equal(
      (
        await request("/api/library/simulations", token, {
          ...write,
          expectedRevision: 1,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("/api/library/simulations", token, {
          ...write,
          expectedRevision: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/api/library/simulations", token, {
          ...write,
          ownerId: bob.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          "/api/library/simulations",
          token,
          write,
          "https://other.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/api/library/simulations", token, {
          ...write,
          document: {},
          expectedRevision: 2,
        })
      ).status,
      400,
    );
    const oversized = await request("/api/library/simulations", token, {
      ...write,
      recovery: "x".repeat(2_000_001),
    });
    assert.equal(oversized.status, 413);
    console.log(
      "Real NextAuth sessions, owner isolation, CSRF, validation, and save conflicts passed.",
    );

    const recipe = structuredClone(premadeRecipe("area-perimeter"));
    recipe.id = "user/api-component";
    recipe.title = "Alice cloud component";
    recipe.document.lesson.title = recipe.title;
    const componentBody = { recipe, expectedRevision: null };
    assert.equal(
      (await request("/api/library/components", token, componentBody)).status,
      200,
    );
    const components = await request("/api/library/components");
    assert.deepEqual((await components.json()).entries[0].recipe, recipe);
    assert.equal(
      (
        await request(
          `/api/library/components?id=${encodeURIComponent(recipe.id)}`,
          bobToken,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/api/library/components", token, {
          recipe,
          expectedRevision: 1,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("/api/library/components", token, {
          recipe,
          expectedRevision: 1,
        })
      ).status,
      409,
    );
    const expiredToken = await encode({
      secret,
      token: { sub: alice.id, sessionVersion: 0 },
      maxAge: -1000,
    });
    assert.equal(
      (await request("/api/library/simulations", expiredToken)).status,
      401,
    );
    const originalFetch = global.fetch;
    global.fetch = (url, options = {}) =>
      originalFetch(new URL(url, base), {
        ...options,
        headers: {
          ...options.headers,
          cookie: `next-auth.session-token=${token}`,
          origin: base,
        },
      });
    try {
      const { loadRemoteSimulations, saveRemoteSimulation } = load(
        "src/lib/library/client.ts",
      );
      assert.equal((await loadRemoteSimulations(alice.id))[0].revision, 2);
      const clientDocument = structuredClone(document);
      clientDocument.lesson.title = clientDocument.authored.lesson.title =
        "Client round trip";
      const remote = await saveRemoteSimulation(
        { id: "client-saved", document: clientDocument },
        alice.id,
        null,
      );
      assert.equal(remote.revision, 1);
      await assert.rejects(loadRemoteSimulations(bob.id), /account changed/i);
      console.log(
        "Browser library client uses server saves and rejects a changed account.",
      );
    } finally {
      global.fetch = originalFetch;
    }
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    });
    try {
      const first = await browser.newContext();
      await first.addCookies([
        { name: "next-auth.session-token", value: token, url: base },
      ]);
      const page = await first.newPage();
      await page.goto(`${base}/experiments/builder`);
      await page
        .getByRole("textbox", { name: "Experiment title", exact: true })
        .fill("Browser account experiment");
      await page
        .getByRole("button", { name: /^Save (draft|experiment)$/ })
        .click();
      await page
        .getByText("Saved to account", { exact: true })
        .first()
        .waitFor();
      const entries = (await (await request("/api/library/simulations")).json())
        .entries;
      assert.ok(
        entries.some(
          (entry) =>
            entry.document.lesson.title === "Browser account experiment",
        ),
      );

      const second = await browser.newContext();
      await second.addCookies([
        { name: "next-auth.session-token", value: token, url: base },
      ]);
      const otherDevice = await second.newPage();
      await otherDevice.goto(`${base}/experiments/builder`);
      await otherDevice
        .getByLabel("More document actions", { exact: true })
        .click();
      await otherDevice
        .getByRole("button", { name: "Open saved experiment…", exact: true })
        .click();
      await otherDevice
        .getByRole("button", {
          name: "Open Browser account experiment",
          exact: true,
        })
        .click();
      assert.equal(
        await otherDevice
          .getByRole("textbox", { name: "Experiment title", exact: true })
          .inputValue(),
        "Browser account experiment",
      );

      await otherDevice
        .getByRole("button", { name: "+ Add component", exact: true })
        .click();
      await otherDevice
        .getByRole("searchbox", { name: "Search components", exact: true })
        .fill("Alice cloud component");
      await otherDevice
        .getByText("Alice cloud component", { exact: true })
        .waitFor();
      await otherDevice
        .getByRole("button", { name: "Close library", exact: true })
        .click();

      await page
        .getByRole("textbox", { name: "Experiment title", exact: true })
        .fill("Unsaved local edit");
      await page.waitForFunction(
        (owner) =>
          localStorage
            .getItem(`apertus-builder-draft-v1:${owner}`)
            ?.includes("Unsaved local edit"),
        alice.id,
      );
      const original = entries.find(
        (entry) => entry.document.lesson.title === "Browser account experiment",
      );
      const updated = structuredClone(original.document);
      updated.authored.lesson.title = updated.lesson.title =
        "Other device update";
      assert.equal(
        (
          await request("/api/library/simulations", token, {
            id: original.id,
            document: updated,
            expectedRevision: original.revision,
          })
        ).status,
        200,
      );
      await page.reload();
      const title = page.getByRole("textbox", {
        name: "Experiment title",
        exact: true,
      });
      await title.waitFor();
      assert.equal(await title.inputValue(), "Unsaved local edit");
      const conflict = page.waitForResponse(
        (response) =>
          response.url().includes("/api/projects/") &&
          response.request().method() === "PUT",
      );
      await page
        .getByRole("button", { name: /^Save (draft|experiment)$/ })
        .click();
      assert.equal(
        (await conflict).status(),
        409,
        "A recovered stale draft must not overwrite a newer device save.",
      );
      assert.equal(
        (
          await (
            await request(`/api/library/simulations?id=${original.id}`)
          ).json()
        ).entry.document.lesson.title,
        "Other device update",
      );

      await second.clearCookies();
      await second.addCookies([
        { name: "next-auth.session-token", value: bobToken, url: base },
      ]);
      await otherDevice.reload();
      await otherDevice
        .getByLabel("More document actions", { exact: true })
        .click();
      await otherDevice
        .getByRole("button", { name: "Open saved experiment…", exact: true })
        .click();
      await otherDevice
        .getByRole("dialog", { name: "Open saved experiment", exact: true })
        .waitFor();
      assert.equal(
        await otherDevice
          .getByRole("button", {
            name: "Open Browser account experiment",
            exact: true,
          })
          .count(),
        0,
      );
      await otherDevice
        .getByRole("button", { name: "Close library", exact: true })
        .click();
      assert.notEqual(
        await otherDevice
          .getByRole("textbox", { name: "Experiment title", exact: true })
          .inputValue(),
        "Browser account experiment",
      );

      const guest = await browser.newContext();
      const guestPage = await guest.newPage();
      await guestPage.goto(`${base}/experiments/builder`);
      await guestPage
        .getByRole("textbox", { name: "Experiment title", exact: true })
        .fill("Guest device experiment");
      await guestPage
        .getByRole("button", { name: /^Save (draft|experiment)$/ })
        .click();
      await guestPage
        .getByText("Saved on device", { exact: true })
        .first()
        .waitFor();
      assert.ok(
        await guestPage.evaluate(() =>
          localStorage
            .getItem("apertus-builder-library-v1")
            ?.includes("Guest device experiment"),
        ),
      );
      const cloudEntries = (
        await (await request("/api/library/simulations")).json()
      ).entries;
      assert.ok(
        !cloudEntries.some(
          (entry) => entry.document.lesson.title === "Guest device experiment",
        ),
      );
      console.log(
        "Browser UI saves to MongoDB, reopens on another device, isolates accounts, and retains guest saves.",
      );
    } finally {
      await browser.close();
    }
    await client
      .db(dbName)
      .collection("users")
      .updateOne({ email: alice.email }, { $inc: { sessionVersion: 1 } });
    assert.equal((await request("/api/library/simulations")).status, 401);
    console.log(
      "Component persistence, expired sessions, and revoked sessions passed.",
    );
  } finally {
    await stopServer();
    fs.writeFileSync("tsconfig.json", originalTsconfig);
    await client.db(dbName).dropDatabase();
    await client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
