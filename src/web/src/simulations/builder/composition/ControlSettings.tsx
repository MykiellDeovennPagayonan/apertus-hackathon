import { useEffect, useRef, useState } from "react";
import { publicDefinition } from "../../components/catalog";
import { schemaDefault } from "../../components/composites/catalog";
import { acceptedCommandArguments } from "../../components/controls/commandPresentation";
import {
  acceptsScalar,
  activityContract,
  parameterLeaves,
  readParameter,
  scalarControls,
} from "../../components/controls/controlContract";
import { SchemaForm } from "../../components/controls/SchemaForm";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { ComponentInstance } from "../../runtime/authoring/types";
import type { ActionResult } from "../../runtime/commands";
import { BuilderIcon } from "../BuilderIcon";
import type { ComponentCatalog } from "./useComponentCatalog";

export function ControlSettings({
  node,
  catalog,
}: {
  node: ComponentInstance;
  catalog: ComponentCatalog;
}) {
  const { document, change } = catalog;
  const result = (accepted: boolean): ActionResult =>
    accepted
      ? { accepted: true }
      : { accepted: false, error: "Settings were rejected." };
  const links = document.connections.filter(
    (c) => c.kind === "command" && c.from.node === node.id && !c.arguments,
  );
  const link = links[0];
  const scalar = scalarControls.has(node.definition);
  const activity = activityContract(node.definition);
  const options = document.nodes
    .filter((target) => target.scope === node.scope && target.id !== node.id)
    .flatMap((target) => {
      const definition = publicDefinition(target.definition);
      return Object.entries(definition.commands).flatMap(([key, command]) => {
        if (
          activity &&
          (target.definition !== activity.model || key !== activity.command)
        )
          return [];
        const leaves = parameterLeaves(command.arguments).filter((leaf) =>
          acceptsScalar(node.definition, leaf.schema),
        );
        return (scalar ? leaves.map((leaf) => leaf.path) : [""]).map(
          (parameter) => ({
            value: JSON.stringify([target.id, key, parameter]),
            target,
            key,
            parameter,
            command,
            label: `${target.label} · ${key.replace(/^set:/, "").replaceAll("_", " ").toLowerCase()}${parameter && parameter !== "value" ? ` · ${parameter.replace(/^value\./, "")}` : ""}`,
          }),
        );
      });
    });
  const existing = options.find(
    (option) =>
      option.target.id === link?.to.node &&
      option.key === link?.to.port &&
      (!scalar ||
        option.parameter === node.configuration.parameter ||
        (!node.configuration.parameter &&
          options.filter(
            (other) =>
              other.target.id === link?.to.node && other.key === link?.to.port,
          ).length === 1)),
  );
  const [selected, setSelected] = useState(existing?.value ?? "");
  const [label, setLabel] = useState(
    String(node.configuration.label || node.label),
  );
  const [mode, setMode] = useState(
    String(node.configuration.mode ?? "immediate"),
  );
  const [minimum, setMinimum] = useState(String(node.configuration.min ?? ""));
  const [maximum, setMaximum] = useState(String(node.configuration.max ?? ""));
  const [step, setStep] = useState(String(node.configuration.step ?? ""));
  const [showNumber, setShowNumber] = useState(
    node.configuration.showNumber !== false,
  );
  const [fields, setFields] = useState(
    (node.configuration.fields ?? []) as {
      parameter: string;
      label: string;
      widget: string;
    }[],
  );
  const [error, setError] = useState("");
  const errorNotice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorNotice.current?.focus();
  }, [error]);
  const option = options.find((candidate) => candidate.value === selected);
  const schema =
    option &&
    parameterLeaves(option.command.arguments).find(
      (leaf) => leaf.path === option.parameter,
    )?.schema;
  const numeric = schema?.type === "number" || schema?.type === "integer";
  const isNumericControl =
    node.definition === "controls/Slider" ||
    node.definition === "controls/NumberInput";
  const apply = () => {
    try {
      const accepted = change("Configure control", (draft) => {
        const current = requireValue(
          draft.nodes.find((candidate) => candidate.id === node.id),
        );
        current.label = label;
        current.configuration.label = label;
        if (scalar) current.configuration.parameter = option?.parameter ?? "";
        if (!activity)
          current.configuration.mode =
            option?.command.submission === "continuous" ? mode : "submit";
        if (isNumericControl)
          for (const [key, value] of [
            ["min", minimum],
            ["max", maximum],
            ["step", step],
          ]) {
            if (value.trim()) current.configuration[key] = Number(value);
            else delete current.configuration[key];
          }
        if (node.definition === "controls/Slider")
          current.configuration.showNumber = showNumber;
        if (node.definition === "controls/Form")
          current.configuration.fields = fields;
        if (selected !== existing?.value) {
          delete current.configuration.fields;
          draft.connections = draft.connections.filter(
            (c) => !(c.kind === "command" && c.from.node === node.id),
          );
          if (option) {
            draft.connections.push({
              id: `control-binding/${node.id}`,
              kind: "command",
              from: { node: node.id, port: "submit" },
              to: { node: option.target.id, port: option.key },
            });
            if (!activity)
              current.configuration.initial = JSON.stringify(
                acceptedCommandArguments(
                  option.key,
                  option.target.configuration,
                ) ?? schemaDefault(option.command.arguments),
              );
          }
        }
      });
      setError(
        accepted
          ? ""
          : "Control settings were rejected. Check the target and numeric bounds.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save control settings.",
      );
    }
  };
  const currentArgs = option
    ? (acceptedCommandArguments(option.key, option.target.configuration) ??
      schemaDefault(option.command.arguments))
    : undefined;
  let initial = currentArgs;
  try {
    const parsed = JSON.parse(String(node.configuration.initial));
    if (parsed && Object.keys(parsed).length) initial = parsed;
  } catch {
    /* Use the connected model's authored values. */
  }
  return (
    <section className="control-settings">
      {!scalar && (
        <p>
          {activity
            ? "An activity preset with inputs and validation for its matching model."
            : node.definition === "controls/Button"
              ? "This button runs the selected action with the arguments configured below."
              : "A group of fields submitted together to the selected action."}
        </p>
      )}
      <form
        id={`control-settings-${node.id}`}
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <label>
          Label
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <fieldset className="settings-section">
          <legend>
            <BuilderIcon name="composites" /> Connection
          </legend>
          <label>
            {scalar ? "Target parameter" : "Target action"}
            <select
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setMinimum("");
                setMaximum("");
                setStep("");
              }}
            >
              <option value="">
                Choose {scalar ? "a compatible parameter" : "an action"}
              </option>
              {options.map((candidate) => (
                <option key={candidate.value} value={candidate.value}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          {!options.length && (
            <p>
              Add{" "}
              {activity ? activity.model : "a model with a compatible command"}{" "}
              in this canvas group first.
            </p>
          )}
        </fieldset>
        {isNumericControl && (
          <fieldset className="settings-section">
            <legend>
              <BuilderIcon name="controls" /> Range and display
            </legend>
            {numeric && (
              <p>
                Model range: {schema.minimum} to {schema.maximum}. Starting
                value:{" "}
                {String(readParameter(currentArgs, option?.parameter ?? ""))}.
                Set initial state in the model settings.
              </p>
            )}
            <div className="settings-range-grid">
              <label>
                Minimum
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={numeric ? String(schema.minimum) : "From model"}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? `control-settings-error-${node.id}` : undefined
                  }
                  value={minimum}
                  onChange={(event) => setMinimum(event.target.value)}
                />
              </label>
              <label>
                Maximum
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={numeric ? String(schema.maximum) : "From model"}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? `control-settings-error-${node.id}` : undefined
                  }
                  value={maximum}
                  onChange={(event) => setMaximum(event.target.value)}
                />
              </label>
              <label>
                Step
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={schema?.type === "integer" ? "1" : "Any decimal"}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? `control-settings-error-${node.id}` : undefined
                  }
                  value={step}
                  onChange={(event) => setStep(event.target.value)}
                />
              </label>
            </div>
            {node.definition === "controls/Slider" && (
              <label>
                <input
                  type="checkbox"
                  checked={showNumber}
                  onChange={(event) => setShowNumber(event.target.checked)}
                />{" "}
                Show exact number input
              </label>
            )}
          </fieldset>
        )}
        {!activity && node.definition !== "controls/Button" && (
          <label>
            Apply changes
            <select
              value={
                option?.command.submission === "continuous" ? mode : "submit"
              }
              disabled={!option || option.command.submission !== "continuous"}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="immediate">
                As the learner changes the value
              </option>
              <option value="submit">When the learner presses Apply</option>
            </select>
          </label>
        )}
        {links.length > 1 && (
          <p>
            This control also updates {links.length - 1} other connected
            action(s). Choosing a different target replaces those connections.
          </p>
        )}
        {error && (
          <p
            ref={errorNotice}
            id={`control-settings-error-${node.id}`}
            className="settings-form-error"
            role="alert"
            tabIndex={-1}
          >
            {error}
          </p>
        )}
      </form>
      {option &&
        selected === existing?.value &&
        (activity ? (
          <SchemaForm
            key={JSON.stringify(option.target.configuration)}
            schema={publicDefinition(option.target.definition).configuration}
            initial={option.target.configuration}
            label="Activity starting values"
            onSubmit={(configuration) =>
              result(
                change("Edit activity starting values", (draft) => {
                  requireValue(
                    draft.nodes.find(
                      (target) => target.id === option.target.id,
                    ),
                  ).configuration = configuration;
                }),
              )
            }
          />
        ) : !scalar ? (
          <>
            <SchemaForm
              schema={option.command.arguments}
              initial={initial}
              label={
                node.definition === "controls/Button"
                  ? "Action arguments"
                  : "Starting field values"
              }
              onSubmit={(args) =>
                result(
                  change("Edit control arguments", (draft) => {
                    requireValue(
                      draft.nodes.find((target) => target.id === node.id),
                    ).configuration.initial = JSON.stringify(args);
                  }),
                )
              }
            />
            {node.definition === "controls/Form" && (
              <fieldset>
                <legend>Group fields</legend>
                {parameterLeaves(option.command.arguments).map((leaf) => {
                  const field = fields.find(
                    (item) => item.parameter === leaf.path,
                  );
                  const widgets = [
                    "Field",
                    ...["NumberInput", "Slider", "Toggle", "Select"].filter(
                      (widget) =>
                        acceptsScalar(`controls/${widget}`, leaf.schema),
                    ),
                  ];
                  const update = (settings: {
                    label?: string;
                    widget?: string;
                  }) =>
                    setFields([
                      ...fields.filter((item) => item.parameter !== leaf.path),
                      {
                        parameter: leaf.path,
                        label: leaf.path.replace(/^value\./, ""),
                        widget: "Field",
                        ...field,
                        ...settings,
                      },
                    ]);
                  return (
                    <div key={leaf.path}>
                      <label>
                        {leaf.path} label
                        <input
                          value={
                            field?.label ?? leaf.path.replace(/^value\./, "")
                          }
                          onChange={(event) =>
                            update({ label: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Input style
                        <select
                          value={field?.widget ?? "Field"}
                          onChange={(event) =>
                            update({ widget: event.target.value })
                          }
                        >
                          {widgets.map((widget) => (
                            <option key={widget} value={widget}>
                              {widget === "Field"
                                ? "Automatic"
                                : widget === "NumberInput"
                                  ? "Number input"
                                  : widget}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                })}
              </fieldset>
            )}
          </>
        ) : null)}
    </section>
  );
}
