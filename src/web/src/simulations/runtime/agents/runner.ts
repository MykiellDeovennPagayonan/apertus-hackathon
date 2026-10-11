import {
  applyAgentProposal,
  observeAgent,
  validateRunConfiguration,
} from "../../components/systems/AgentSystems";
import {
  AgentError,
  type AgentModel,
  AgentModelError,
  type AgentRun,
  type AgentRunConfiguration,
  type AttemptMetadata,
  type EnvironmentAdapter,
  type ModelIdentity,
  type RunRepository,
} from "./contracts";

export const defaultEnvironment: EnvironmentAdapter = {
  observe: observeAgent,
  apply: applyAgentProposal,
};
export interface AgentExecutionPolicy {
  selectActor(run: AgentRun): string;
  completed(run: AgentRun): boolean;
}
export const sequentialPolicy: AgentExecutionPolicy = {
  selectActor: (run) =>
    run.configuration.agents[
      run.events.length % run.configuration.agents.length
    ].id,
  completed: (run) => run.events.length >= run.configuration.maxSteps,
};
export function createAgentRun(
  id: string,
  owner: string,
  configuration: AgentRunConfiguration,
  model: ModelIdentity,
  now = Date.now(),
): AgentRun {
  validateRunConfiguration(configuration);
  return {
    schemaVersion: 1,
    nextActor: configuration.agents[0].id,
    id,
    owner,
    revision: 0,
    fence: 0,
    configuration: structuredClone(configuration),
    status: "ready",
    events: [],
    memories: Object.fromEntries(
      configuration.agents.map((agent) => [
        agent.id,
        { notes: "", sources: [] },
      ]),
    ),
    plans: Object.fromEntries(
      configuration.agents.map((agent) => [
        agent.id,
        { steps: [], completed: 0 },
      ]),
    ),
    metrics: {},
    pending: null,
    attempts: 0,
    error: "",
    model,
    receipts: {},
    attemptReceipts: {},
    updatedAt: now,
  };
}

/** Repository supplies atomic compare-and-swap; inference never runs in its transaction. */
export class AgentRunner {
  constructor(
    private repository: RunRepository,
    private model?: AgentModel,
    private environment: EnvironmentAdapter = defaultEnvironment,
    private now = Date.now,
    private policy: AgentExecutionPolicy = sequentialPolicy,
  ) {}

  async step(
    id: string,
    owner: string,
    expectedRevision: number,
    signal: AbortSignal,
  ): Promise<AgentRun> {
    if (signal.aborted) throw new AgentError("Request cancelled.", 499);
    if (!this.model) throw new AgentError("No model adapter configured.", 503);
    const run = await this.repository.read(id, owner);
    if (run.revision !== expectedRevision)
      throw new AgentError("This run changed. Refresh before continuing.", 409);
    if (run.status === "completed" || run.status === "cancelled")
      throw new AgentError("This run has ended.", 409);
    if (run.events.length >= run.configuration.maxSteps)
      throw new AgentError("The run's action budget is exhausted.", 429);
    if (run.pending && run.pending.expiresAt > this.now())
      throw new AgentError("An agent is already working.", 409);
    if (run.attempts >= run.configuration.maxSteps * 3)
      throw new AgentError("The run's attempt budget is exhausted.", 429);
    const actor = run.configuration.agents.find(
      (agent) => agent.id === this.policy.selectActor(run),
    );
    if (!actor)
      throw new AgentError("Execution policy selected an unavailable agent.");
    const reserved = structuredClone(run);
    reserved.attemptReceipts ??= {};
    for (const receipt of Object.values(reserved.attemptReceipts))
      if (receipt.outcome === "working") receipt.outcome = "expired";
    reserved.nextActor = actor.id;
    reserved.pending = {
      id: `${run.id}:${run.events.length + 1}`,
      actor: actor.id,
      fence: run.fence + 1,
      expiresAt: this.now() + 125000,
    };
    reserved.fence++;
    reserved.revision++;
    reserved.attempts++;
    const attemptId = `${run.id}:attempt:${reserved.attempts}`;
    reserved.attemptReceipts[attemptId] = {
      workId: reserved.pending.id,
      actor: actor.id,
      fence: reserved.pending.fence,
      outcome: "working",
      model: run.model,
      elapsedMs: 0,
      inputTokens: null,
      outputTokens: null,
    };
    reserved.status = "working";
    reserved.error = "";
    reserved.updatedAt = this.now();
    await this.repository.replace(reserved, run.revision);
    const reservation = reserved.pending;
    const combined = AbortSignal.any([signal, AbortSignal.timeout(120000)]);
    const started = this.now();
    let metadata: AttemptMetadata | undefined;
    try {
      const observation = this.environment.observe(reserved, actor);
      const result = await this.model.generate(observation, combined);
      metadata = result.metadata;
      if (combined.aborted)
        throw new AgentError("Agent request cancelled.", 499);
      const current = await this.repository.read(id, owner);
      if (combined.aborted)
        throw new AgentError("Agent request cancelled.", 499);
      if (
        current.revision !== reserved.revision ||
        current.pending?.fence !== reservation.fence ||
        current.pending.id !== reservation.id ||
        current.pending.expiresAt <= this.now()
      )
        throw new AgentError(
          "The agent result is stale and was not accepted.",
          409,
        );
      const next = this.environment.apply(
        current,
        actor,
        result.proposal,
        reservation.id,
      );
      next.status =
        next.events.length >= next.configuration.maxSteps ||
        this.policy.completed(next)
          ? "completed"
          : "ready";
      if (next.status !== "completed") {
        next.nextActor = this.policy.selectActor(next);
        if (
          !next.configuration.agents.some(
            (agent) => agent.id === next.nextActor,
          )
        )
          throw new AgentError(
            "Execution policy selected an unavailable next agent.",
          );
      }
      next.receipts[reservation.id] = result.metadata;
      next.attemptReceipts = {
        ...current.attemptReceipts,
        [attemptId]: {
          ...reserved.attemptReceipts[attemptId],
          ...metadata,
          outcome: "accepted",
        },
      };
      next.revision++;
      next.updatedAt = this.now();
      await this.repository.replace(next, current.revision);
      return next;
    } catch (error) {
      const current = await this.repository.read(id, owner);
      if (
        current.revision === reserved.revision &&
        current.pending?.fence === reservation.fence
      ) {
        const failed = structuredClone(current);
        failed.status = "failed";
        failed.pending = null;
        failed.revision++;
        failed.updatedAt = this.now();
        failed.error =
          error instanceof AgentError
            ? error.message
            : "The agent could not respond. Try this step again.";
        failed.attemptReceipts = {
          ...current.attemptReceipts,
          [attemptId]: {
            ...reserved.attemptReceipts[attemptId],
            ...(metadata ??
              (error instanceof AgentModelError
                ? error.metadata
                : {
                    model: run.model,
                    elapsedMs: Math.max(0, this.now() - started),
                    inputTokens: null,
                    outputTokens: null,
                  })),
            outcome: combined.aborted ? "cancelled" : "failed",
          },
        };
        await this.repository.replace(failed, current.revision);
      }
      throw error;
    }
  }
  async cancel(id: string, owner: string): Promise<AgentRun> {
    const run = await this.repository.read(id, owner);
    const next = structuredClone(run);
    next.status = "cancelled";
    next.pending = null;
    for (const receipt of Object.values(next.attemptReceipts ?? {}))
      if (receipt.outcome === "working") receipt.outcome = "cancelled";
    next.fence++;
    next.revision++;
    next.updatedAt = this.now();
    await this.repository.replace(next, run.revision);
    return next;
  }
}
