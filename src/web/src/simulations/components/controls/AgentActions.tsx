"use client";

import { useState } from "react";
import type { SessionProjection } from "../../runtime/agents/providers";
import type { DocumentRuntime } from "../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../runtime/authoring/types";
import { useAgentValue } from "../views/agents/AgentViews";

export function AgentActions({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const session = useAgentValue(node, runtime) as SessionProjection | undefined;
  const [error, setError] = useState("");
  const run = (command: string) => {
    const connections = runtime.document.connections.filter(
      (link) =>
        link.kind === "command" &&
        link.from.node === node.id &&
        link.from.port === command,
    );
    if (!connections.length) {
      setError("Connect this action to the agent environment.");
      return;
    }
    const result = runtime.dispatch(
      connections.map((link) => ({
        node: link.to.node,
        command: link.to.port,
        arguments: {},
      })),
    );
    setError(result.accepted ? "" : result.error);
  };
  const ended =
    session?.cancelled ||
    session?.view?.status === "completed" ||
    session?.view?.status === "cancelled";
  return (
    <section
      className="agent-actions"
      aria-label={String(node.configuration.label)}
    >
      <div className="agent-action-row">
        <button
          type="button"
          className="agent-primary"
          disabled={!session || session.busy || ended}
          onClick={() => run("NEXT")}
        >
          {session?.error || session?.view?.status === "failed"
            ? "Retry response"
            : session?.recording
              ? "Next recorded response"
              : "Next response"}
        </button>
        {session?.playing ? (
          <button type="button" onClick={() => run("PAUSE")}>
            Pause after response
          </button>
        ) : (
          <button
            type="button"
            disabled={!session || session.busy || ended}
            onClick={() => run("PLAY")}
          >
            {session?.recording
              ? "Show all recorded responses"
              : "Continue automatically"}
          </button>
        )}
        {session?.busy && (
          <button type="button" onClick={() => run("CANCEL")}>
            Cancel response
          </button>
        )}
        <button type="button" disabled={!session} onClick={() => run("RESET")}>
          Restart conversation
        </button>
        {!!session?.view?.events.length && (
          <button
            type="button"
            disabled={session.busy}
            onClick={() => run("REPLAY")}
          >
            Replay conversation
          </button>
        )}
      </div>
      <output className="agent-progress" aria-live="polite">
        {session?.busy
          ? `${session.view?.nextActor ?? session.agents[0]?.name ?? "Agent"} is responding…`
          : ended
            ? "Conversation complete. Restart to explore another run."
            : session?.view
              ? `Next: ${session.view.nextActor}`
              : "Ready to begin"}{" "}
        {session?.view
          ? `· ${session.view.count} of ${session.view.maxSteps} ${session.recording ? "recorded " : ""}responses`
          : ""}
      </output>
      {(error || session?.error) && (
        <p className="agent-error" role="alert">
          {error || session?.error}
        </p>
      )}
    </section>
  );
}
