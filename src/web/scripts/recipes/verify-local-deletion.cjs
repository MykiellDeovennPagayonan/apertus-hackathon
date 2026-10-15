const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { deleteLocalProject } = load("src/lib/projects/local.ts");
const { LIBRARY_KEY } = load("src/simulations/builder/persistence/storage.ts");
const { RECIPE_LIBRARY_KEY } = load(
  "src/simulations/builder/library/RecipeRepository.ts",
);

(async () => {
  const records = new Map();
  global.localStorage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
  };
  const locks = [];
  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: {
      locks: {
        request: async (key, write) => {
          locks.push(key);
          return write();
        },
      },
    },
  });
  for (const [type, key, other] of [
    ["experiment", LIBRARY_KEY, RECIPE_LIBRARY_KEY],
    ["composition", RECIPE_LIBRARY_KEY, LIBRARY_KEY],
  ]) {
    const retained = [{ id: "keep", legacy: true }, null];
    records.set(key, JSON.stringify([{ id: "delete" }, ...retained]));
    records.set(other, JSON.stringify([{ id: "delete" }]));
    await deleteLocalProject("delete", type);
    assert.deepEqual(JSON.parse(records.get(key)), retained);
    assert.deepEqual(JSON.parse(records.get(other)), [{ id: "delete" }]);
    assert.equal(locks.at(-1), key);
    records.set(key, "{}");
    await assert.rejects(deleteLocalProject("delete", type), /unreadable/);
    assert.equal(records.get(key), "{}");
    records.set(key, "broken JSON");
    await assert.rejects(deleteLocalProject("delete", type), SyntaxError);
    assert.equal(records.get(key), "broken JSON");
  }
  navigator.locks = undefined;
  records.set(LIBRARY_KEY, JSON.stringify([{ id: "delete" }]));
  await deleteLocalProject("delete", "experiment");
  assert.equal(records.get(LIBRARY_KEY), "[]");
  localStorage.setItem = () => {
    throw new Error("Storage unavailable");
  };
  await assert.rejects(
    deleteLocalProject("delete", "experiment"),
    /Storage unavailable/,
  );
  console.log("Local project deletion checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
