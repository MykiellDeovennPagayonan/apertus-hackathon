// Inventory by default; --apply copies legacy content and retains all source records.
const { MongoClient } = require("mongodb");
const { load } = require("../test-loader.cjs");
const { initializeProjects } = load("src/lib/projects/schema.ts");
const { migrateOwner } = load("src/lib/projects/migration.ts");
async function main() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME)
    throw new Error(
      "Set MONGODB_URI and MONGODB_DB_NAME. Back up the database before --apply.",
    );
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const owners = new Set();
    for (const name of ["simulations", "components"]) {
      const collection = db.collection(name);
      console.log(
        `${name}: ${await collection.countDocuments({})} legacy records`,
      );
      for (const owner of await collection.distinct("ownerId"))
        owners.add(owner);
    }
    if (process.argv.includes("--apply")) {
      await initializeProjects(db);
      for (const owner of owners) await migrateOwner(db, owner);
      console.log(
        `Projects: ${await db.collection("projects").countDocuments({})}; quarantined sources: ${await db.collection("projectMigrationReceipts").countDocuments({ status: "quarantined" })}. Legacy originals retained.`,
      );
    } else
      console.log(
        `${owners.size} owners. Dry run only. Use --apply after backup; migration also runs per owner on first library access.`,
      );
  } finally {
    await client.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
