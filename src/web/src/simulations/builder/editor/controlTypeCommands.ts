import { publicDefinition } from "../../components/catalog";
import { schemaDefault } from "../../components/composites/catalog";
import { acceptedCommandArguments } from "../../components/controls/commandPresentation";
import {
  acceptsScalar,
  parameterLeaves,
  scalarControls,
} from "../../components/controls/controlContract";
import { requireValue } from "../../runtime/authoring/requireValue";
import type {
  AuthoredDocument,
  ComponentInstance,
} from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";

export const interchangeableControls = [
  "controls/Slider",
  "controls/NumberInput",
  "controls/Toggle",
  "controls/Select",
  "controls/Button",
  "controls/Form",
  "controls/TextInput",
  "controls/EntityPicker",
];

export function controlTypeCompatibility(
  document: AuthoredDocument,
  node: ComponentInstance,
  definition: string,
) {
  if (!interchangeableControls.includes(definition))
    return {
      reason: "Activity presets have a dedicated model contract.",
      parameters: [] as string[],
    };
  const connections = document.connections.filter(
    (c) => c.kind === "command" && c.from.node === node.id && !c.arguments,
  );
  if (
    !connections.length &&
    definition !== "controls/Button" &&
    document.connections.some(
      (c) => c.kind === "command" && c.from.node === node.id && c.arguments,
    )
  )
    return {
      reason:
        "These connections send fixed arguments. Change the target binding before choosing an input control.",
      parameters: [] as string[],
    };
  const commands = connections.map((connection) => {
    const target = document.nodes.find((n) => n.id === connection.to.node);
    return (
      target && publicDefinition(target).commands[connection.to.port]
    );
  });
  if (commands.some((command) => !command))
    return {
      reason: "The connected action is unavailable.",
      parameters: [] as string[],
    };
  if (!commands.length) return { reason: "", parameters: [] as string[] };
  if (scalarControls.has(definition)) {
    const paths = commands.map((command) =>
      parameterLeaves(requireValue(command).arguments)
        .filter((leaf) => acceptsScalar(definition, leaf.schema))
        .map((leaf) => leaf.path),
    );
    const parameters = paths[0].filter((path) =>
      paths.every((other) => other.includes(path)),
    );
    // Preserve an explicit scalar binding rather than silently changing its meaning.
    const existing = scalarControls.has(node.definition)
      ? String(node.configuration.parameter ?? "")
      : "";
    if (existing && !parameters.includes(existing))
      return {
        reason: "This type cannot edit the currently bound parameter.",
        parameters: [] as string[],
      };
    return {
      reason: parameters.length
        ? ""
        : "The connected actions have no compatible shared parameter.",
      parameters,
    };
  }
  if (
    definition === "controls/TextInput" ||
    definition === "controls/EntityPicker"
  ) {
    const valid = commands.every((command) => {
      const leaves = parameterLeaves(requireValue(command).arguments);
      return (
        leaves.length === 1 &&
        leaves[0].schema.type === "string" &&
        (definition !== "controls/EntityPicker" ||
          !leaves[0].path.includes("."))
      );
    });
    return {
      reason: valid
        ? ""
        : "Requires one text argument; an entity picker submits a component ID.",
      parameters: [] as string[],
    };
  }
  return { reason: "", parameters: [] as string[] };
}

/** Replace the widget atomically, retaining its identity, placement and every wire. */
export function changeControlType(
  document: AuthoredDocument,
  id: string,
  definition: string,
  parameter = "",
) {
  const next = structuredClone(document);
  const node = next.nodes.find((candidate) => candidate.id === id);
  if (!node || !interchangeableControls.includes(node.definition))
    throw new Error("Choose a basic control.");
  if (node.definition === definition) return next;
  const compatibility = controlTypeCompatibility(next, node, definition);
  if (compatibility.reason) throw new Error(compatibility.reason);
  const old = node.configuration;
  const source = node.definition;
  const targetDefinition = publicDefinition(definition);
  const configuration = structuredClone(targetDefinition.defaults);
  configuration.label = old.label ?? node.label;
  configuration.mode = old.mode ?? configuration.mode;
  const connection = next.connections.find(
    (c) => c.kind === "command" && c.from.node === id && !c.arguments,
  );
  const target = next.nodes.find((n) => n.id === connection?.to.node);
  const command =
    target &&
    connection &&
    publicDefinition(target).commands[connection.to.port];
  configuration.initial = typeof old.initial === "string" ? old.initial : "{}";
  if (target && connection && command) {
    let initial: Record<string, unknown> = {};
    try {
      initial = JSON.parse(String(configuration.initial));
    } catch {
      /* Use authored command values. */
    }
    if (!initial || typeof initial !== "object" || !Object.keys(initial).length)
      configuration.initial = JSON.stringify(
        acceptedCommandArguments(connection.to.port, target.configuration) ??
          schemaDefault(command.arguments),
      );
  }
  if (scalarControls.has(definition) && compatibility.parameters.length) {
    const path =
      parameter ||
      String(old.parameter ?? "") ||
      (compatibility.parameters.length === 1
        ? compatibility.parameters[0]
        : "");
    if (!compatibility.parameters.includes(path))
      throw new Error("Choose the parameter for the new control.");
    configuration.parameter = path;
  }
  if (
    ["controls/Slider", "controls/NumberInput"].includes(source) &&
    ["controls/Slider", "controls/NumberInput"].includes(definition)
  )
    for (const key of ["min", "max", "step"])
      if (old[key] !== undefined) configuration[key] = old[key];
  if (definition === "controls/Slider" && old.showNumber !== undefined)
    configuration.showNumber = old.showNumber;
  if (definition === "controls/Form" && command) {
    configuration.fields = parameterLeaves(command.arguments).map((leaf) => ({
      parameter: leaf.path,
      label: leaf.path.replace(/^value\./, ""),
      widget: acceptsScalar(source, leaf.schema)
        ? source.split("/")[1]
        : "Field",
    }));
  }
  if (
    definition === "controls/EntityPicker" ||
    definition === "controls/TextInput"
  )
    configuration.targetDefinition = old.targetDefinition ?? "";
  node.definition = definition;
  node.version = targetDefinition.version;
  node.configuration = configuration;
  validateAuthoredDocument(next);
  return next;
}
