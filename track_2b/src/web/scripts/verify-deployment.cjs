const assert = require("node:assert/strict");
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("./test-loader.cjs");
const { accountFeaturesEnabled, offlineEnabled } = load(
  "src/lib/deployment.ts",
);
const { readLlmConfig } = load(
  "src/simulations/creation-and-editing/input/inference/config.ts",
);

for (const [env, expected] of [
  [{}, true],
  [{ OFFLINE: "false" }, true],
  [{ ACCOUNT_FEATURES_ENABLED: "false" }, false],
  [{ ACCOUNT_FEATURES_ENABLED: " TRUE " }, true],
  [{ OFFLINE: "true" }, false],
  [{ OFFLINE: "true", ACCOUNT_FEATURES_ENABLED: "true" }, false],
])
  assert.equal(accountFeaturesEnabled(env), expected);
assert.throws(
  () => accountFeaturesEnabled({ ACCOUNT_FEATURES_ENABLED: "maybe" }),
  /ACCOUNT_FEATURES_ENABLED must be true or false/,
);
assert.throws(() => accountFeaturesEnabled({ OFFLINE: "maybe" }), /OFFLINE/);

const hosted = {
  OFFLINE: "false",
  ACCOUNT_FEATURES_ENABLED: "false",
  APERTUS_PROVIDER: "huggingface",
  APERTUS_HF_BASE_URL: "https://router.huggingface.co/featherless-ai/v1",
  APERTUS_HF_MODEL: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
  HF_TOKEN: "test-token",
};
assert.equal(offlineEnabled(hosted), false);
assert.equal(accountFeaturesEnabled(hosted), false);
assert.equal(readLlmConfig(hosted).connection, "huggingface");
assert.equal(readLlmConfig(hosted).model, hosted.APERTUS_HF_MODEL);
assert.equal(
  readLlmConfig({ ACCOUNT_FEATURES_ENABLED: "false" }).connection,
  "local",
);
assert.throws(
  () => readLlmConfig({ ...hosted, OFFLINE: "true" }),
  /local Apertus/,
);
assert.throws(
  () =>
    readLlmConfig({ OFFLINE: "true", LLM_BASE_URL: "https://example.com/v1" }),
  /local inference endpoint/,
);

(async () => {
  const savedEnv = { ...process.env };
  const originalLoad = Module._load;
  // The CJS test loader cannot import this ESM-only adapter; it must stay unused.
  Module._load = function (name, ...args) {
    if (name === "@auth/mongodb-adapter")
      return {
        MongoDBAdapter: () =>
          assert.fail("Must not initialize account storage"),
      };
    return originalLoad.call(this, name, ...args);
  };
  try {
    Object.assign(process.env, hosted, {
      MONGODB_URI: "mongodb://127.0.0.1:1",
      MONGODB_DB_NAME: "test",
      NEXTAUTH_URL: "http://localhost:43100",
      NEXTAUTH_SECRET: "x".repeat(32),
      GOOGLE_CLIENT_ID: "test",
      GOOGLE_CLIENT_SECRET: "test",
    });
    const { getDatabase } = load("src/lib/database/client.ts");
    const { authConfigured, googleConfigured, getLibrarySession } = load(
      "src/lib/auth/server.ts",
    );
    const { projectRequest } = load("src/lib/projects/http.ts");
    const { handleLibraryRequest } = load("src/lib/library/http.ts");
    const { handleAccountRequest } = load("src/lib/auth/account-http.ts");
    const health = load("src/app/api/health/route.ts");
    const auth = load("src/app/api/auth/[...nextauth]/route.ts");
    const DeploymentProvider = load(
      "src/app/_components/DeploymentProvider.tsx",
    ).default;
    const AuthProvider = load("src/app/_components/AuthProvider.tsx").default;
    const SiteHeader = load("src/app/_components/SiteHeader.tsx").default;

    // Existing credentials must not re-enable accounts or cause a database connection.
    for (const offline of ["false", "true"]) {
      process.env.OFFLINE = offline;
      assert.throws(() => getDatabase(), /disabled/);
      assert.equal(authConfigured(), false);
      assert.equal(googleConfigured(), false);
      assert.equal(await getLibrarySession(), null);
      for (const method of ["GET", "POST"]) {
        const request = new Request("http://localhost:43100/api/community", {
          method,
        });
        for (const community of [false, true]) {
          const response = await projectRequest(request, [], community);
          assert.equal(response.status, 503);
          assert.match((await response.json()).message, /disabled/);
        }
      }
      for (const kind of ["simulations", "components"]) {
        const response = await handleLibraryRequest(
          new Request("http://localhost:43100/api/library"),
          kind,
        );
        assert.equal(response.status, 503);
      }
      const account = await handleAccountRequest(
        new Request("http://localhost:43100/api/auth/account/register", {
          method: "POST",
        }),
        "register",
        async () => assert.fail("Must not send account email"),
      );
      assert.equal(account.status, 503);
      const context = { params: Promise.resolve({ nextauth: ["signin"] }) };
      assert.equal(
        (
          await auth.POST(
            new Request("http://localhost:43100/api/auth/signin", {
              method: "POST",
            }),
            context,
          )
        ).status,
        503,
      );
      const session = await auth.GET(
        new Request("http://localhost:43100/api/auth/session"),
        {
          params: Promise.resolve({ nextauth: ["session"] }),
        },
      );
      assert.deepEqual(await session.json(), {});
      assert.deepEqual(await health.GET().json(), {
        status: "ready",
        offline: offline === "true",
        accountFeaturesEnabled: false,
      });
    }
    const markup = renderToStaticMarkup(
      React.createElement(
        DeploymentProvider,
        { accountFeaturesEnabled: false },
        React.createElement(
          AuthProvider,
          { accountFeaturesEnabled: false },
          React.createElement(SiteHeader, { active: "projects" }),
        ),
      ),
    );
    assert.match(markup, /Saved in this browser/);
    assert.match(markup, /href="\/projects"/);
    assert.doesNotMatch(markup, /href="\/(community|auth\/sign-in)"/);
  } finally {
    Module._load = originalLoad;
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
  }
  console.log(
    "Deployment checks passed: inference configuration, offline compatibility, disabled account APIs, and browser-save UI.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
