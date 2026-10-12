import { readDecisionConfig } from "../decisions/config";
import { createDecisionProvider } from "../decisions/factory";
import { type LlmConfig, readLlmConfig } from "../llm/config";
import { compositionDeadlineMs } from "./compositionPolicy";
import type { ConstructionPublisher } from "./constructionPublisher";
import { PlannerError } from "./errors";
import { readSelectionPolicy } from "./selection/policy";
import type { DecisionSelectionDependencies } from "./selection/selectCapability";
export type TraceSink = (event: string, data: unknown) => void;
export class GenerationBudget {
  private configuration?: LlmConfig;
  /** A generation keeps one provider/model even if process configuration changes. */
  get llmConfig(): LlmConfig {
    this.configuration ??= readLlmConfig();
    return this.configuration;
  }
  construction?: ConstructionPublisher;
  calls = 0;
  repairs = 0;
  turns = 0;
  decisionCalls = 0;
  maxDecisionCalls = 1;
  private decisionDependencies?: DecisionSelectionDependencies;
  get decision(): DecisionSelectionDependencies {
    if (!this.decisionDependencies) {
      const config = readDecisionConfig();
      this.decisionDependencies = {
        provider: createDecisionProvider(config),
        policy: readSelectionPolicy(config.provider),
      };
    }
    return this.decisionDependencies;
  }
  consumeDecisionCall() {
    this.check();
    if (this.decisionCalls >= this.maxDecisionCalls)
      throw new PlannerError("Decision selection budget exhausted", 502);
    this.decisionCalls++;
  }
  broaderSearches = 0;
  maxCalls = 6;
  maxRepairs = 3;
  maxTurns = 10;
  readonly signal: AbortSignal;
  private readonly deadline: AbortSignal;
  constructor(
    private readonly external?: AbortSignal,
    readonly trace?: TraceSink,
  ) {
    const timeout = compositionDeadlineMs();
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 600000)
      throw new PlannerError("Invalid PLANNER_TIMEOUT_MS.", 503);
    this.deadline = AbortSignal.timeout(timeout);
    this.signal = external
      ? AbortSignal.any([external, this.deadline])
      : this.deadline;
  }
  enableCompositionMode() {
    this.maxCalls =
      process.env.COMPOSITION_DECISION_POLICY === "required-laya" ? 28 : 14;
    this.maxRepairs = 3;
    this.maxTurns =
      process.env.COMPOSITION_DECISION_POLICY === "required-laya" ? 24 : 10;
  }
  beginTurn() {
    this.check();
    if (this.turns >= this.maxTurns)
      throw new PlannerError("Composition turn budget exhausted", 502);
    this.turns++;
  }
  check() {
    if (this.external?.aborted)
      throw new PlannerError("Planner request cancelled.", 499);
    if (this.deadline.aborted)
      throw new PlannerError("Planner timed out. Please try again.", 504);
  }
  consumeCall(repair = false, isTurn = false) {
    this.check();
    if (
      this.calls >= this.maxCalls ||
      (repair && this.repairs >= this.maxRepairs) ||
      (isTurn && this.turns >= this.maxTurns)
    )
      throw new PlannerError("The request exceeded its inference budget.", 502);
    this.calls++;
    if (repair) this.repairs++;
    if (isTurn) this.turns++;
    this.trace?.("budget", {
      calls: this.calls,
      repairs: this.repairs,
      turns: this.turns,
      decisionCalls: this.decisionCalls,
    });
  }
}
