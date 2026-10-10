"use client";

import { useId, useRef, useState } from "react";
import type { SessionProjection } from "../../runtime/agents/providers";
import type { DocumentRuntime } from "../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../runtime/authoring/types";
import { debateRound } from "../systems/debate/protocol";
import {
  agentDetailsDialogId,
  useAgentValue,
} from "../views/agents/AgentViews";

export function AgentActions({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const session = useAgentValue(node, runtime) as SessionProjection | undefined;
  const debate = !!session?.scenario;
  const speech = debate ? "speech" : "response";
  const firstSpeaker =
    (debate
      ? session?.agents.find((agent) => agent.team === "Proposition")
      : session?.agents[0]
    )?.name.split(" · ")[0] ?? "Agent";
  const canResume = runtime.document.connections.some(
    (link) =>
      link.kind === "command" &&
      link.from.node === node.id &&
      link.from.port === "RESUME",
  );
  const [error, setError] = useState("");
  const options = useRef<HTMLDivElement>(null);
  const optionsTrigger = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  const source = runtime.document.connections.find(
    (link) => link.kind === "value" && link.to.node === node.id,
  )?.from.node;
  const transcript = runtime.document.connections.find(
    (link) =>
      link.kind === "value" &&
      link.from.node === source &&
      runtime.document.nodes.some(
        (target) =>
          target.id === link.to.node &&
          target.definition === "displays/AgentTranscript",
      ),
  )?.to.node;
  const run = (command: string) => {
    options.current?.hidePopover();
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
            ? `Retry ${speech}`
            : session?.recording
              ? `Next recorded ${speech}`
              : `Next ${speech}`}
        </button>
        {session?.playing ? (
          <button type="button" onClick={() => run("PAUSE")}>
            Pause after {speech}
          </button>
        ) : (
          <button
            type="button"
            disabled={!session || session.busy || ended}
            onClick={() => run("PLAY")}
          >
            {session?.recording
              ? `Show all recorded ${debate ? "speeches" : "responses"}`
              : "Autoplay"}
          </button>
        )}
        <button
          ref={optionsTrigger}
          className="agent-options-trigger"
          type="button"
          popoverTarget={optionsId}
        >
          More options
        </button>
        <div
          ref={options}
          id={optionsId}
          popover="auto"
          className="agent-options-menu"
        >
          <span className="agent-eyebrow">Conversation options</span>
          {transcript && (
            <button
              type="button"
              onClick={() => {
                options.current?.hidePopover();
                optionsTrigger.current?.focus();
                const dialog = document.getElementById(
                  agentDetailsDialogId(transcript),
                );
                if (dialog instanceof HTMLDialogElement) dialog.showModal();
              }}
            >
              Conversation details
            </button>
          )}
          {session?.busy && (
            <button type="button" onClick={() => run("CANCEL")}>
              Cancel {speech}
            </button>
          )}
          <button
            type="button"
            disabled={!session}
            onClick={() => run("RESET")}
          >
            Restart {debate ? "debate" : "conversation"}
          </button>
          {canResume && session && !session.view && !session.busy && (
            <button type="button" onClick={() => run("RESUME")}>
              Resume saved run
            </button>
          )}
          {!!session?.view?.events.length && (
            <button
              type="button"
              disabled={session.busy}
              onClick={() => run("REPLAY")}
            >
              Replay {debate ? "debate" : "conversation"}
            </button>
          )}
        </div>
      </div>
      <output className="agent-progress" aria-live="polite">
        {debate ? `${debateRound(session?.view?.count ?? 0)} · ` : ""}
        {session?.busy
          ? `${session.view?.nextActor.split(" · ")[0] ?? firstSpeaker} is responding…`
          : ended
            ? `${session?.cancelled || session?.view?.status === "cancelled" ? "Run cancelled" : debate ? "Debate complete" : "Conversation complete"}. Restart to explore another run.`
            : session?.view
              ? `Next: ${session.view.nextActor.split(" · ")[0]}`
              : debate
                ? `Next: ${firstSpeaker}`
                : "Ready to begin"}{" "}
        {session?.view
          ? `· ${session.view.count} of ${session.view.maxSteps} ${session.recording ? "recorded " : ""}${debate ? "speeches" : "responses"}`
          : debate
            ? "· 0 of 18 speeches"
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
