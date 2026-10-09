const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { MongoClient } = require("mongodb");
const { load } = require("../test-loader.cjs");
const { ProjectRepository, CommunityRepository } = load(
  "src/lib/projects/Repository.ts",
);
const { initializeProjects } = load("src/lib/projects/schema.ts");
const { migrateOwner } = load("src/lib/projects/migration.ts");
const { nameFields } = load("src/lib/projects/validation.ts");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { parseDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
async function main() {
  assert.equal(nameFields("  ＬＡＢ   Project ").normalizedName, "lab project");
  assert.throws(() => nameFields("bad\nname"));
  const client = new MongoClient(process.env.MONGODB_TEST_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  assert.ok(
    process.env.MONGODB_TEST_URI,
    "Set MONGODB_TEST_URI to a disposable replica-set MongoDB.",
  );
  const db = client.db(
    `apertus_projects_test_${randomUUID().replaceAll("-", "")}`,
  );
  try {
    await client.connect();
    await initializeProjects(db);
    const alice = new ProjectRepository(db, "alice"),
      bob = new ProjectRepository(db, "bob"),
      community = new CommunityRepository(db);
    const recipe = premadeRecipe("area-perimeter"),
      document = parseDocument(JSON.stringify(recipe));
    const input = {
      projectId: "lab-1",
      projectType: "experiment",
      name: "Lab One",
      description: "Shared shapes",
      tags: ["math"],
      payload: document,
      sharingAllowed: false,
      expectedRevision: null,
      idempotencyKey: "create-one",
    };
    let project = await alice.save(input);
    assert.equal(project.saveRevision, 1);
    assert.equal(
      (await alice.save(input)).projectId,
      project.projectId,
      "create retries are idempotent",
    );
    await assert.rejects(
      alice.save({
        ...input,
        projectId: "lab-2",
        name: "  LAB   ONE ",
        idempotencyKey: "duplicate-name",
      }),
      (e) => e.code === "name_conflict",
    );
    await assert.rejects(
      alice.save({
        ...input,
        projectId: "different-create-id",
        name: "Different name",
      }),
      (e) => e.code === "idempotency_conflict",
    );
    assert.equal(await alice.nameAvailable("LAB ONE", "experiment"), false);
    assert.equal(
      await alice.nameAvailable("LAB ONE", "experiment", "lab-1"),
      true,
    );
    await bob.save(input);
    await assert.rejects(bob.get("missing"), (e) => e.status === 404);
    assert.equal((await bob.list()).entries.length, 1);
    assert.equal((await community.list()).entries.length, 0);
    const candidate = {
      expectedRevision: 1,
      name: "Lab One",
      description: "Shared shapes",
      tags: ["math"],
      idempotencyKey: "publish-one",
      licenseAccepted: true,
    };
    await assert.rejects(
      alice.publish(client, "lab-1", "experiment", candidate, "Alice"),
      (e) => e.code === "sharing_disabled",
    );
    project = await alice.save({
      ...input,
      expectedRevision: 1,
      sharingAllowed: true,
    });
    const publish = { ...candidate, expectedRevision: project.saveRevision };
    const races = await Promise.all([
      alice.publish(client, "lab-1", "experiment", publish, "Alice"),
      alice.publish(client, "lab-1", "experiment", publish, "Alice"),
    ]);
    const p1 = races[0];
    assert.equal(p1.publicationId, races[1].publicationId);
    assert.equal(p1.versionNumber, 1);
    assert.equal(
      await db.collection("communityPublications").countDocuments({}),
      1,
    );
    assert.equal(
      (await community.list({ type: "experiment", tag: "math" })).entries
        .length,
      1,
    );
    assert.ok(!("sourceProjectId" in p1));
    assert.ok(!("ownerId" in p1));
    const originalHash = p1.contentHash;
    project = await alice.save({
      ...input,
      expectedRevision: project.saveRevision,
      sharingAllowed: true,
      name: "Private edit",
    });
    assert.equal(
      (await community.get(p1.publicationId)).contentHash,
      originalHash,
      "private edits preserve public snapshot",
    );
    await assert.rejects(
      alice.publish(
        client,
        "lab-1",
        "experiment",
        {
          ...candidate,
          expectedRevision: project.saveRevision,
          idempotencyKey: "different-request",
        },
        "Alice",
      ),
      (e) => e.code === "name_conflict",
    );
    await assert.rejects(
      alice.publish(
        client,
        "lab-1",
        "experiment",
        { ...publish, name: "Another name" },
        "Alice",
      ),
      (e) => e.code === "idempotency_conflict",
    );
    const p2 = await alice.publish(
      client,
      "lab-1",
      "experiment",
      {
        ...candidate,
        name: "Lab One — Version 2",
        expectedRevision: project.saveRevision,
        idempotencyKey: "publish-two",
      },
      "Alice",
    );
    assert.equal(p2.versionNumber, 2);
    assert.equal((await alice.get("lab-1")).lastPublishedVersionNumber, 2);
    const remix = await alice.save({
      ...input,
      projectId: "remix-project",
      name: "Remixed lab",
      idempotencyKey: "remix-create",
      basedOnPublicationId: p2.publicationId,
      sourcePublicationIds: [p2.publicationId],
    });
    assert.equal(remix.basedOn.authorName, "Alice");
    assert.equal(remix.attributions[0].publicationId, p2.publicationId);
    assert.equal(
      await alice.nameAvailable(p2.name, "experiment", undefined, true),
      false,
    );
    assert.notEqual(p1.publicationId, p2.publicationId);
    await assert.rejects(
      community.withdraw(p1.publicationId, "bob"),
      (e) => e.status === 404,
    );
    await community.report(
      p2.publicationId,
      "bob",
      "Please review attribution.",
    );
    await community.withdraw(p1.publicationId, "alice");
    await assert.rejects(
      community.get(p1.publicationId),
      (e) => e.status === 404,
    );
    assert.equal(
      (
        await db
          .collection("communityPublications")
          .findOne({ publicationId: p1.publicationId })
      ).contentHash,
      originalHash,
    );
    const attempts = await Promise.allSettled([
      alice.save({
        ...input,
        name: "Concurrent A",
        sharingAllowed: true,
        expectedRevision: project.saveRevision,
      }),
      alice.save({
        ...input,
        name: "Concurrent B",
        sharingAllowed: true,
        expectedRevision: project.saveRevision,
      }),
    ]);
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      attempts.find((r) => r.status === "rejected").reason.code,
      "revision_conflict",
    );
    let composition = await alice.save({
      ...input,
      projectId: "assembly",
      projectType: "composition",
      name: "Area assembly",
      payload: recipe,
      sharingAllowed: true,
      idempotencyKey: "assembly-create",
    });
    const cp = await alice.publish(
      client,
      "assembly",
      "composition",
      {
        ...candidate,
        name: "Area assembly",
        expectedRevision: composition.saveRevision,
        idempotencyKey: "assembly-publish",
      },
      "Alice",
    );
    assert.equal(cp.projectType, "composition");
    assert.deepEqual(cp.payload.dependencies, recipe.dependencies);
    composition = await alice.save({
      ...input,
      projectId: "assembly",
      projectType: "composition",
      name: "Area assembly revised",
      payload: recipe,
      expectedRevision: composition.saveRevision,
    });
    assert.equal(composition.saveRevision, 2);
    assert.equal((await community.get(cp.publicationId)).name, "Area assembly");
    const page = await alice.list({ limit: 1 });
    assert.equal(page.entries.length, 1);
    assert.ok(page.nextCursor);
    assert.ok(!("payload" in page.entries[0]));
    const next = await alice.list({ limit: 1, cursor: page.nextCursor });
    assert.notEqual(next.entries[0].projectId, page.entries[0].projectId);
    assert.equal(
      (await alice.list({ query: ".*" })).entries.length,
      0,
      "search is literal",
    );
    const legacyDoc = structuredClone(document);
    legacyDoc.lesson.title = legacyDoc.authored.lesson.title = "Legacy name";
    await db.collection("simulations").insertMany([
      {
        ownerId: "legacy",
        experimentId: "old-1",
        document: legacyDoc,
        revision: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ownerId: "legacy",
        experimentId: "old-2",
        document: legacyDoc,
        revision: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { ownerId: "legacy", experimentId: "invalid", document: {}, revision: 1 },
    ]);
    await Promise.all([migrateOwner(db, "legacy"), migrateOwner(db, "legacy")]);
    await migrateOwner(db, "legacy");
    const legacy = new ProjectRepository(db, "legacy");
    assert.equal((await legacy.list()).entries.length, 2);
    assert.equal((await legacy.get("old-1")).saveRevision, 3);
    assert.equal(
      await db.collection("simulations").countDocuments({ ownerId: "legacy" }),
      3,
      "legacy originals retained",
    );
    assert.equal(
      await db
        .collection("projectMigrationReceipts")
        .countDocuments({ status: "quarantined" }),
      1,
    );
    assert.equal((await legacy.recovery()).length, 1);
    const old = await legacy.get("old-1");
    await legacy.delete(old.projectId, "experiment", old.saveRevision);
    await migrateOwner(db, "legacy");
    await assert.rejects(legacy.get("old-1"), (e) => e.status === 404);
    await alice.delete(
      "lab-1",
      "experiment",
      (await alice.get("lab-1")).saveRevision,
    );
    assert.equal(
      (await community.get(p2.publicationId)).publicationId,
      p2.publicationId,
    );
    console.log(
      "Project storage: names, ownership, migration, pagination, save races, immutable publication/version transactions, retries, withdrawal, attribution boundaries, and composition portability passed.",
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
