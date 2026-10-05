"use client";
import { SchemaForm } from "../SchemaForm";
import { naturalSystems } from "../../../domains/natural-systems";
import type { ModelInstance } from "../../../runtime/contribution";
import { dispatchBatch, dispatchCommand } from "../../../runtime/session";

export type NaturalCommand = (
  instance: ModelInstance,
  action: string,
  value?: unknown,
) => void;
export function naturalCommand(
  report: (message: string) => void,
): NaturalCommand {
  return (instance, action, value) => {
    const result = dispatchCommand("assembly", {
      type: action,
      target: instance.id,
      ...(value === undefined ? {} : { value }),
    });
    report(result.accepted ? "" : result.error);
  };
}
const parameterByAction: Record<string, string> = {
  DIFF_SET_COEFFICIENT: "diffusionCoefficient",
  ECO_SET_INITIAL_RABBITS: "initialRabbits",
  PLANT_SET_LIGHT: "light",
  PLANT_SET_WATER: "water",
  PLANT_SET_NUTRIENTS: "nutrients",
};
function NumberControl({
  instance,
  action,
  label,
  command,
}: {
  instance: ModelInstance;
  action: string;
  label: string;
  command: NaturalCommand;
}) {
  const model = naturalSystems.models.find(candidate => candidate.ref === instance.provider);
  const schema = model?.actions[action]?.arguments;
  if (!schema) return null;
  return <SchemaForm schema={schema} initial={{ value: instance.parameters[parameterByAction[action]] }} label={label} onSubmit={args => { command(instance, action, args.value); return { accepted: true }; }} />;
}
export function NaturalControls({
  instance,
  command,
  boundActions,
}: {
  instance: ModelInstance;
  command: NaturalCommand;
  boundActions: string[];
}) {
  const controls = instance.provider.endsWith("/DiffusionField")
    ? [["DIFF_SET_COEFFICIENT", "Diffusion coefficient (m²/s)"]]
    : instance.provider.endsWith("/PredatorPrey")
      ? [["ECO_SET_INITIAL_RABBITS", "Starting rabbits"]]
      : [
          ["PLANT_SET_LIGHT", "Light (0–1)"],
          ["PLANT_SET_WATER", "Water (0–1)"],
          ["PLANT_SET_NUTRIENTS", "Nutrients (0–1)"],
        ];
  return (
    <div className="natural-controls">
      {controls
        .filter(([action]) => boundActions.includes(action))
        .map(([action, label], index) =>
          index === 0 ? (
            <NumberControl
              key={action}
              instance={instance}
              action={action}
              label={label}
              command={command}
            />
          ) : (
            <details key={action} open={false}>
              <summary>{index === 1 ? "Other resources" : label}</summary>
              <NumberControl
                instance={instance}
                action={action}
                label={label}
                command={command}
              />
            </details>
          ),
        )}
      {boundActions.includes("DIFF_SCALE_COEFFICIENT") && (
        <button
          type="button"
          onClick={() => command(instance, "DIFF_SCALE_COEFFICIENT", 2)}
        >
          Spread twice as fast
        </button>
      )}
      {boundActions.includes("ECO_SCALE_INITIAL_RABBITS") && (
        <button
          type="button"
          onClick={() => command(instance, "ECO_SCALE_INITIAL_RABBITS", 0.5)}
        >
          Start with half the rabbits
        </button>
      )}
      {boundActions.includes("PLANT_SET_LIGHT") && (
        <button
          type="button"
          onClick={() =>
            command(
              instance,
              "PLANT_SET_LIGHT",
              Math.max(0.7, Number(instance.parameters.water)),
            )
          }
        >
          Raise light above water
        </button>
      )}
    </div>
  );
}
export function NaturalPlayback({
  instances,
  report,
  boundActions,
}: {
  instances: ModelInstance[];
  report: (message: string) => void;
  boundActions: { instance: string; action: string }[];
}) {
  const specs = instances.map((instance) =>
    instance.provider.endsWith("/DiffusionField")
      ? {
          instance,
          play: "DIFF_SET_PLAYING",
          restart: "DIFF_RESTART",
          step: "DIFF_STEP",
        }
      : instance.provider.endsWith("/PredatorPrey")
        ? {
            instance,
            play: "ECO_SET_PLAYING",
            restart: "ECO_RESTART",
            step: "ECO_STEP",
          }
        : {
            instance,
            play: "PLANT_SET_PLAYING",
            restart: "PLANT_RESTART",
            step: "PLANT_STEP",
          },
  );
  const playing = instances.some((instance) => Boolean(instance.state.playing));
  const send = (key: "play" | "restart" | "step", value?: unknown) => {
    const commands = specs
      .filter((spec) =>
        boundActions.some(
          (binding) =>
            binding.instance === spec.instance.id &&
            binding.action === spec[key],
        ),
      )
      .map((spec) => ({
        type: spec[key],
        target: spec.instance.id,
        ...(value === undefined ? {} : { value }),
      }));
    const result = dispatchBatch("assembly", commands);
    report(result.accepted ? "" : result.error);
  };
  return (
    <div className="natural-playback">
      <button type="button" onClick={() => send("play", !playing)}>
        {playing ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={() => send("restart")}>
        Run again
      </button>
      <button type="button" disabled={playing} onClick={() => send("step")}>
        Step
      </button>
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
