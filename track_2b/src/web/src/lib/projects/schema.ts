import { type Db, MongoServerError } from "mongodb";
export async function initializeProjects(db: Db) {
  for (const [name, required] of Object.entries({
    projects: [
      "ownerId",
      "projectId",
      "projectType",
      "name",
      "normalizedName",
      "payload",
      "saveRevision",
      "sharingAllowed",
      "createdAt",
      "updatedAt",
    ],
    communityPublications: [
      "publicationId",
      "seriesId",
      "versionNumber",
      "authorId",
      "name",
      "normalizedName",
      "payload",
      "contentHash",
      "visibility",
      "publishedAt",
      "requestHash",
    ],
    publicationSeries: [
      "seriesId",
      "authorId",
      "sourceProjectId",
      "projectType",
      "versionNumber",
    ],
  })) {
    try {
      await db.createCollection(name, {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required,
            properties: {
              projectType: { enum: ["experiment", "composition"] },
              saveRevision: { bsonType: ["int", "long", "double"], minimum: 1 },
              sharingAllowed: { bsonType: "bool" },
            },
          },
        },
        validationAction: "error",
      });
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 48)
        throw error;
    }
  }
  await db.collection("projects").createIndexes([
    {
      key: { ownerId: 1, projectType: 1, projectId: 1 },
      unique: true,
      name: "owner_project_identity",
    },
    {
      key: { ownerId: 1, projectType: 1, normalizedName: 1 },
      unique: true,
      name: "owner_project_name",
    },
    {
      key: { ownerId: 1, createKey: 1 },
      unique: true,
      partialFilterExpression: { createKey: { $type: "string" } },
      name: "owner_create_key",
    },
    {
      key: { ownerId: 1, updatedAt: -1, projectId: 1 },
      name: "owner_projects_recent",
    },
  ]);
  await db.collection("communityPublications").createIndexes([
    { key: { publicationId: 1 }, unique: true },
    { key: { seriesId: 1, versionNumber: 1 }, unique: true },
    {
      key: { authorId: 1, projectType: 1, normalizedName: 1 },
      unique: true,
      name: "author_public_name",
    },
    {
      key: {
        visibility: 1,
        projectType: 1,
        publishedAt: -1,
        publicationId: 1,
      },
    },
  ]);
  await db
    .collection("communityReports")
    .createIndex({ publicationId: 1, reporterId: 1 }, { unique: true });
  await db
    .collection("publicationSeries")
    .createIndex({ seriesId: 1 }, { unique: true });
}
