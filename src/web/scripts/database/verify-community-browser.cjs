const fs = require("node:fs");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const net = require("node:net");
const { MongoClient, ObjectId } = require("mongodb");
const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");
const { load } = require("../test-loader.cjs");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { parseDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { ProjectRepository } = load("src/lib/projects/Repository.ts");
const { initializeProjects } = load("src/lib/projects/schema.ts");
async function main() {
  const originalTsconfig = fs.readFileSync("tsconfig.json", "utf8");
  assert.ok(
    process.env.MONGODB_TEST_URI,
    "Set MONGODB_TEST_URI to a disposable replica-set MongoDB.",
  );
  const listener = net.createServer();
  await new Promise((r) => listener.listen(0, "127.0.0.1", r));
  const port = listener.address().port;
  await new Promise((r) => listener.close(r));
  const base = `http://127.0.0.1:${port}`,
    secret = randomUUID() + randomUUID(),
    dbName = `apertus_browser_test_${randomUUID().replaceAll("-", "")}`;
  const client = new MongoClient(process.env.MONGODB_TEST_URI),
    db = client.db(dbName);
  let server,
    browser,
    output = "";
  try {
    await client.connect();
    await initializeProjects(db);
    const alice = new ObjectId(),
      bob = new ObjectId();
    await db.collection("users").insertMany([
      {
        _id: alice,
        email: "alice@example.test",
        name: "Alice",
        sessionVersion: 0,
      },
      { _id: bob, email: "bob@example.test", name: "Bob", sessionVersion: 0 },
    ]);
    const token = await encode({
      secret,
      token: { sub: alice.toHexString(), sessionVersion: 0 },
      maxAge: 600,
    });
    const bobToken = await encode({
      secret,
      token: { sub: bob.toHexString(), sessionVersion: 0 },
      maxAge: 600,
    });
    const recipe = premadeRecipe("area-perimeter");
    const repository = new ProjectRepository(db, alice.toHexString());
    const project = await repository.save({
      projectId: "browser-lab",
      projectType: "experiment",
      name: "Browser shapes",
      payload: parseDocument(JSON.stringify(recipe)),
      description: "Shapes to share",
      tags: ["math"],
      sharingAllowed: true,
      expectedRevision: null,
    });
    const composition = await repository.save({
      projectId: "browser-assembly",
      projectType: "composition",
      name: "Browser assembly",
      payload: recipe,
      description: "Reusable shapes",
      tags: ["math"],
      sharingAllowed: true,
      expectedRevision: null,
    });
    server = spawn(
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
        env: {
          ...process.env,
          MONGODB_URI: process.env.MONGODB_TEST_URI,
          MONGODB_DB_NAME: dbName,
          NEXTAUTH_SECRET: secret,
          NEXTAUTH_URL: base,
          GOOGLE_CLIENT_ID: "",
          GOOGLE_CLIENT_SECRET: "",
          APERTUS_BROWSER_TEST_DIR: ".next/community-tests",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    server.stdout.on("data", (b) => (output = (output + b).slice(-8000)));
    server.stderr.on("data", (b) => (output = (output + b).slice(-8000)));
    for (let i = 0; i < 120; i++) {
      try {
        if ((await fetch(`${base}/api/auth/session`)).status === 200) break;
      } catch {}
      if (server.exitCode !== null) throw new Error(output);
      await new Promise((r) => setTimeout(r, 500));
    }
    const request = (path, method = "GET", body, cookie = token) =>
      fetch(base + path, {
        method,
        headers: {
          ...(cookie ? { cookie: `next-auth.session-token=${cookie}` } : {}),
          origin: base,
          "Content-Type": "application/json",
          ...(cookie
            ? {
                "X-Library-Owner":
                  cookie === bobToken ? bob.toHexString() : alice.toHexString(),
              }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    assert.equal(
      (
        await request(
          "/api/projects",
          "POST",
          { ...project, expectedRevision: null },
          "",
        )
      ).status,
      401,
    );
    assert.equal(
      (await request("/api/projects/browser-lab", "GET", undefined, bobToken))
        .status,
      404,
    );
    const forged = await fetch(`${base}/api/projects/browser-lab`, {
      headers: {
        cookie: `next-auth.session-token=${bobToken}`,
        "X-Library-Owner": alice.toHexString(),
      },
    });
    assert.equal(forged.status, 409);
    const wrongOrigin = await fetch(
      `${base}/api/projects/browser-lab/publications`,
      {
        method: "POST",
        headers: {
          cookie: `next-auth.session-token=${token}`,
          origin: "https://wrong.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
    assert.equal(wrongOrigin.status, 403);
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    });
    const account = await browser.newContext();
    await account.addCookies([
      { name: "next-auth.session-token", value: token, url: base },
    ]);
    const page = await account.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto(`${base}/projects`);
    await page
      .getByRole("heading", { name: "Browser shapes", exact: true })
      .waitFor();
    await page
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: "Browser shapes", exact: true }),
      })
      .getByRole("button", { name: "Details & sharing" })
      .click();
    await page
      .getByRole("button", { name: "Save & review publication" })
      .click();
    await page
      .getByRole("heading", { name: "Review community publication" })
      .waitFor();
    await page.getByRole("dialog").getByRole("checkbox").check();
    await page.getByRole("button", { name: "Publish snapshot" }).click();
    await page
      .getByRole("heading", { name: "Published to the community" })
      .waitFor();
    const first = await db
      .collection("communityPublications")
      .findOne({ sourceProjectId: "browser-lab" });
    assert.ok(first);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.goto(`${base}/experiments/builder?project=browser-lab`);
    const title = page.getByRole("textbox", {
      name: "Experiment title",
      exact: true,
    });
    await title.waitFor();
    await title.fill("Browser shapes updated");
    await page
      .getByRole("button", { name: /^Save (draft|experiment)$/ })
      .click();
    await page
      .getByText("Saved to account", { exact: true })
      .first()
      .waitFor();
    assert.equal(
      (
        await db
          .collection("communityPublications")
          .findOne({ publicationId: first.publicationId })
      ).name,
      "Browser shapes",
    );
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page
      .getByRole("heading", { name: "Review community publication" })
      .waitFor();
    await page
      .getByRole("textbox", { name: "Public name" })
      .fill("Browser shapes — Version 2");
    await page.getByRole("dialog").getByRole("checkbox").check();
    await page.getByRole("button", { name: "Publish snapshot" }).click();
    await page
      .getByRole("heading", { name: "Published to the community" })
      .waitFor();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(
      await db
        .collection("communityPublications")
        .countDocuments({ sourceProjectId: "browser-lab" }),
      2,
    );
    await title.fill("Unsaved edit");
    await page
      .getByRole("button", { name: "New experiment", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Save changes before leaving?" })
      .waitFor();
    await page.getByRole("button", { name: "Keep editing", exact: true }).click();
    assert.equal(await title.inputValue(), "Unsaved edit");
    await page
      .getByRole("button", { name: "Clear canvas", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();

    assert.equal(
      await title.inputValue(),
      "Unsaved edit",
      "clear retains current name",
    );
    assert.equal(
      await db
        .collection("communityPublications")
        .countDocuments({ sourceProjectId: "browser-lab" }),
      2,
    );
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page
      .getByRole("heading", { name: "Review community publication" })
      .waitFor();
    await page.getByRole("dialog").getByRole("checkbox").check();
    assert.ok(
      await page.getByRole("button", { name: "Publish snapshot" }).isDisabled(),
      "empty drafts cannot be published",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    const cp = await repository.publish(
      client,
      "browser-assembly",
      "composition",
      {
        expectedRevision: composition.saveRevision,
        name: "Community assembly",
        description: "Assembly",
        tags: ["math"],
        licenseAccepted: true,
        idempotencyKey: "browser-composition",
      },
      "Alice",
    );
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`${base}/community`);
    await guestPage
      .getByRole("link", { name: "Browser shapes", exact: true })
      .waitFor();
    await guestPage
      .getByRole("button", { name: "Compositions", exact: true })
      .click();
    await guestPage
      .getByRole("link", { name: "Community assembly", exact: true })
      .waitFor();
    await guestPage.goto(`${base}/community/${first.publicationId}`);
    await guestPage.getByRole("button", { name: "Run experiment" }).click();
    await guestPage.getByRole("region", { name: "Project preview" }).waitFor();
    await guestPage.goto(
      `${base}/experiments/builder?community=${first.publicationId}`,
    );
    await guestPage
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .waitFor();
    assert.ok(await guestPage.getByText(/You're working locally/).count());
    assert.ok(
      await guestPage
        .getByRole("button", { name: "Publish", exact: true })
        .isDisabled(),
    );
    await guestPage
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .fill("Guest remix");
    await guestPage
      .getByRole("button", { name: /^Save (draft|experiment)$/ })
      .click();
    await guestPage
      .getByText("Saved on device", { exact: true })
      .first()
      .waitFor();
    await guestPage.goto(
      `${base}/experiments/builder?insert=${cp.publicationId}`,
    );
    await guestPage
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .waitFor();
    const bobContext = await browser.newContext();
    await bobContext.addCookies([
      { name: "next-auth.session-token", value: bobToken, url: base },
    ]);
    const bobPage = await bobContext.newPage();
    await bobPage.goto(`${base}/projects`);
    assert.equal(
      await bobPage
        .getByRole("heading", { name: "Browser shapes updated", exact: true })
        .count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: ".next/community-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(pageErrors, []);
    console.log(
      "Browser/API community flow passed: account gates, origins, owner isolation, publish review, immutable edits/new versions, New/Clear cancellation, guest remix/local saves, composition discovery/insertion, and mobile capture.",
    );
  } finally {
    if (browser) await browser.close();
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await new Promise((r) => server.once("exit", r));
    }
    fs.writeFileSync("tsconfig.json", originalTsconfig);
    await db.dropDatabase();
    await client.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
