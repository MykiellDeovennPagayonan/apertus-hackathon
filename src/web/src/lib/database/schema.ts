import { type Db, MongoServerError } from "mongodb";

const metadata = {
  _id: { bsonType: "objectId" },
  ownerId: { bsonType: "string", minLength: 1, maxLength: 160 },
  revision: { bsonType: ["int", "long", "double"], minimum: 1 },
  createdAt: { bsonType: "date" },
  updatedAt: { bsonType: "date" },
};

/** Library payloads retain their existing application formats and validators. */
export async function initializeLibraryCollections(db: Db) {
  const schemas = {
    simulations: {
      required: ["experimentId", "document"],
      properties: {
        experimentId: { bsonType: "string", minLength: 1, maxLength: 160 },
        document: { bsonType: "object" },
        recovery: { bsonType: "string", maxLength: 1_000_000 },
      },
    },
    components: {
      required: ["recipe"],
      properties: { recipe: { bsonType: "object" } },
    },
  };
  for (const [name, schema] of Object.entries(schemas)) {
    try {
      await db.createCollection(name, {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: [
              "ownerId",
              "revision",
              "createdAt",
              "updatedAt",
              ...schema.required,
            ],
            additionalProperties: false,
            properties: { ...metadata, ...schema.properties },
          },
        },
        validationLevel: "strict",
        validationAction: "error",
      });
    } catch (error) {
      // Initialization is safe to repeat and does not rewrite existing data.
      if (!(error instanceof MongoServerError) || error.code !== 48)
        throw error;
    }
    await db.collection(name).createIndexes([
      {
        key:
          name === "simulations"
            ? { ownerId: 1, experimentId: 1 }
            : { ownerId: 1, "recipe.id": 1 },
        unique: true,
        name: "owner_identity",
      },
      { key: { ownerId: 1, updatedAt: -1 }, name: "owner_recent" },
    ]);
  }
}

/** NextAuth owns these records; only its lookup and uniqueness indexes live here. */
export async function initializeAuthIndexes(db: Db) {
  await db
    .collection("users")
    .createIndex({ email: 1 }, { unique: true, sparse: true });
  await db
    .collection("accounts")
    .createIndex({ provider: 1, providerAccountId: 1 }, { unique: true });
  await db.collection("sessions").createIndexes([
    { key: { sessionToken: 1 }, unique: true },
    { key: { expires: 1 }, expireAfterSeconds: 0 },
  ]);
}
