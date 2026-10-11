import { env } from "node:process";
import { type Db, MongoClient } from "mongodb";
import { offlineEnabled } from "../deployment";
import { initializeAuthIndexes, initializeLibraryCollections } from "./schema";

type DatabaseConnection = { client: MongoClient; db: Db };
declare global {
  var apertusDatabase: Promise<DatabaseConnection> | undefined;
}

/** One connection pool, retained across development module reloads. */
export function getDatabase(): Promise<DatabaseConnection> {
  if (offlineEnabled())
    throw new Error("Database access is disabled in offline mode.");
  if (!globalThis.apertusDatabase) {
    const uri = env.MONGODB_URI?.trim();
    const name = env.MONGODB_DB_NAME?.trim();
    if (!uri || !name) throw new Error("MongoDB configuration is missing.");
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    globalThis.apertusDatabase = (async () => {
      try {
        await client.connect();
        const db = client.db(name);
        await initializeLibraryCollections(db);
        await initializeAuthIndexes(db);
        return { client, db };
      } catch (error) {
        globalThis.apertusDatabase = undefined;
        await client.close();
        throw error;
      }
    })();
  }
  return globalThis.apertusDatabase;
}
