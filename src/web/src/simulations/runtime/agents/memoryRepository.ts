import { AgentError, type AgentRun, type RunRepository } from "./contracts";

/** Process-local guest mode. TTL/capacity are explicit; it is not durable storage. */
export class MemoryRunRepository implements RunRepository {
  private runs = new Map<string, AgentRun>();
  constructor(
    private limit = 200,
    private ttl = 3600000,
    private now = Date.now,
  ) {}
  async create(run: AgentRun) {
    for (const [id, item] of this.runs)
      if (item.updatedAt + this.ttl < this.now()) this.runs.delete(id);
    if (this.runs.has(run.id)) throw new AgentError("Run already exists.", 409);
    if (this.runs.size >= this.limit)
      throw new AgentError("Agent workspace is busy. Try again later.", 429);
    this.runs.set(run.id, structuredClone(run));
  }
  async read(id: string, owner: string) {
    const run = this.runs.get(id);
    if (!run || run.owner !== owner || run.updatedAt + this.ttl < this.now())
      throw new AgentError("Run unavailable or expired. Start a new run.", 404);
    return structuredClone(run);
  }
  async replace(run: AgentRun, expectedRevision: number) {
    const current = await this.read(run.id, run.owner);
    // Recheck after the await so competing writers cannot both pass.
    if (
      current.revision !== expectedRevision ||
      this.runs.get(run.id)?.revision !== expectedRevision
    )
      throw new AgentError("Another request changed this run.", 409);
    if (run.revision !== expectedRevision + 1)
      throw new AgentError("Invalid revision transition.", 409);
    this.runs.set(run.id, structuredClone(run));
  }
}
