// Operational tool for trusted maintainers with database credentials. Does not edit snapshot content.
const { MongoClient } = require("mongodb");
async function main() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME)
    throw new Error("Set server-only MongoDB configuration.");
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const index = process.argv.indexOf("--withdraw");
    if (index >= 0) {
      const id = process.argv[index + 1];
      if (!id || !/^[a-f0-9]{64}$/.test(id))
        throw new Error("Supply the exact publication ID.");
      const result = await db
        .collection("communityPublications")
        .updateOne(
          { publicationId: id },
          { $set: { visibility: "withdrawn" } },
        );
      if (!result.matchedCount) throw new Error("Publication not found.");
      await db.collection("communityReports").updateMany(
        { publicationId: id },
        {
          $set: {
            status: "resolved",
            resolution: "withdrawn",
            resolvedAt: new Date(),
          },
        },
      );
      console.log("Publication withdrawn; immutable snapshot preserved.");
    } else
      for (const report of await db
        .collection("communityReports")
        .find({ status: "open" })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray())
        console.log(
          JSON.stringify({
            publicationId: report.publicationId,
            reason: report.reason,
            updatedAt: report.updatedAt,
          }),
        );
  } finally {
    await client.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
