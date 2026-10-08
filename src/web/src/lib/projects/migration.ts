import { randomUUID } from "node:crypto";
import { type Db, MongoServerError } from "mongodb";
import { hash, ProjectRepository } from "./Repository";
import { type Project, ProjectError } from "./types";
import { nameFields } from "./validation";
/** Non-destructive, owner-scoped migration. Legacy sources stay available for rollback/export. */
export async function migrateOwner(db: Db, ownerId: string) {
  const receipts = db.collection<{
    _id: string;
    ownerId: string;
    status: string;
    leaseUntil?: Date;
    leaseToken?: string;
    [key: string]: unknown;
  }>("projectMigrationReceipts");
  const marker = `owner:${ownerId}`,
    leaseToken = randomUUID();
  let claimed = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    const state = await receipts.findOne({ _id: marker });
    if (state?.status === "complete") return;
    if (!state) {
      try {
        await receipts.insertOne({
          _id: marker,
          ownerId,
          status: "running",
          leaseToken,
          leaseUntil: new Date(Date.now() + 120000),
        });
        claimed = true;
        break;
      } catch (error) {
        if (!(error instanceof MongoServerError) || error.code !== 11000)
          throw error;
      }
    } else if (!state.leaseUntil || state.leaseUntil.getTime() < Date.now()) {
      const result = await receipts.updateOne(
        { _id: marker, leaseToken: state.leaseToken },
        {
          $set: {
            status: "running",
            leaseToken,
            leaseUntil: new Date(Date.now() + 120000),
          },
        },
      );
      if (result.modifiedCount) {
        claimed = true;
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!claimed)
    throw new ProjectError(
      "Your existing library is being migrated. Try again shortly.",
      503,
      "migration_busy",
    );
  try {
    const repository = new ProjectRepository(db, ownerId);
    for (const [collection, type] of [
      ["simulations", "experiment"],
      ["components", "composition"],
    ] as const) {
      for await (const row of db
        .collection(collection)
        .find({ ownerId })
        .sort({ createdAt: 1, _id: 1 })) {
        const heartbeat = await receipts.updateOne(
          { _id: marker, leaseToken, status: "running" },
          { $set: { leaseUntil: new Date(Date.now() + 120000) } },
        );
        if (!heartbeat.matchedCount)
          throw new ProjectError(
            "Migration lease changed. Try again.",
            503,
            "migration_busy",
          );
        const id = type === "experiment" ? row.experimentId : row.recipe?.id;
        const receiptId = hash([collection, ownerId, String(row._id)]);
        if (await receipts.findOne({ _id: receiptId })) continue;
        try {
          let existing: Project | undefined;
          try {
            existing = await repository.get(id, type);
          } catch {
            /* not migrated */
          }
          if (!existing) {
            const originalName =
              type === "experiment"
                ? row.document?.lesson?.title
                : row.recipe?.title;
            let name: string;
            try {
              name = nameFields(originalName).name;
            } catch {
              name =
                type === "experiment"
                  ? "Untitled experiment"
                  : "Untitled composition";
            }
            const original = name;
            let saved: Project | undefined;
            for (let suffix = 1; suffix <= 10000; suffix++) {
              try {
                saved = await repository.save({
                  projectId: id,
                  projectType: type,
                  name,
                  description:
                    type === "composition" ? row.recipe.description : "",
                  tags: type === "composition" ? row.recipe.tags : [],
                  payload: type === "experiment" ? row.document : row.recipe,
                  sharingAllowed: false,
                  expectedRevision: null,
                });
                break;
              } catch (error) {
                if (
                  error &&
                  typeof error === "object" &&
                  "code" in error &&
                  error.code === "identity_conflict"
                ) {
                  saved = await repository.get(id, type);
                  break;
                }
                if (
                  !(
                    error &&
                    typeof error === "object" &&
                    "code" in error &&
                    error.code === "name_conflict"
                  )
                )
                  throw error;
                name = `${Array.from(original).slice(0, 80).join("")} (imported ${suffix + 1})`;
              }
            }
            if (!saved)
              throw new Error("Migration could not allocate a unique name.");
            await db.collection("projects").updateOne(
              { ownerId, projectId: id, projectType: type },
              {
                $set: {
                  saveRevision: row.revision ?? 1,
                  createdAt: row.createdAt ?? new Date(),
                  updatedAt: row.updatedAt ?? new Date(),
                  ...(row.recovery ? { recovery: row.recovery } : {}),
                },
              },
            );
          }
          await receipts.updateOne(
            { _id: receiptId },
            {
              $setOnInsert: {
                ownerId,
                collection,
                sourceId: row._id,
                sourceHash: hash(row),
                originalName:
                  type === "experiment"
                    ? row.document?.lesson?.title
                    : row.recipe?.title,
                projectId: id,
                status: "migrated",
                at: new Date(),
              },
            },
            { upsert: true },
          );
        } catch (error) {
          await receipts.updateOne(
            { _id: receiptId },
            {
              $setOnInsert: {
                ownerId,
                collection,
                sourceId: row._id,
                sourceHash: hash(row),
                status: "quarantined",
                reason:
                  error instanceof Error ? error.message : "Invalid record",
                at: new Date(),
              },
            },
            { upsert: true },
          );
        }
      }
    }
    await receipts.updateOne(
      { _id: marker, leaseToken },
      {
        $set: { status: "complete", at: new Date() },
        $unset: { leaseUntil: "" },
      },
    );
  } catch (error) {
    await receipts.updateOne(
      { _id: marker, leaseToken },
      { $set: { status: "failed", leaseUntil: new Date(0) } },
    );
    throw error;
  }
}
