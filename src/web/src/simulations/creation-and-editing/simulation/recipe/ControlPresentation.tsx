"use client";

import { useContext, useEffect, useId, useState } from "react";
import type { DocumentRuntime } from "../../runtime-engine/DocumentRuntime";
import type { ComponentInstance } from "../../authoring-engine/document";
import { object } from "../../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../../registry/index";
import { schemaDefault } from "../../../registry/contracts/defaults";
import { ActivityControl, TrialControl } from "../../../registry/controls/ActivityControl";
import { CoolingTimeline } from "../../../legacy/components/controls/CoolingTimeline";
import {
  acceptedCommandArguments,
  commandPresentation,
} from "../../../registry/contracts/commandPresentation";
import {
  activityContract,
  legacyActivities,
  scalarControls,
} from "../../../registry/contracts/controlContract";
import { isPlaybackCommand } from "../../../registry/contracts/interactionPolicy";
import { PlaybackControl } from "../../../registry/controls/PlaybackControl";
import {
  ScalarControl,
  UnconfiguredControl,
} from "../../../registry/controls/ScalarControl";
import { SchemaForm } from "../../../registry/controls/SchemaForm";
import { TaskControl } from "../../../legacy/components/controls/TaskControl";
import { AuthorContext, MotionContext, SnapshotContext } from "./contexts";
import { mathBoardFor } from "./snapshotAdapters";

function EntityPickerControl({
  label,
  candidates,
  value,
  onSelect,
}: {
  label: string;
  candidates: ComponentInstance[];
  value: string;
  onSelect: (value: string) => import("../../runtime-engine/commands").ActionResult;
}) {
  const [accepted, setAccepted] = useState(value);
  const [error, setError] = useState("");
  const feedbackId = useId();
  useEffect(() => {
    setAccepted(value);
    setError("");
  }, [value]);
  const displayLabel = (candidate: ComponentInstance, index: number) => {
    const internalName = candidate.id.split("/").at(-1) ?? candidate.id;
    return candidate.label === candidate.id || candidate.label === internalName
      ? `${publicDefinition(candidate).title} ${index + 1}`
      : candidate.label;
  };
  const selectedIndex = candidates.findIndex(
    (candidate) => candidate.id === accepted,
  );
  const selectedLabel =
    selectedIndex >= 0
      ? displayLabel(candidates[selectedIndex], selectedIndex)
      : undefined;
  return (
    <div className="entity-picker">
      <label>
        <span>{label}</span>
        <select
          value={accepted}
          disabled={!candidates.length}
          aria-invalid={!!error || undefined}
          aria-describedby={error || selectedLabel ? feedbackId : undefined}
          onChange={(event) => {
            const next = event.target.value;
            const result = onSelect(next);
            if (result.accepted) {
              setAccepted(next);
              setError("");
            } else setError(result.error);
          }}
        >
          <option value="" disabled>
            {candidates.length ? "Choose an object" : "No compatible objects"}
          </option>
          {candidates.map((candidate, index) => (
            <option key={candidate.id} value={candidate.id}>
              {displayLabel(candidate, index)}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <span
          id={feedbackId}
          className="catalog-feedback catalog-feedback--error"
          role="alert"
        >
          {error}
        </span>
      ) : selectedLabel ? (
        <p
          id={feedbackId}
          className="entity-picker__accepted"
          aria-live="polite"
        >
          Selected: {selectedLabel}
        </p>
      ) : null}
    </div>
  );
}
export function ControlPresentation({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const author = useContext(AuthorContext);
  const snapshot = useContext(SnapshotContext);
  const animated = useContext(MotionContext);
  const config = node.configuration;
  const controlConnections = runtime.document.connections.filter(
    (c) => c.kind === "command" && c.from.node === node.id,
  );
  const connection =
    controlConnections.find((c) => !c.arguments) ?? controlConnections[0];
  const target = runtime.document.nodes.find(
    (n) => n.id === connection?.to.node,
  );
  const command =
    target && connection
      ? publicDefinition(target).commands[connection.to.port]
      : undefined;
  if (!command && scalarControls.has(node.definition))
    return (
      <UnconfiguredControl
        node={node}
        onConfigure={
          author.authoring ? () => author.onSelect?.(node.id) : undefined
        }
      />
    );
  if (!command)
    return (
      <div className="recipe-disconnected">
        <strong>{String(config.label || node.label)}</strong>
        <p>
          {author.authoring
            ? "Connect this control to a compatible model command."
            : "This control is unavailable in the current activity."}
        </p>
      </div>
    );
  const commandKey = connection?.to.port ?? "";
  if (commandKey === "PT_COOLING_TIME" && node.definition === "controls/Slider")
    return (
      <CoolingTimeline
        key={`${node.id}/${connection?.to.node}`}
        label={String(config.label || node.label)}
        time={Number(snapshot.state[target?.id ?? ""]?.time ?? 0)}
        animated={animated}
        onChange={(value) => runtime.submit(node.id, { value })}
      />
    );
  const metadata = commandPresentation(commandKey, target?.definition ?? "");
  const defaultLabel =
    target?.definition === "models/SinusoidalSignal"
      ? String(config.label).replace(
          /\bSet (phase|amplitude|frequency)\b/gi,
          (_, field: string) => field[0].toUpperCase() + field.slice(1),
        )
      : String(config.label);
  const label =
    metadata.label &&
    (metadata.legacyLabels.includes(defaultLabel) ||
      defaultLabel === command.description ||
      defaultLabel === commandKey.replaceAll("_", " "))
      ? metadata.label
      : defaultLabel;
  if (isPlaybackCommand(commandKey)) {
    const playing =
      (snapshot.outputs[target?.id ?? ""]?.playing ??
        snapshot.state[target?.id ?? ""]?.playing ??
        (
          snapshot.state[target?.id ?? ""]?.inputs as
            | Record<string, unknown>
            | undefined
        )?.playing) === true;
    return (
      <PlaybackControl
        label={metadata.label || "Playback"}
        playing={playing}
        animated={animated}
        onChange={(value) => runtime.submit(node.id, { value })}
      />
    );
  }
  if (node.definition === "controls/EntityPicker") {
    const argument =
        command.arguments.type === "object"
          ? Object.entries(command.arguments.properties).find(
              ([, schema]) => schema.type === "string",
            )?.[0]
          : undefined,
      targetDefinition = String(config.targetDefinition),
      candidates = runtime.document.nodes.filter(
        (candidate) =>
          candidate.scope === target?.scope &&
          (!targetDefinition || candidate.definition === targetDefinition),
      );
    if (!argument)
      return (
        <div className="recipe-disconnected">
          <strong>{label}</strong>
          <p>
            {author.authoring
              ? "Choose a command with a component-reference argument in Connections."
              : "Object selection is unavailable in the current activity."}
          </p>
        </div>
      );
    const targetState = snapshot.state[target?.id ?? ""];
    const acceptedReference = String(
      targetState?.[argument] ??
        (commandKey === "SELECT_MEMBER"
          ? targetState?.selectedMember
          : commandKey.startsWith("set:")
            ? targetState?.[commandKey.slice(4)]
            : "") ??
        "",
    );
    return (
      <EntityPickerControl
        label={label}
        candidates={candidates}
        value={acceptedReference}
        onSelect={(value) => runtime.submit(node.id, { [argument]: value })}
      />
    );
  }
  const activity = activityContract(node.definition);
  if (activity) {
    const kind =
      legacyActivities[node.definition.split("/")[1]] ??
      node.definition.split("/")[1];
    const state = snapshot.state[target?.id ?? ""] ?? {};
    const submit = (args: Record<string, unknown>) =>
      runtime.submit(node.id, args);
    if (kind === "ArithmeticActivity" || kind === "CountingActivity") {
      const board = mathBoardFor(
        snapshot.outputs[target?.id ?? ""]?.board,
        kind === "ArithmeticActivity" ? "arithmetic" : "counting",
      );
      return board ? (
        <TaskControl board={board} onSubmit={submit} />
      ) : (
        <p>Connect to the matching activity.</p>
      );
    }
    if (kind === "TrialsActivity")
      return <TrialControl state={state} onSubmit={submit} />;
    return (
      <ActivityControl
        kind={
          kind as
            | "GroupingActivity"
            | "FractionComparisonActivity"
            | "NumberLineActivity"
        }
        state={state}
        onSubmit={submit}
      />
    );
  }
  if (scalarControls.has(node.definition))
    return (
      <ScalarControl
        key={`${node.id}/${connection?.to.node}/${connection?.to.port}/${JSON.stringify(config)}`}
        node={node}
        command={command}
        commandKey={commandKey}
        label={label}
        presentation={metadata.presentation}
        submitLabel={metadata.submitLabel}
        state={snapshot.state[target?.id ?? ""]}
        onSubmit={(args) => runtime.submit(node.id, args)}
      />
    );
  let initial: unknown;
  try {
    initial = JSON.parse(String(config.initial));
  } catch {
    initial = schemaDefault(command.arguments);
  }
  const state = snapshot.state[target?.id ?? ""];
  const current = acceptedCommandArguments(
    commandKey,
    state,
    initial as Record<string, unknown>,
  );
  return (
    <SchemaForm
      key={`${node.id}/${connection?.to.node}/${connection?.to.port}/${config.initial}`}
      widget={
        node.definition === "controls/ExplorationTask"
          ? "Slider"
          : node.definition.split("/")[1]
      }
      schema={
        node.definition === "controls/Button" ? object({}) : command.arguments
      }
      initial={node.definition === "controls/Button" ? {} : initial}
      current={current}
      currentRevision={
        commandKey === "SET_BAR_FRACTION"
          ? JSON.stringify(state?.bars)
          : undefined
      }
      currentForDraft={
        commandKey === "SET_BAR_FRACTION"
          ? (draft) => acceptedCommandArguments(commandKey, state, draft)
          : undefined
      }
      label={
        commandKey === "LEVER_LIFT" &&
        target?.definition === "prefabs/physics/Lever"
          ? state?.lifted
            ? "Lower the load"
            : "Lift the load"
          : label
      }
      presentation={{
        ...metadata.presentation,
        ...Object.fromEntries(
          (Array.isArray(config.fields) ? config.fields : []).map(
            (field: { parameter: string; label: string; widget: string }) => [
              field.parameter,
              {
                ...metadata.presentation?.[field.parameter],
                label: field.label,
                widget: field.widget,
              },
            ],
          ),
        ),
      }}
      submitLabel={metadata.submitLabel}
      actionIntent={metadata.actionIntent}
      mode={command.submission === "continuous" ? "immediate" : "submit"}
      onSubmit={(args) => runtime.submit(node.id, args)}
    />
  );
}
