import type {
  ComponentInstance,
  PublicDefinition,
} from "../../runtime/authoring/types";
import type { ActionResult } from "../../runtime/commands";
import { object } from "../../runtime/parameterSchema";
import { schemaDefault } from "../composites/catalog";
import { acceptedCommandArguments } from "./commandPresentation";
import { readParameter, scalarBinding } from "./controlContract";
import { NumberField } from "./NumberField";
import { type FieldPresentation, SchemaForm } from "./SchemaForm";

export function UnconfiguredControl({
  node,
  onConfigure,
}: {
  node: ComponentInstance;
  onConfigure?: () => void;
}) {
  const label = String(node.configuration.label || node.label);
  return (
    <div className="control-unconfigured">
      {node.definition === "controls/Slider" ||
      node.definition === "controls/NumberInput" ? (
        <NumberField
          label={label}
          value={50}
          min={0}
          max={100}
          disabled
          presentation={
            node.definition === "controls/Slider" ? "slider" : "field"
          }
          showNumber={node.configuration.showNumber !== false}
          onChange={() => ({
            accepted: false,
            error: "Choose a numeric parameter.",
          })}
        />
      ) : (
        <strong>{label}</strong>
      )}
      <p>
        Choose{" "}
        {node.definition === "controls/Toggle"
          ? "a boolean"
          : node.definition === "controls/Select"
            ? "a choice"
            : "a numeric"}{" "}
        parameter.
      </p>
      {onConfigure && (
        <button
          type="button"
          className="recipe-action recipe-action--secondary"
          onClick={onConfigure}
        >
          Set up control
        </button>
      )}
    </div>
  );
}
export function ScalarControl({
  node,
  command,
  commandKey,
  state,
  onSubmit,
  label,
  presentation = {},
  submitLabel,
}: {
  node: ComponentInstance;
  command: PublicDefinition["commands"][string];
  commandKey: string;
  state?: Record<string, unknown>;
  onSubmit: (args: Record<string, unknown>) => ActionResult;
  label?: string;
  presentation?: FieldPresentation;
  submitLabel?: string;
}) {
  const binding = scalarBinding(node, command.arguments);
  let initial = schemaDefault(command.arguments) as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(node.configuration.initial));
    if (parsed && typeof parsed === "object") initial = parsed;
  } catch {
    /* A legacy draft can be replaced in settings. */
  }
  const current = acceptedCommandArguments(commandKey, state, initial);
  const value =
    readParameter(current ?? initial, binding.path) ??
    readParameter(schemaDefault(command.arguments), binding.path);
  const fieldPresentation = presentation[binding.path] ?? presentation.value;
  return (
    <div
      className={`scalar-control${node.configuration.parameter ? " scalar-control--parameter" : ""}`}
    >
      <SchemaForm
        widget={node.definition.split("/")[1]}
        schema={object({ value: binding.schema })}
        initial={{ value }}
        current={{ value }}
        label={label ?? String(node.configuration.label || node.label)}
        submitLabel={submitLabel}
        mode={
          node.configuration.mode === "immediate" &&
          command.submission === "continuous"
            ? "immediate"
            : "submit"
        }
        presentation={{
          value: {
            ...fieldPresentation,
            exactLabel: !node.configuration.parameter,
            step:
              (node.configuration.step as number | undefined) ??
              fieldPresentation?.step,
            showNumber: node.configuration.showNumber !== false,
          },
        }}
        onSubmit={onSubmit}
      />
    </div>
  );
}
