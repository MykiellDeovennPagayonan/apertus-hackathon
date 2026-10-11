"use client";
import { useContext, useState } from "react";
import { type CollectiveKind, command } from "../../../domains/collective";
import type { DocumentRuntime } from "../../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../../runtime/authoring/types";
import type { CrowdState } from "../../systems/collective/crowd";
import { MotionContext, SnapshotContext } from "../recipe/contexts";
import "./collective.css";
interface Props {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}
export function CollectiveControl({ node, runtime }: Props) {
  const snapshot = useContext(SnapshotContext),
    motion = useContext(MotionContext);
  const [error, setError] = useState("");
  const link = runtime.document.connections.find(
    (c) => c.kind === "value" && c.to.node === node.id && c.to.port === "value",
  );
  const s = link ? snapshot.state[link.from.node] : undefined;
  const kind = node.definition.split("/")[1].split("-")[1] as CollectiveKind;
  const role = node.definition.split("-").at(-1);
  function send(op: string, value?: unknown) {
    const links = runtime.document.connections.filter(
      (c) =>
        c.kind === "command" &&
        c.from.node === node.id &&
        c.from.port === command(kind, op),
    );
    const result = links.length
      ? runtime.dispatch(
          links.map((c) => ({
            node: c.to.node,
            command: c.to.port,
            arguments: value === undefined ? {} : { value },
          })),
        )
      : { accepted: false, error: "Connect this action to its model." };
    setError(result.accepted ? "" : result.error);
  }
  if (!s) return <p>Connect the activity to begin.</p>;
  const finished =
    kind === "fishing"
      ? Number(s.day) >= 365 || s.stock === 0
      : kind === "selection"
        ? Number(s.generation) >= 100 || !(s.organisms as unknown[]).length
        : kind === "voting"
          ? Boolean(s.done)
          : (s as unknown as CrowdState).lanes.every(
              (l) => !l.people.length || l.ticks >= 2000,
            );
  const label = s.playing
    ? "Pause"
    : finished
      ? kind === "crowd"
        ? "Try another placement"
        : "Restart this run"
      : kind === "fishing"
        ? Number(s.day)
          ? "Watch another 30 days"
          : "Watch 30 days"
        : kind === "crowd"
          ? "Run comparison"
          : kind === "voting"
            ? (s.rounds as unknown[]).length
              ? "Next round"
              : "Count votes"
            : "Next generation";
  return (
    <div className="collective-control">
      {role === "caption" ? (
        <p
          className="collective-caption"
          aria-live={s.playing ? "off" : "polite"}
        >
          {link ? String(snapshot.outputs[link.from.node]?.caption ?? "") : ""}
        </p>
      ) : role === "choice" && kind === "fishing" && Number(s.policy) === 2 ? (
        <p className="collective-caption">
          Agreement: share the lake’s daily renewal.
        </p>
      ) : role === "choice" ? (
        <label className="collective-choice">
          {kind === "fishing"
            ? "Catch arrangement"
            : kind === "voting"
              ? "Voting rule"
              : "Habitat"}
          <select
            aria-label={
              kind === "fishing"
                ? "Catch arrangement"
                : kind === "voting"
                  ? "Voting rule"
                  : "Habitat"
            }
            disabled={Boolean(s.playing)}
            value={Number(
              s[
                kind === "fishing"
                  ? "arrangement"
                  : kind === "voting"
                    ? "rule"
                    : "habitat"
              ],
            )}
            onChange={(e) =>
              send(
                `SET_${kind === "fishing" ? "arrangement" : kind === "voting" ? "rule" : "habitat"}`,
                Number(e.target.value),
              )
            }
          >
            {(kind === "fishing"
              ? [
                  "Equal share · 4 each",
                  "One takes more · 8, 4, 4, 4, 4",
                  "Everyone takes more · 8 each",
                ]
              : kind === "voting"
                ? [
                    "First-past-the-post",
                    "Ranked choice · instant-runoff",
                    "Approval · choose several",
                  ]
                : ["Light", "Dark"]
            ).map((label, i) => (
              <option
                key={label}
                value={kind === "selection" ? (i ? 0.9 : 0.1) : i}
              >
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="collective-actions">
          <button
            type="button"
            className="collective-primary"
            onClick={() => {
              if (kind === "crowd" && finished) {
                send("SET_placement", (Number(s.placement) + 1) % 3);
                return;
              }
              send(
                s.playing
                  ? "PAUSE"
                  : finished
                    ? "RESTART"
                    : motion
                      ? "RUN"
                      : "COMPLETE",
              );
            }}
          >
            {label}
          </button>
          {!s.playing &&
            !finished &&
            ((kind === "fishing" && Number(s.day) > 0) ||
              (kind === "selection" && Number(s.generation) > 0) ||
              (kind === "voting" && (s.rounds as unknown[]).length > 0)) && (
              <button
                type="button"
                className="collective-secondary"
                onClick={() => send("RESTART")}
              >
                Start again
              </button>
            )}
          {kind === "crowd" && finished && (
            <button
              type="button"
              className="collective-secondary"
              onClick={() => send("RESTART")}
            >
              Run this again
            </button>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
