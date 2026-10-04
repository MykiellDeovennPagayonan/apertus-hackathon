"use client";
import { type FormEvent, useId, useState } from "react";
import { physicalSystems } from "../../../domains/physical-systems";
import type { ModelInstance } from "../../../runtime/contribution";
import { dispatchBatch, dispatchCommand } from "../../../runtime/session";
import type { UIAction } from "../../../runtime/types";

export type PhysicalCommand = (
  instance: ModelInstance,
  action: string,
  value?: unknown,
) => void;
export function physicalCommand(
  instances: ModelInstance[],
  report: (message: string) => void,
): PhysicalCommand {
  return (instance, action, value) => {
    const timed = instances.filter(
      (i) => i.provider !== "prefabs/physical-systems/ResistiveCircuit",
    );
    const shared = [
      "PEND_SET_GRAVITY",
      "PEND_SET_AMPLITUDE",
      "ROLL_SET_HEIGHT",
      "ROLL_SET_GRAVITY",
    ].includes(action);
    const targets = shared
      ? timed.filter((i) => i.provider === instance.provider)
      : [instance];
    const commands: UIAction[] = targets.map((i) => ({
      type: action,
      target: i.id,
      ...(value === undefined ? {} : { value }),
    }));
    if (action.startsWith("PEND_SET_") || action.startsWith("ROLL_SET_") || action === "ROLL_SCALE_RESISTANCE")
      commands.push(
        ...timed
          .filter((i) => !targets.some((t) => t.id === i.id))
          .map((i) => ({ type: "PHYS_RESTART", target: i.id })),
      );
    const result = dispatchBatch("assembly", commands);
    report(result.accepted ? "" : result.error);
  };
}
function NumberControl({
  instance,
  action,
  label,
  command,
}: {
  instance: ModelInstance;
  action: string;
  label: string;
  command: PhysicalCommand;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const model = physicalSystems.models.find((m) => m.ref === instance.provider);
  const schema = model?.actions[action].arguments;
  const field = schema?.type === "object" ? schema.properties.value : null;
  const parameter = (
    {
      PEND_SET_LENGTH: "length",
      PEND_SET_GRAVITY: "gravity",
      PEND_SET_AMPLITUDE: "amplitude",
      ROLL_SET_RESISTANCE: "resistance",
      ROLL_SET_HEIGHT: "height",
      ROLL_SET_GRAVITY: "gravity",
      CIRC_SET_BULBS: "bulbs",
      CIRC_SET_VOLTAGE: "voltage",
      CIRC_SET_RESISTANCE: "resistance",
    } as Record<string, string>
  )[action];
  if (!field || (field.type !== "number" && field.type !== "integer"))
    return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft === "") return;
    command(instance, action, Number(draft ?? instance.parameters[parameter]));
    setDraft(null);
  };
  return (
    <form onSubmit={submit} className="physical-number-control">
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          id={id}
          type="number"
          min={field.minimum}
          max={field.maximum}
          step={field.type === "integer" ? 1 : "any"}
          required
          value={draft ?? String(instance.parameters[parameter])}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">Set</button>
      </div>
      <small>
        {field.minimum}–{field.maximum} {field.unit}
      </small>
    </form>
  );
}
export function PhysicalControls({
  instance,
  command,
  boundActions,
}: {
  instance: ModelInstance;
  command: PhysicalCommand;
  boundActions: string[];
}) {
  const controls = instance.provider.endsWith("/Pendulum")
    ? [
        ["PEND_SET_LENGTH", "Length (m)"],
        ["PEND_SET_GRAVITY", "Shared gravity (m/s²)"],
        ["PEND_SET_AMPLITUDE", "Shared amplitude (°)"],
      ]
    : instance.provider.endsWith("/RollingTrack")
      ? [
          ["ROLL_SET_RESISTANCE", "Floor resistance μ"],
          ["ROLL_SET_HEIGHT", "Shared launch height (m)"],
          ["ROLL_SET_GRAVITY", "Shared gravity (m/s²)"],
        ]
      : [
          ["CIRC_SET_BULBS", "Number of bulbs"],
          ["CIRC_SET_VOLTAGE", "Battery voltage (V)"],
          ["CIRC_SET_RESISTANCE", "Each bulb's resistance (Ω)"],
        ];
  const numeric = controls.filter(([action]) => boundActions.includes(action));
  return (
    <div className="physical-controls">
      {numeric[0] && (
        <NumberControl
          key={numeric[0][0]}
          instance={instance}
          action={numeric[0][0]}
          label={numeric[0][1]}
          command={command}
        />
      )}
      {instance.provider.endsWith("/ResistiveCircuit") && (
        <>
          {boundActions.includes("CIRC_ADD_BULB") && (
            <button
              type="button"
              disabled={Number(instance.parameters.bulbs) >= 8}
              onClick={() => command(instance, "CIRC_ADD_BULB")}
            >
              Add another bulb
            </button>
          )}
          {boundActions.includes("CIRC_SET_TOPOLOGY") && (
            <label>
              Connection{" "}
              <select
                value={String(instance.parameters.topology)}
                onChange={(event) =>
                  command(instance, "CIRC_SET_TOPOLOGY", event.target.value)
                }
              >
                <option value="series">Series</option>
                <option value="parallel">Parallel</option>
              </select>
            </label>
          )}
        </>
      )}
      {numeric.length > 1 && (
        <details>
          <summary>Model settings</summary>
          {numeric.slice(1).map(([action, label]) => (
            <NumberControl
              key={action}
              instance={instance}
              action={action}
              label={label}
              command={command}
            />
          ))}
        </details>
      )}
    </div>
  );
}
export function PhysicalPlayback({
  instances,
  report,
  boundActions,
}: {
  instances: ModelInstance[];
  report: (message: string) => void;
  boundActions: { instance: string; action: string }[];
}) {
  const timed = instances.filter(
    (i) => i.provider !== "prefabs/physical-systems/ResistiveCircuit",
  );
  const playing = timed.some((i) => i.state.playing);
  const bound = (action: string) =>
    timed.every((i) =>
      boundActions.some((b) => b.instance === i.id && b.action === action),
    );
  const all = (type: string, value?: unknown) => {
    const result = dispatchBatch(
      "assembly",
      timed.map((i) => ({
        type,
        target: i.id,
        ...(value === undefined ? {} : { value }),
      })),
    );
    report(result.accepted ? "" : result.error);
  };
  return (
    <div className="physical-playback">
      {timed.length > 0 && (
        <>
          {bound("PHYS_PLAY") && (
            <button type="button" onClick={() => all("PHYS_PLAY", !playing)}>
              {playing ? "Pause" : "Play"}
            </button>
          )}
          {bound("PHYS_RESTART") && (
            <button type="button" onClick={() => all("PHYS_RESTART")}>
              Run again
            </button>
          )}
          {bound("PHYS_STEP") && (
            <button
              type="button"
              disabled={playing}
              onClick={() => all("PHYS_STEP")}
            >
              Step 0.1 s
            </button>
          )}
        </>
      )}
      <button
        type="button"
        onClick={() => {
          const result = dispatchCommand("assembly", {
            type: "RESET",
            target: "session",
          });
          report(result.accepted ? "" : result.error);
        }}
      >
        Reset initial settings
      </button>
    </div>
  );
}
