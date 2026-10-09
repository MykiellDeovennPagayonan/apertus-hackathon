"use client";

import { useContext } from "react";
import type { DocumentRuntime } from "../../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../../runtime/authoring/types";
import { publicDefinition } from "../../catalog";
import { DatasetDisplay } from "../DatasetDisplay";
import {
  type DataPresentation,
  outputDataPresentation,
} from "../dataPresentation";
import { PropertyInspector } from "../EntityInspectorView";
import { MathReadoutView } from "../MathReadoutView";
import { MemberInspector } from "../MemberInspector";

import { AuthorContext, SnapshotContext } from "./contexts";
import { display } from "./formatObservation";
import { boundObservation } from "./observations";
import { mathBoard } from "./snapshotAdapters";

function BridgeSelectionHint() {
  return (
    <section className="bridge-member-hint">
      <h3>Explore the beams</h3>
      <p>Tap any beam on the bridge to see how it carries the load.</p>
    </section>
  );
}

export function DisplayPresentation({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const author = useContext(AuthorContext);
  const snapshot = useContext(SnapshotContext);
  const def = publicDefinition(node.definition),
    config = node.configuration;
  if (node.definition === "displays/Box")
    return <div className="recipe-box-content" aria-hidden="true" />;
  if (node.definition === "displays/Text")
    return config.variant === "heading" ? (
      <h2 className="recipe-text-content is-heading">{String(config.text)}</h2>
    ) : (
      <p
        className={`recipe-text-content${config.variant === "callout" ? " is-callout" : ""}`}
      >
        {String(config.text)}
      </p>
    );
  if (node.definition === "displays/Formula") {
    const binding = runtime.document.connections.find(
        (c) => c.kind === "value" && c.to.node === node.id,
      ),
      value = binding
        ? snapshot.outputs[binding.from.node]?.[binding.from.port]
        : config.text;
    return (
      <output
        className="recipe-formula"
        aria-label={String(config.label || node.label)}
      >
        {value == null || value === ""
          ? "Formula unavailable"
          : typeof value === "number"
            ? Number.isFinite(value)
              ? value.toLocaleString(undefined, {
                  maximumFractionDigits: Number(config.precision ?? 3),
                })
              : "Formula unavailable"
            : typeof value === "string"
              ? value
              : "Formula unavailable"}
      </output>
    );
  }
  if (node.definition === "displays/Legend") {
    const binding = runtime.document.connections.find(
        (c) => c.kind === "value" && c.to.node === node.id,
      ),
      bound = binding
        ? snapshot.outputs[binding.from.node]?.[binding.from.port]
        : undefined;
    let entries: unknown = bound;
    if (entries === undefined)
      try {
        entries = JSON.parse(String(config.text));
      } catch {
        entries = [];
      }
    return (
      <ul className="recipe-legend" aria-label={String(config.label)}>
        {(Array.isArray(entries) ? entries : [])
          .slice(0, 32)
          .map((entry, index) => {
            const record: Record<string, unknown> =
              entry && typeof entry === "object"
                ? (entry as Record<string, unknown>)
                : { label: entry };
            return (
              <li key={String(record.id ?? record.label ?? index)}>
                <svg
                  aria-hidden="true"
                  width="32"
                  height="16"
                  viewBox="0 0 32 16"
                >
                  <line
                    x1="1"
                    y1="8"
                    x2="31"
                    y2="8"
                    stroke={
                      /^#[0-9a-f]{6}$/i.test(String(record.color))
                        ? String(record.color)
                        : "var(--accent)"
                    }
                    strokeWidth="3"
                    strokeDasharray={String(record.dash ?? "")}
                  />
                  {record.marker === "circle" ? (
                    <circle cx="16" cy="8" r="3" fill="var(--text)" />
                  ) : record.marker === "square" ? (
                    <rect
                      x="13"
                      y="5"
                      width="6"
                      height="6"
                      fill="var(--text)"
                    />
                  ) : null}
                </svg>
                {String(record.label ?? entry)}
              </li>
            );
          })}
      </ul>
    );
  }
  if (def.category === "displays") {
    const { binding, source, value, unit, needsBridgeSelection } =
      boundObservation(runtime.document, snapshot, node.id);
    const kind = node.definition.split("/")[1];
    if (kind === "TrialSummary") {
      const rows = value as
        | { outcome: string; observed: number; expected: number }[]
        | undefined;
      const total = Array.isArray(rows)
        ? rows.reduce((sum, row) => sum + row.observed, 0)
        : 0;
      const first = rows?.[0];
      return (
        <section className="trial-summary" aria-live="polite">
          <h3>{String(config.label)}</h3>
          {first && total > 0 ? (
            <>
              <p>
                Chance of{" "}
                {first.outcome === "Heads"
                  ? "Heads"
                  : `rolling ${first.outcome}`}
              </p>
              <div className="trial-summary-values">
                <div>
                  <span>Observed</span>
                  <strong>
                    {((100 * first.observed) / total).toFixed(1)}%
                  </strong>
                </div>
                <div>
                  <span>Expected</span>
                  <strong>
                    {((100 * first.expected) / total).toFixed(1)}%
                  </strong>
                </div>
              </div>
              <p>{total.toLocaleString()} trials completed</p>
            </>
          ) : (
            <p>Run trials to compare a sample with its expected probability.</p>
          )}
        </section>
      );
    }
    if (
      kind === "StatusMessage" ||
      binding?.from.port === "feedback" ||
      (kind === "Readout" && typeof value === "boolean")
    ) {
      if (value === "" || (binding?.from.port === "feedback" && value == null))
        return null;
      const message =
        typeof value === "boolean"
          ? binding?.from.port === "playing"
            ? value
              ? "Running"
              : "Paused"
            : binding?.from.port === "balanced"
              ? value
                ? "The reaction is balanced"
                : "The reaction is not balanced yet"
              : binding?.from.port === "stopped"
                ? value
                  ? "Motion has stopped"
                  : "The object is moving"
                : ["closed", "roadClosed"].includes(binding?.from.port ?? "")
                  ? value
                    ? "Road closed"
                    : "Road open"
                  : binding?.from.port === "disturbanceActive"
                    ? value
                      ? "Braking disturbance active"
                      : "No braking disturbance"
                    : `${String(config.label)}: ${value ? "Enabled" : "Disabled"}`
          : value === undefined || value === null
            ? "Waiting for a result"
            : display(value);
      return (
        <output
          className={`recipe-status recipe-status--${String(config.tone ?? "neutral")}`}
          aria-live="polite"
        >
          <span className="recipe-status-dot" aria-hidden="true" />
          {message}
        </output>
      );
    }
    const board = kind === "Readout" ? mathBoard(value) : undefined;
    if (board)
      return <MathReadoutView board={board} label={String(config.label)} />;
    if (kind === "Readout") {
      if (needsBridgeSelection) return <BridgeSelectionHint />;
      const configuredLabel = String(config.label);
      const label =
        unit && configuredLabel.endsWith(` ${unit}`)
          ? configuredLabel.slice(0, -unit.length - 1)
          : configuredLabel;
      if (value && typeof value === "object")
        return (
          <PropertyInspector
            label={label}
            value={value}
            precision={Number(config.precision ?? 3)}
            unit={unit}
          />
        );
      return (
        <section className="recipe-measurement" aria-label={label}>
          <span className="recipe-measurement-label">{label}</span>
          <output className="recipe-measurement-value">
            {value === ""
              ? "Unavailable"
              : display(value, Number(config.precision))}
            <small>{unit}</small>
          </output>
        </section>
      );
    }
    if (
      kind === "Inspector" &&
      value &&
      typeof value === "object" &&
      "member" in value &&
      "response" in value
    )
      return (
        <MemberInspector
          member={
            (value as { member: import("../../traits/MemberEndpoints").Member })
              .member
          }
          response={
            (
              value as {
                response: import("../../traits/MemberResponse").MemberResponse;
              }
            ).response
          }
        />
      );
    if (kind === "Inspector") {
      if (needsBridgeSelection) return <BridgeSelectionHint />;
      const configuredLabel = String(config.label);
      const inspectorLabel =
        source?.definition === "models/BridgeResponse" &&
        binding?.from.port === "selected" &&
        configuredLabel.toLowerCase() === "selected"
          ? "Selected member"
          : configuredLabel;
      return (
        <PropertyInspector
          label={inspectorLabel}
          value={value}
          precision={Number(config.precision ?? 3)}
          unit={unit}
        />
      );
    }
    if (["Chart", "Histogram", "Heatmap", "DataTable"].includes(kind)) {
      const defaults = outputDataPresentation(
        source?.definition ?? "",
        binding?.from.port ?? "",
      );
      const presentation = {
        ...defaults,
        ...Object.fromEntries(
          Object.entries(config).filter(
            ([key]) => !["label", "precision", "tone"].includes(key),
          ),
        ),
      } as DataPresentation;
      const townActivities =
        source?.definition === "models/TownNavigation" &&
        binding?.from.port === "activity";
      const presentedValue =
        townActivities && Array.isArray(value)
          ? value.map((row) =>
              row &&
              typeof row === "object" &&
              /^town\/citizen-\d+$/.test(String(row.id))
                ? {
                    ...row,
                    id: `Person ${Number(String(row.id).split("-").at(-1)) + 1}`,
                  }
                : row,
            )
          : value;
      return (
        <DatasetDisplay
          value={presentedValue}
          kind={townActivities ? "DataTable" : kind}
          label={String(config.label)}
          precision={Number(config.precision ?? 3)}
          presentation={presentation}
          authoring={author.authoring}
        />
      );
    }
    return (
      <section aria-label={String(config.label)}>
        <strong>{String(config.label)}</strong>
        <output>{display(value, Number(config.precision))}</output>
      </section>
    );
  }
  return null;
}
