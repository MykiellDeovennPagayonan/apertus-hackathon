import { publicDefinition } from "../../components/catalog";
import {
  acceptsScalar,
  activityContracts,
  legacyActivities,
  parameterLeaves,
  scalarControls,
} from "../../components/controls/controlContract";
import { validateValue } from "../parameterSchema";
import type { AuthoredDocument, CompositeRecipe } from "./types";

export function migrateControlDependencies(
  original: AuthoredDocument,
  migrated: AuthoredDocument,
  dependencies: CompositeRecipe["dependencies"],
) {
  const replacements = new Map<string, string>();
  for (const node of original.nodes) {
    const next = migrated.nodes.find((item) => item.id === node.id);
    if (next && next.definition !== node.definition)
      replacements.set(node.definition, next.definition);
  }
  return [
    ...new Map(
      dependencies.map((dependency) => {
        const updated = {
          ...dependency,
          id: replacements.get(dependency.id) ?? dependency.id,
        };
        return [`${updated.id}@${updated.version}`, updated] as const;
      }),
    ).values(),
  ];
}

/** Upgrade saved activity aliases without changing node IDs, wires or placement. */
export function migrateControls(document: AuthoredDocument): AuthoredDocument {
  const upgraded = structuredClone(document);
  if (
    !upgraded ||
    upgraded.formatVersion !== 3 ||
    !Array.isArray(upgraded.nodes) ||
    !Array.isArray(upgraded.connections)
  )
    return upgraded;
  for (const node of upgraded.nodes) {
    if (!node || typeof node.definition !== "string" || !node.configuration)
      continue;
    // Older generic sliders could render a whole compound command. Preserve
    // those fields as an explicitly composed group rather than choosing one.
    if (
      scalarControls.has(node.definition) &&
      !Object.hasOwn(node.configuration, "parameter")
    ) {
      const link = upgraded.connections.find(
        (c) => c.kind === "command" && c.from.node === node.id && !c.arguments,
      );
      const target = upgraded.nodes.find(
        (candidate) => candidate.id === link?.to.node,
      );
      const command =
        target &&
        link &&
        publicDefinition(target).commands[
          link.to.port
        ];
      const leaves = command ? parameterLeaves(command.arguments) : [];
      if (leaves.length > 1) {
        const widget = node.definition.split("/")[1];
        const label = String(node.configuration.label || node.label);
        node.definition = "controls/Form";
        node.label = [widget, "Number input"].includes(label)
          ? "Control group"
          : label;
        node.configuration = {
          label: node.label,
          mode: node.configuration.mode,
          initial: node.configuration.initial,
          fields: leaves.map((leaf) => ({
            parameter: leaf.path,
            label: leaf.path.replace(/^value\./, "").replaceAll(".", " "),
            widget: acceptsScalar(`controls/${widget}`, leaf.schema)
              ? widget
              : leaf.schema.type === "boolean"
                ? "Toggle"
                : leaf.schema.type === "enum"
                  ? "Select"
                  : "Field",
          })),
        };
      }
    }
    const name = node.definition.split("/")[1];
    const replacement = node.definition.startsWith("controls/")
      ? legacyActivities[name]
      : undefined;
    if (replacement) {
      validateValue(
        publicDefinition(node).configuration,
        node.configuration,
      );
      node.definition = `controls/${replacement}`;
      const previous = String(node.configuration.label || node.label);
      const label = [
        name,
        "Explore",
        name.replace(/([a-z])([A-Z])/g, "$1 $2"),
      ].includes(previous)
        ? activityContracts[replacement].title
        : previous;
      node.label = label;
      node.configuration = { label };
    } else if (node.definition === "controls/ExplorationTask") {
      validateValue(
        publicDefinition(node).configuration,
        node.configuration,
      );
      const connection = upgraded.connections.find(
        (c) => c.kind === "command" && c.from.node === node.id,
      );
      const target = upgraded.nodes.find(
        (candidate) => candidate.id === connection?.to.node,
      );
      const groups: Record<
        string,
        {
          command: string;
          title: string;
          fields: { parameter: string; label: string; widget: string }[];
        }
      > = {
        "models/coordinates": {
          command: "MOVE_POINT",
          title: "Point position",
          fields: [
            { parameter: "value.x", label: "X coordinate", widget: "Slider" },
            { parameter: "value.y", label: "Y coordinate", widget: "Slider" },
          ],
        },
        "models/area-perimeter": {
          command: "SET_DIMENSIONS",
          title: "Rectangle dimensions",
          fields: [
            { parameter: "value.width", label: "Width · m", widget: "Slider" },
            {
              parameter: "value.height",
              label: "Height · m",
              widget: "Slider",
            },
          ],
        },
        "models/ratio": {
          command: "SET_RATIO",
          title: "Ratio values",
          fields: [
            {
              parameter: "value.numerator",
              label: "Selected amount",
              widget: "Slider",
            },
            {
              parameter: "value.denominator",
              label: "Whole amount",
              widget: "NumberInput",
            },
          ],
        },
      };
      const group = target && groups[target.definition];
      if (!group || connection?.to.port !== group.command) continue;
      node.definition = "controls/Form";
      const previous = String(node.configuration.label || node.label);
      node.label = ["Explore", "ExplorationTask", "Exploration task"].includes(
        previous,
      )
        ? group.title
        : previous;
      node.configuration = {
        ...node.configuration,
        label: node.label,
        mode: "immediate",
        fields: group.fields,
      };
    }
  }
  return upgraded;
}
