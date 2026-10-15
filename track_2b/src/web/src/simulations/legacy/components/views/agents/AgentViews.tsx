"use client";

import { useContext, useRef, useState } from "react";
import type { SessionProjection } from "../../../../creation-and-editing/runtime-engine/agents/providers";
import type { DocumentRuntime } from "../../../../creation-and-editing/runtime-engine/DocumentRuntime";
import type { ComponentInstance } from "../../../../creation-and-editing/authoring-engine/document";
import { debateRound } from "../../systems/debate/protocol";
import type { AgentConfiguration } from "../../traits/AIAgent";
import { SnapshotContext } from "../../../../creation-and-editing/simulation/recipe/contexts";
import { AgentAvatar, agentShortName } from "./AgentAvatar";
import "./agents.css";

export const agentDetailsDialogId = (nodeId: string) =>
  `agent-details-${nodeId}`;

export function useAgentValue(
  node: ComponentInstance,
  runtime: DocumentRuntime,
  port = "value",
) {
  const snapshot = useContext(SnapshotContext);
  const connection = runtime.document.connections.find(
    (link) =>
      link.kind === "value" &&
      link.to.node === node.id &&
      link.to.port === port,
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
  const session = useAgentValue(node, runtime, "session") as
    | SessionProjection
    | undefined;
  const dialog = useRef<HTMLDialogElement>(null);
  if (!value)
    return (
      <p className="agent-empty">Connect an AI agent to show its profile.</p>
    );
  const active =
    session?.busy &&
    (session.view?.nextActor ?? session.agents[0]?.name) === value.name;
  const role = value.name.includes(" · ")
    ? value.name
        .split(" · ")[1]
        .replace(
          /^(Careful|Pragmatic|Empathetic|Skeptical|Cautious|Curious) /,
          "",
        )
    : value.expertise;
  return (
    <section
      className={`agent-profile${active ? " is-speaking" : ""}`}
      aria-label={value.name}
    >
      <button
        className="agent-person"
        type="button"
        aria-haspopup="dialog"
        aria-label={`Meet ${value.name}`}
        onClick={() => dialog.current?.showModal()}
      >
        <AgentAvatar agent={value} />
        <span className="agent-person-name">
          {agentShortName(value)}{" "}
          <span className="agent-person-team">
            {value.team === "Proposition"
              ? "For"
              : value.team === "Opposition"
                ? "Against"
                : ""}
          </span>
        </span>
        <span className="agent-person-role">{role}</span>
        <span className="agent-person-hint">
          {active ? "Speaking…" : "Meet this speaker ↗"}
        </span>
      </button>
      <dialog
        ref={dialog}
        className="agent-person-dialog"
        aria-label={`${value.name} personality`}
      >
        <button
          type="button"
          className="agent-dialog-close"
          onClick={() => dialog.current?.close()}
          aria-label="Close personality"
        >
          ×
        </button>
        <AgentAvatar agent={value} />
        <span className="agent-eyebrow">
          {value.team ?? "City conversation"}
        </span>
        <h2>{value.name}</h2>
        <p className="agent-personality">
          {value.communicationStyle ?? value.persona}
        </p>
        <dl>
          <dt>Personality</dt>
          <dd>{value.persona}</dd>
          <dt>Expertise</dt>
          <dd>{value.expertise}</dd>
          <dt>What they bring</dt>
          <dd>{value.objective}</dd>
        </dl>
        <p className="agent-caption">
          A fictional, authored personality. Change it in the builder to explore
          a different perspective.
        </p>
      </dialog>
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
  const [selectedRun, selectRun] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const details = useRef<HTMLDialogElement>(null);
  if (!session)
    return (
      <p className="agent-empty">
        Connect an agent environment to show its conversation.
      </p>
    );
  const view =
    session.history?.find((run) => run.id === selectedRun) ?? session.view;
  const debate = !!session.scenario;
  const events = view?.events ?? [];
  const configuration = view?.configuration;
  const index = cursor
    ? events.findIndex((event) => event.id === cursor)
    : events.length - 1;
  const position = index < 0 ? events.length - 1 : index;
  const current = events[position];
  const agents = configuration?.agents ?? session.agents;
  const speaker =
    agents.find((agent) => agent.id === current?.actor) ?? agents[0];
  const seek = (id: string) => setCursor(id);
  return (
    <section
      className="agent-conversation"
      aria-label={String(node.configuration.label)}
      data-accepted-count={events.length}
      data-showing-speech={current?.sequence ?? 0}
    >
      <header className="agent-stage-heading">
        <span className="agent-eyebrow">
          {debate
            ? "Two teams. One big question."
            : "Two perspectives. One city."}
        </span>
        <h2>{configuration?.environment ?? session.topic}</h2>
      </header>
      <div className={`agent-speech-stage${current ? " has-speech" : ""}`}>
        {current ? (
          <>
            <div className="agent-speaker-line">
              {speaker && <AgentAvatar agent={speaker} />}
              <div>
                <strong>
                  {speaker ? agentShortName(speaker) : current.name}
                </strong>
                <span>
                  {debate
                    ? `${debateRound(current.sequence - 1)} · ${speaker?.team ?? ""}`
                    : current.name}
                </span>
              </div>
              <span className="agent-speech-number">
                {debate ? "Speech" : "Response"} {current.sequence}
              </span>
            </div>
            <article
              className="agent-speech-bubble"
              aria-label={`${current.name}, ${debate ? "speech" : "response"} ${current.sequence}`}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard focus enables scrolling long accepted speeches.
              tabIndex={0}
            >
              <p>{current.text}</p>
              {!!current.references.length && (
                <nav aria-label="Earlier arguments">
                  {current.references.map((id) => {
                    const earlier = events.find((event) => event.id === id);
                    return earlier ? (
                      <a
                        key={id}
                        href={`#agent-message-${node.id}-${earlier.sequence}`}
                        onClick={(event) => {
                          event.preventDefault();
                          seek(id);
                        }}
                      >
                        Responds to {earlier.name.split(" · ")[0]} ·{" "}
                        {earlier.sequence} ↗
                      </a>
                    ) : null;
                  })}
                </nav>
              )}
            </article>
          </>
        ) : (
          <div className="agent-stage-intro">
            <svg
              className="agent-conversation-art"
              viewBox="0 0 280 125"
              aria-hidden="true"
            >
              <path
                d="M16 24q0-16 16-16h126q16 0 16 16v43q0 16-16 16H63L38 103l4-20H32q-16 0-16-16Z"
                fill="#dcece4"
              />
              <path
                d="M111 59q0-12 12-12h130q12 0 12 12v36q0 12-12 12h-15l4 16-24-16h-95q-12 0-12-12Z"
                fill="#f3dfca"
              />
              <path
                d="M41 34h95M41 49h76M135 69h104M135 84h76"
                stroke="#69877d"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <circle cx="91" cy="79" r="20" fill="#fdf9ed" />
              <path
                d="M84 72q0-7 7-7t7 7v8q0 7-7 7t-7-7Zm-5 8q0 13 12 13t12-13M91 93v7m-7 0h14"
                stroke="#417b70"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <h3>
              {debate
                ? "Whose argument will change your mind?"
                : "What makes a better city?"}
            </h3>
            <p>
              {debate
                ? "Meet the speakers, then follow their arguments one speech at a time."
                : "Meet Mira and Leo, then discover how their ideas build on each other."}
            </p>
          </div>
        )}
      </div>
      {!!events.length && (
        <div className="agent-speech-navigation">
          <button
            type="button"
            disabled={position <= 0}
            onClick={() => seek(events[position - 1].id)}
          >
            ← Back
          </button>
          <span>
            {events.length
              ? `${position + 1} / ${events.length}`
              : "The conversation starts with you"}
          </span>
          <button
            type="button"
            disabled={!current || position >= events.length - 1}
            onClick={() => {
              if (position + 1 === events.length - 1) setCursor(null);
              else seek(events[position + 1].id);
            }}
          >
            Forward →
          </button>
        </div>
      )}
      <dialog
        ref={details}
        id={agentDetailsDialogId(node.id)}
        className="agent-conversation-dialog"
        aria-label="Conversation details"
      >
        <button
          type="button"
          className="agent-dialog-close"
          aria-label="Close conversation details"
          onClick={() => details.current?.close()}
        >
          ×
        </button>
        <h2>Conversation details</h2>
        <section className="agent-context-details">
          <h3>{debate ? "About this debate" : "About this conversation"}</h3>
          <p>
            {debate
              ? "Change one personality in the builder, keep the motion fixed, and compare the arguments across repeated runs."
              : "Change a personality in the builder and compare how the conversation changes."}
          </p>
          {debate && <p>{configuration?.scenario?.scope ?? session.scope}</p>}
          <p>
            AI-generated perspectives; factual claims are unverified. References
            do not establish truth or persuasiveness.
          </p>
        </section>
        {!!session.history?.length && (
          <label className="agent-history">
            Inspect a run{" "}
            <select
              value={selectedRun}
              onChange={(event) => {
                selectRun(event.target.value);
                setCursor(null);
                details.current?.close();
              }}
            >
              <option value="">Current run</option>
              {session.history.map((run, index) => (
                <option key={run.id} value={run.id}>
                  Previous run {index + 1} · {run.count} speeches
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedRun && (
          <p className="agent-caption">
            Viewing a previous run. Speech controls operate the current run.
          </p>
        )}
        {!!events.length && (
          <details className="agent-full-transcript">
            <summary>
              Full transcript · {events.length}{" "}
              {events.length === 1
                ? debate
                  ? "speech"
                  : "response"
                : debate
                  ? "speeches"
                  : "responses"}
            </summary>
            <ol className="agent-messages">
              {events.map((event) => (
                <li
                  key={event.id}
                  id={`agent-message-${node.id}-${event.sequence}`}
                >
                  <div className="agent-message-heading">
                    <strong>{event.name}</strong>
                    {debate && (
                      <span>
                        {debateRound(event.sequence - 1)} ·{" "}
                        {
                          configuration?.agents.find(
                            (agent) => agent.id === event.actor,
                          )?.team
                        }
                      </span>
                    )}
                    <span>
                      {debate ? "Speech" : "Response"} {event.sequence}
                    </span>
                  </div>
                  <p>{event.text}</p>
                  {debate && (
                    <p className="agent-caption">
                      {event.text.trim().split(/\s+/u).length} words ·{" "}
                      {event.references.length} references ·{" "}
                      {view?.receipts?.[event.id]?.elapsedMs ?? "unknown"} ms
                    </p>
                  )}
                  {event.references.length > 0 && (
                    <nav
                      aria-label={`References from response ${event.sequence}`}
                    >
                      {event.references.map((reference) => {
                        const earlier = events.find(
                          (message) => message.id === reference,
                        );
                        return earlier ? (
                          <a
                            key={reference}
                            href={`#agent-message-${node.id}-${earlier.sequence}`}
                            onClick={(event) => {
                              event.preventDefault();
                              seek(earlier.id);
                              details.current?.close();
                            }}
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
          </details>
        )}
        {view && (
          <section className="agent-run-details">
            <h3>Run information</h3>
            <p>
              {view.model.provider} · {view.model.model}
            </p>
            <p>
              Run identity: {view.id}. Attempts: {view.attempts}. Duration:{" "}
              {view.usage.elapsedMs} ms.
            </p>
            <p>
              Accepted responses: {view.count}. Input tokens:{" "}
              {view.usage?.inputTokens ?? "unknown"}; output tokens:{" "}
              {view.usage?.outputTokens ?? "unknown"}.
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
                        configuration: view.configuration,
                        run: view,
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
                link.download = debate
                  ? "ai-debate.json"
                  : "agent-conversation.json";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              {debate ? "Download debate" : "Download conversation"}
            </button>
          </section>
        )}
      </dialog>
    </section>
  );
}
