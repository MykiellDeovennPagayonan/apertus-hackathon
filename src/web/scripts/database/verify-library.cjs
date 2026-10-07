const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { MongoClient } = require("mongodb");
const { load } = require("../test-loader.cjs");
const { LibraryRepository } = load("src/lib/database/LibraryRepository.ts");
const { initializeLibraryCollections } = load("src/lib/database/schema.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");

async function main() {
  const uri = process.env.MONGODB_TEST_URI;
  assert.ok(uri, "Set MONGODB_TEST_URI to a disposable local MongoDB server.");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  const db = client.db(`apertus_test_${randomUUID().replaceAll("-", "")}`);
  try {
    await client.connect();
    await initializeLibraryCollections(db);
    const alice = new LibraryRepository(db, "alice");
    const document = canonicalDocument();
    document.authored.lesson.title = document.lesson.title = "My experiment";
    const saved = await alice.saveSimulation({
      id: "experiment-1",
      document,
      expectedRevision: null,
    });
    assert.equal(saved.revision, 1);
    assert.deepEqual(
      (await alice.getSimulation("experiment-1")).document,
      document,
    );
    assert.equal((await alice.listSimulations()).length, 1);
    console.log("Saved experiment round-trip passed.");

    const bob = new LibraryRepository(db, "bob");
    assert.deepEqual(await bob.listSimulations(), []);
    assert.equal(await bob.getSimulation("experiment-1"), null);
    await bob.saveSimulation({
      id: "experiment-1",
      document,
      expectedRevision: null,
    });
    const changed = structuredClone(document);
    changed.authored.lesson.title = changed.lesson.title = "Alice's update";
    const attempts = await Promise.allSettled([
      alice.saveSimulation({
        id: "experiment-1",
        document: changed,
        expectedRevision: 1,
      }),
      alice.saveSimulation({
        id: "experiment-1",
        document,
        expectedRevision: 1,
      }),
    ]);
    assert.equal(
      attempts.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      attempts.find((result) => result.status === "rejected").reason.status,
      409,
    );
    assert.equal((await alice.getSimulation("experiment-1")).revision, 2);
    assert.deepEqual(
      (await bob.getSimulation("experiment-1")).document,
      document,
    );
    await assert.rejects(
      alice.saveSimulation({
        id: "experiment-1",
        document,
        expectedRevision: null,
      }),
      (error) => error.status === 409,
    );
    await assert.rejects(
      alice.saveSimulation({
        id: { $ne: null },
        document,
        expectedRevision: null,
      }),
      (error) => error.status === 400,
    );
    await assert.rejects(
      alice.saveSimulation({
        id: "invalid",
        document: {},
        expectedRevision: null,
      }),
      (error) => error.status === 400,
    );
    await assert.rejects(
      alice.saveSimulation({
        id: "forged-owner",
        ownerId: "bob",
        document,
        expectedRevision: null,
      }),
      (error) => error.status === 400,
    );
    console.log(
      "Owner isolation, concurrent conflicts, and invalid-input preservation passed.",
    );

    const recipe = structuredClone(premadeRecipe("area-perimeter"));
    recipe.id = "user/component-1";
    const component = await alice.saveComponent({
      recipe,
      expectedRevision: null,
    });
    assert.equal(component.revision, 1);
    assert.deepEqual((await alice.getComponent(recipe.id)).recipe, recipe);
    assert.deepEqual(await bob.listComponents(), []);
    console.log("Reusable component round-trip and ownership passed.");
  } finally {
    await db.dropDatabase();
    await client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
