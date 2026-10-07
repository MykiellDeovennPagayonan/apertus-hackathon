import { PlannerError } from "./errors";
export type TraceSink = (event: string, data: unknown) => void;
export class GenerationBudget {
  calls = 0;
  repairs = 0;
  turns = 0;
  layaCalls = 0;
  broaderSearches = 0;
  maxCalls = 6;
  maxRepairs = 2;
  maxTurns = 10;
  readonly signal: AbortSignal;
  private readonly deadline: AbortSignal;
  constructor(
    private readonly external?: AbortSignal,
    readonly trace?: TraceSink,
  ) {
    const timeout = Number(process.env.PLANNER_TIMEOUT_MS ?? 120000);
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 600000)
      throw new PlannerError("Invalid PLANNER_TIMEOUT_MS.", 503);
    this.deadline = AbortSignal.timeout(timeout);
    this.signal = external
      ? AbortSignal.any([external, this.deadline])
      : this.deadline;
  }
  enableCompositionMode() {
    this.maxCalls = 14;
    this.maxRepairs = 3;
    this.maxTurns = 10;
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
      layaCalls: this.layaCalls,
    });
  }
}
