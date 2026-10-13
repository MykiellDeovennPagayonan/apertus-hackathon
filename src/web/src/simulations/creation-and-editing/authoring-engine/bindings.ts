import { publicDefinition } from "../../registry/index";
import { createPublicNode } from "../../registry/recipes/modelRecipe";
import { schemaDefault } from "../../registry/contracts/defaults";
import { acceptedCommandArguments } from "../../registry/contracts/commandPresentation";
import {
  acceptsScalar,
  activityContract,
  parameterLeaves,
} from "../../registry/contracts/controlContract";
import { DocumentRuntime } from "../runtime-engine/DocumentRuntime";
import { type AuthoredDocument, emptyLayout } from "./document";

export type ControlRequest = {
  target: string;
  command: string;
  field: string;
  widget: "slider" | "number" | "toggle" | "select" | "button";
  label: string;
};
export type ObservationRequest = {
  source: string;
  output: string;
  widget: "readout" | "inspector";
  label: string;
};
const widgets = {
  slider: "Slider",
  number: "NumberInput",
  toggle: "Toggle",
  select: "Select",
  button: "Button",
};

/** Offer the same control decisions that authoring can actually accept. */
export function hasBoundControl(
  document: AuthoredDocument,
  targetId: string,
  command: string,
  field: string,
) {
  const target = document.nodes.find((node) => node.id === targetId);
  if (!target) return false;
  return document.connections.some((connection) => {
    if (connection.kind !== "command" || connection.to.node !== targetId)
      return false;
    const control = document.nodes.find(
      (node) => node.id === connection.from.node,
    );
    if (!control) return false;
    const activity = activityContract(control.definition);
    const parameter =
      control.configuration.parameter ??
      publicDefinition(control).defaults.parameter;
    const leaves = parameterLeaves(
      publicDefinition(target).commands[connection.to.port].arguments,
    ).filter((leaf) => acceptsScalar(control.definition, leaf.schema));
    const boundField =
      parameter ||
      (leaves.length === 1
        ? leaves[0].path
        : control.definition === "controls/Button"
          ? ""
          : undefined);
    return (
      (connection.to.port === command ||
        activity?.model === target.definition) &&
      (!!activity || boundField === field)
    );
  });
}

/** Uses accepted target arguments, including siblings, rather than definition creation defaults. */
export function addBoundControl(
  document: AuthoredDocument,
  request: ControlRequest,
  id: string,
) {
  const next = structuredClone(document);
  const target = next.nodes.find((n) => n.id === request.target);
  if (!target) throw new Error("Unknown control target");
  const command = publicDefinition(target).commands[request.command];
  if (!command) throw new Error("Unsupported command");
  const definition = `controls/${widgets[request.widget]}`;
  const leaf = parameterLeaves(command.arguments).find(
    (p) => p.path === request.field,
  );
  if (
    request.widget !== "button" &&
    (!leaf || !acceptsScalar(definition, leaf.schema))
  )
    throw new Error("Widget does not accept this command field");
  if (
    request.widget === "button" &&
    (request.field ||
      (command.arguments.type === "object" &&
        Object.keys(command.arguments.properties).length))
  )
    throw new Error("An action with arguments needs a bound field control");
  if (hasBoundControl(next, target.id, request.command, request.field))
    throw new Error("This decision already has a learner control");
  const state = new DocumentRuntime(document).getSnapshot().state[target.id];
  const initial =
    acceptedCommandArguments(request.command, state) ??
    schemaDefault(command.arguments);
  const node = createPublicNode(definition, id, target.scope);
  node.label = request.label;
  Object.assign(node.configuration, {
    label: request.label,
    initial: JSON.stringify(initial),
    mode:
      command.submission === "explicit" || request.widget === "button"
        ? "submit"
        : "immediate",
  });
  if (request.widget !== "button") node.configuration.parameter = request.field;
  if (request.widget === "slider")
    Object.assign(node.configuration, {
      showNumber: true,
      step: leaf?.schema.type === "integer" ? 1 : 0.1,
    });
  next.nodes.push(node);
  next.layout.children.push({ ...emptyLayout(`layout/${id}`), node: id });
  next.connections.push({
    id: `binding/${id}`,
    kind: "command",
    from: { node: id, port: "submit" },
    to: { node: target.id, port: request.command },
  });
  return next;
}

export function addBoundObservation(
  document: AuthoredDocument,
  request: ObservationRequest,
  id: string,
) {
  const next = structuredClone(document);
  const source = next.nodes.find((n) => n.id === request.source);
  if (!source) throw new Error("Unknown observation source");
  const port = publicDefinition(source).outputs[request.output];
  if (!port || port.kind !== "value")
    throw new Error("Observation requires a declared value output");
  const output = new DocumentRuntime(document).getSnapshot().outputs[
    source.id
  ]?.[request.output];
  if (
    request.widget === "readout" &&
    typeof output !== "number" &&
    request.output !== "board"
  )
    throw new Error(
      "A numeric readout cannot display a structured or unavailable output",
    );
  const node = createPublicNode(
    request.widget === "readout" ? "displays/Readout" : "displays/Inspector",
    id,
    source.scope,
  );
  node.label = request.label;
  node.configuration = { label: request.label, precision: 2 };
  next.nodes.push(node);
  next.layout.children.push({ ...emptyLayout(`layout/${id}`), node: id });
  next.connections.push({
    id: `binding/${id}`,
    kind: "value",
    from: { node: source.id, port: request.output },
    to: { node: id, port: "value" },
  });
  return next;
}
