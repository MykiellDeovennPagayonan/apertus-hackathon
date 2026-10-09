import { AgentError } from "./contracts";

type Job = {
  id: string;
  signal: AbortSignal;
  start: () => void;
  reject: (error: Error) => void;
  abort: () => void;
};

/** FIFO admission with bounded waiting, deduplication and cancellation before execution. */
export class AgentWorkQueue {
  private active = 0;
  private waiting: Job[] = [];
  private identities = new Set<string>();
  constructor(
    private concurrency = 1,
    private capacity = 16,
  ) {
    if (
      !Number.isInteger(concurrency) ||
      concurrency < 1 ||
      !Number.isInteger(capacity) ||
      capacity < 0
    )
      throw new AgentError("Invalid scheduler limits.");
  }
  submit<T>(
    id: string,
    signal: AbortSignal,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (signal.aborted)
      return Promise.reject(new AgentError("Request cancelled.", 499));
    if (this.identities.has(id))
      return Promise.reject(
        new AgentError("This work is already scheduled.", 409),
      );
    if (this.active >= this.concurrency && this.waiting.length >= this.capacity)
      return Promise.reject(
        new AgentError("Agent queue is full. Try again shortly.", 429),
      );
    this.identities.add(id);
    return new Promise<T>((resolve, reject) => {
      const job: Job = { id, signal, reject, abort: () => {}, start: () => {} };
      job.abort = () => {
        const index = this.waiting.indexOf(job);
        if (index < 0) return;
        this.waiting.splice(index, 1);
        this.identities.delete(id);
        signal.removeEventListener("abort", job.abort);
        reject(new AgentError("Queued request cancelled.", 499));
      };
      job.start = () => {
        signal.removeEventListener("abort", job.abort);
        this.active++;
        Promise.resolve()
          .then(operation)
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            this.identities.delete(id);
            this.drain();
          });
      };
      signal.addEventListener("abort", job.abort, { once: true });
      this.waiting.push(job);
      this.drain();
    });
  }
  private drain() {
    while (this.active < this.concurrency && this.waiting.length) {
      const job = this.waiting.shift();
      if (job) job.start();
    }
  }
}
