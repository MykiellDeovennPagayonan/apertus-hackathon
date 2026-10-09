"use client";

import { useContext } from "react";
import type { SessionProjection } from "../../../runtime/agents/providers";
import type { DocumentRuntime } from "../../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../../runtime/authoring/types";
import type { AgentConfiguration } from "../../traits/AIAgent";
import { SnapshotContext } from "../recipe/contexts";
import "./agents.css";

export function useAgentValue(
  node: ComponentInstance,
  runtime: DocumentRuntime,
) {
  const snapshot = useContext(SnapshotContext);
  const connection = runtime.document.connections.find(
    (link) =>
      link.kind === "value" &&
      link.to.node === node.id &&
      link.to.port === "value",
  );
  return connection
    ? snapshot.outputs[connection.from.node]?.[connection.from.port]
    : undefined;
}

export function AgentProfileView({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const value = useAgentValue(node, runtime) as AgentConfiguration | undefined;
  if (!value)
    return (
      <p className="agent-empty">Connect an AI agent to show its profile.</p>
    );
  return (
    <section className="agent-profile" aria-label={value.name}>
      <span className="agent-eyebrow">Participant</span>
      <h3>{value.name}</h3>
      <p>{value.persona}</p>
      <details>
        <summary>Objective and expertise</summary>
        <p>{value.objective}</p>
        <p>
          <strong>Expertise:</strong> {value.expertise}
        </p>
      </details>
    </section>
  );
}

export function AgentTranscriptView({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const session = useAgentValue(node, runtime) as SessionProjection | undefined;
  if (!session)
    return (
      <p className="agent-empty">
        Connect an agent environment to show its conversation.
      </p>
    );
  const events = session.view?.events ?? [];
  return (
    <section
      className="agent-conversation"
      aria-label={String(node.configuration.label)}
    >
      <span className="agent-eyebrow">Explore a conversation</span>
      <h2>{session.topic}</h2>
      <p className="agent-caption">
        How do different perspectives shape a shared idea?
      </p>
      {events.length ? (
        <ol className="agent-messages">
          {events.map((event) => (
            <li
              key={event.id}
              id={`agent-message-${node.id}-${event.sequence}`}
            >
              <div className="agent-message-heading">
                <strong>{event.name}</strong>
                <span>Response {event.sequence}</span>
              </div>
              <p>{event.text}</p>
              {event.references.length > 0 && (
                <nav aria-label={`References from response ${event.sequence}`}>
                  {event.references.map((reference) => {
                    const earlier = events.find(
                      (message) => message.id === reference,
                    );
                    return earlier ? (
                      <a
                        key={reference}
                        href={`#agent-message-${node.id}-${earlier.sequence}`}
                      >
                        Responds to {earlier.name} · {earlier.sequence}
                      </a>
                    ) : null;
                  })}
                </nav>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="agent-empty">
          <p>The conversation will appear here.</p>
          <p>
            Choose <strong>Next response</strong> to hear the first perspective.
          </p>
        </div>
      )}
      <p className="agent-caption">
        AI-generated perspectives; factual claims are not verified.
      </p>
      {session.view && (
        <details className="agent-run-details">
          <summary>Run information</summary>
          <p>
            {session.view.model.provider} · {session.view.model.model}
          </p>
          <p>
            Accepted responses: {session.view.count}. Input tokens:{" "}
            {session.view.usage?.inputTokens ?? "unknown"}; output tokens:{" "}
            {session.view.usage?.outputTokens ?? "unknown"}.
          </p>
          <p>
            {session.persistence === "database"
              ? "Accepted responses are stored with your account."
              : "Guest run: available for one hour without activity, or until the server restarts."}
          </p>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      schemaVersion: 1,
                      topic: session.topic,
                      agents: session.agents,
                      run: session.view,
                    },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );
              const url = URL.createObjectURL(blob),
                link = document.createElement("a");
              link.href = url;
              link.download = "agent-conversation.json";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download conversation
          </button>
        </details>
      )}
    </section>
  );
}
