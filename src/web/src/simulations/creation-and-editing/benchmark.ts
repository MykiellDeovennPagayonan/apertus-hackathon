/** Bounded counters independent of the development trace's event limit. */
export class BenchmarkMeasurements {
  private firstChecks = new Map<string, boolean>();
  private inference: {
    stage: string;
    model: string;
    elapsedMs: number;
    usage: unknown;
  }[] = [];
  private schemaRepairs = 0;
  private composerFeedback = 0;
  private deterministicRepairs = 0;
  private validationChecks = 0;
  private terminal: string | null = null;
  private elapsedMs: number | null = null;

  record(event: string, raw: unknown, elapsedMs: number) {
    const data = raw as Record<string, unknown> | null;
    if (event === "benchmark.validation" && data) {
      this.validationChecks++;
      const id = String(data.id);
      if (!this.firstChecks.has(id))
        this.firstChecks.set(id, data.passed === true);
    }
    if (event === "benchmark.repair" && data) {
      if (data.kind === "composer") this.composerFeedback++;
      if (data.kind === "schema") this.schemaRepairs++;
      if (data.kind === "deterministic") this.deterministicRepairs++;
    }
    if (event.endsWith(".inference") && data && this.inference.length < 64) {
      this.inference.push({
        stage: String(data.stage ?? "unknown"),
        model: String(data.model ?? "unknown"),
        elapsedMs: Number(data.elapsedMs),
        usage: data.usage,
      });
    }
    if ((event === "result" || event === "failure") && this.terminal === null) {
      this.terminal = event === "failure" ? "failed" : String(data?.status);
      this.elapsedMs = elapsedMs;
    }
  }

  snapshot() {
    return {
      terminal: this.terminal,
      elapsedMs: this.elapsedMs,
      validationReached: this.firstChecks.size > 0,
      firstPass:
        this.firstChecks.size && this.terminal !== null
          ? ["created", "updated"].includes(this.terminal) &&
            [...this.firstChecks.values()].every(Boolean) &&
            this.composerFeedback === 0
          : null,
      validationStages: this.firstChecks.size,
      firstValidatorOutcomes: [...this.firstChecks].map(([stage, passed]) => ({
        stage,
        passed,
      })),
      validationChecks: this.validationChecks,
      composerFeedback: this.composerFeedback,
      schemaRepairs: this.schemaRepairs,
      deterministicRepairs: this.deterministicRepairs,
      inference: this.inference,
    };
  }
}
