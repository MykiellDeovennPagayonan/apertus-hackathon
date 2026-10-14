import type { Collection, Db } from "mongodb";
import {
  AgentError,
  type AgentRun,
  type RunRepository,
} from "../../simulations/creation-and-editing/runtime-engine/agents/contracts";

/** Bounded aggregate: memory, events, receipt and world state commit in one CAS write. */
export class MongoRunRepository implements RunRepository {
  private collection: Collection<AgentRun>;
  constructor(db: Db) {
    this.collection = db.collection<AgentRun>("agentRuns");
  }
  async create(run: AgentRun) {
    await this.collection.createIndex({ id: 1 }, { unique: true });
    await this.collection.createIndex({ owner: 1, updatedAt: -1 });
    this.assertBound(run);
    await this.collection.insertOne(structuredClone(run), {
      writeConcern: { w: "majority" },
    });
  }
  async read(id: string, owner: string) {
    const run = await this.collection.findOne({ id, owner });
    if (!run) throw new AgentError("Run unavailable.", 404);
    const { _id: _mongoId, ...record } = run;
    return record as AgentRun;
  }
  async replace(run: AgentRun, expectedRevision: number) {
    if (run.revision !== expectedRevision + 1)
      throw new AgentError("Invalid revision transition.", 409);
    this.assertBound(run);
    const result = await this.collection.replaceOne(
      { id: run.id, owner: run.owner, revision: expectedRevision },
      structuredClone(run),
      { writeConcern: { w: "majority" } },
    );
    if (result.matchedCount !== 1)
      throw new AgentError("Another request changed this run.", 409);
  }
  private assertBound(run: AgentRun) {
    if (Buffer.byteLength(JSON.stringify(run)) > 1000000)
      throw new AgentError("Run storage limit reached.", 413);
  }
}
