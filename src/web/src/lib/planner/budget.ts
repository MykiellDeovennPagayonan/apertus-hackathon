import { PlannerError } from "./errors";
export type TraceSink = (event: string, data: unknown) => void;
export class GenerationBudget {
  calls = 0;
  repairs = 0;
  layaCalls = 0;
  broaderSearches = 0;
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
  check() {
    if (this.external?.aborted)
      throw new PlannerError("Planner request cancelled.", 499);
    if (this.deadline.aborted)
      throw new PlannerError("Planner timed out. Please try again.", 504);
  }
  consumeCall(repair = false) {
    this.check();
    if (this.calls >= 6 || (repair && this.repairs >= 2))
      throw new PlannerError("The request exceeded its inference budget.", 502);
    this.calls++;
    if (repair) this.repairs++;
    this.trace?.("budget", {
      calls: this.calls,
      repairs: this.repairs,
      layaCalls: this.layaCalls,
    });
  }
}
