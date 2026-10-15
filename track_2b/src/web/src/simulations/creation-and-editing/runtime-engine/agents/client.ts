import type { Snapshot } from "../DocumentRuntime";
import type { AuthoredDocument } from "../../authoring-engine/document";
import type { AgentRunView } from "./contracts";
import { browserHandleStore, type RunHandleStore } from "./handleStore";
import { type SessionProjection, sessionProjection } from "./providers";

export type AgentTransport = (
  body: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<{
  handle?: SessionProjection["handle"];
  run?: AgentRunView;
  error?: string;
  persistence?: "process" | "database";
}>;
export const httpAgentTransport: AgentTransport = async (body, signal) => {
  const response = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const result = await response.json();
  if (!result || typeof result !== "object")
    throw new Error("Agent service returned an invalid response.");
  if (!response.ok && !result.run)
    throw new Error(result.error || "Agent service unavailable.");
  return result;
};

/** Effects start only after validated commands; renderer subscriptions never invoke inference. */
export class AgentEffects {
  private work = new Map<
    string,
    {
      generation: string;
      controller: AbortController;
      handle: SessionProjection["handle"];
    }
  >();
  private processed = new Map<
    string,
    { generation: string; request: number }
  >();
  private disposed = false;
  constructor(
    private read: () => Snapshot,
    private document: () => AuthoredDocument,
    private publish: (
      node: string,
      generation: string,
      patch: Partial<SessionProjection>,
    ) => void,
    private transport: AgentTransport = httpAgentTransport,
    private handles: RunHandleStore = browserHandleStore,
  ) {}
  reconcile() {
    if (this.disposed) return;
    const nodes = this.document().nodes.filter((node) =>
      ["models/AgentSession", "models/DebateSession"].includes(node.definition),
    );
    for (const [id, work] of this.work) {
      const state = this.read().state[id];
      if (
        !nodes.some((node) => node.id === id) ||
        !state ||
        state.generation !== work.generation
      ) {
        work.controller.abort();
        this.work.delete(id);
        if (work.handle)
          void this.transport(
            { operation: "cancel", handle: work.handle },
            new AbortController().signal,
          ).catch(() => {});
      }
    }
    for (const node of nodes) {
      const state = sessionProjection(this.read().state[node.id]);
      const last = this.processed.get(node.id);
      if (
        state.cancelled ||
        state.recording ||
        !state.request ||
        state.busy ||
        this.work.has(node.id) ||
        (last?.generation === state.generation && last.request >= state.request)
      )
        continue;
      this.processed.set(node.id, {
        generation: state.generation,
        request: state.request,
      });
      const controller = new AbortController();
      this.work.set(node.id, {
        generation: state.generation,
        controller,
        handle: state.handle,
      });
      this.publish(node.id, state.generation, { busy: true, error: "" });
      void this.execute(node.id, structuredClone(state), controller);
    }
  }
  private async execute(
    node: string,
    initial: SessionProjection,
    controller: AbortController,
  ) {
    const patch = (value: Partial<SessionProjection>) => {
      if (!controller.signal.aborted && !this.disposed)
        this.publish(node, initial.generation, value);
    };
    const cacheKey = JSON.stringify({
      node,
      agents: initial.agents,
      topic: initial.topic,
      maxSteps: initial.maxSteps,
      maxWords: initial.maxWords,
      scenario: initial.scenario,
    });
    let handle = initial.handle;
    try {
      let view = initial.view;
      if (initial.resuming) {
        handle = this.handles.read(cacheKey);
        if (!handle)
          throw new Error(
            "No saved run is available for this setup in this browser tab.",
          );
        const result = await this.transport(
          { operation: "read", handle },
          controller.signal,
        );
        if (!result.run)
          throw new Error(result.error || "Saved run unavailable.");
        patch({
          handle,
          view: result.run,
          busy: false,
          playing: false,
          resuming: false,
          persistence: handle.token ? "process" : "database",
        });
        return;
      }
      if (!handle) {
        const result = await this.transport(
          {
            operation: "create",
            configuration: {
              schemaVersion: 1,
              ...(initial.scenario ? { scenario: initial.scenario } : {}),
              agents: initial.agents,
              environment: initial.topic,
              maxSteps: initial.maxSteps,
              maxWords: initial.maxWords,
              capabilities: ["speak"],
            },
          },
          controller.signal,
        );
        if (!result.handle || !result.run)
          throw new Error("Could not create this run.");
        handle = result.handle;
        this.handles.write(cacheKey, handle);
        const work = this.work.get(node);
        if (work?.controller === controller) work.handle = handle;
        view = result.run;
        patch({ handle, view, persistence: result.persistence ?? "process" });
      }
      if (!view) throw new Error("Run snapshot unavailable.");
      if (controller.signal.aborted) return;
      const result = await this.transport(
        { operation: "step", handle, expectedRevision: view.revision },
        controller.signal,
      );
      if (!result.run)
        throw new Error(result.error || "No response was accepted.");
      const current = this.read().state[node];
      const playing =
        current &&
        current.generation === initial.generation &&
        Boolean(current.playing) &&
        result.run.status === "ready" &&
        !result.error;
      patch({
        view: result.run,
        busy: false,
        error: result.error ?? "",
        playing: Boolean(playing),
        ...(playing ? { request: Number(current.request) + 1 } : {}),
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        // Refresh after uncertain transport failure so a completed server action cannot be duplicated by retry.
        let view: AgentRunView | undefined;
        if (handle)
          try {
            view = (
              await this.transport(
                { operation: "read", handle },
                controller.signal,
              )
            ).run;
          } catch {
            /* Keep accepted local history. */
          }
        patch({
          busy: false,
          resuming: false,
          playing: false,
          error:
            view && view.count > (initial.view?.count ?? 0)
              ? ""
              : error instanceof Error
                ? error.message
                : "Agent unavailable.",
          ...(view ? { view } : {}),
        });
      }
    } finally {
      if (this.work.get(node)?.controller === controller)
        this.work.delete(node);
      if (!this.disposed) queueMicrotask(() => this.reconcile());
    }
  }
  dispose() {
    this.disposed = true;
    for (const work of this.work.values()) {
      work.controller.abort();
      if (work.handle)
        void this.transport(
          { operation: "cancel", handle: work.handle },
          new AbortController().signal,
        ).catch(() => {});
    }
    this.work.clear();
  }
  activate() {
    this.disposed = false;
  }
}
