import { publicDefinition } from "../../simulations/components/catalog";
import { compositionRequirements } from "../../simulations/components/catalog/explorationTeaching";
import {
  acceptsScalar,
  parameterLeaves,
} from "../../simulations/components/controls/controlContract";
import type { AuthoredDocument } from "../../simulations/runtime/authoring/types";
import type { ComponentBucketCard } from "./bucket";
import type { AllowedTurnTool } from "./turnSchema";

/** Narrow schemas to the next unresolved graph responsibility, not to a prompt phrase. */
export function focusCompositionTools(
  document: AuthoredDocument,
  bucket: ComponentBucketCard[],
  tools: AllowedTurnTool[],
  root: string,
): AllowedTurnTool[] {
  const property = (tool: AllowedTurnTool, key: string): unknown => {
    const schema =
      tool.schema.type === "object" ? tool.schema.properties[key] : undefined;
    return schema?.type === "enum" ? schema.values[0] : undefined;
  };
  const required = new Set<string>();
  const visit = (id: string) => {
    if (required.has(id)) return;
    required.add(id);
    for (const dep of compositionRequirements[id]?.dependencies ?? [])
      visit(dep);
  };
  visit(root);
  for (const id of required) {
    const count = document.nodes.filter((n) => n.definition === id).length;
    const minimum = compositionRequirements[id]?.minimumInstances ?? 1;
    if (count < minimum)
      return tools.filter(
        (t) =>
          t.tool === "insert_component" && property(t, "definition") === id,
      );
  }
  for (const node of document.nodes) {
    const requirement = compositionRequirements[node.definition];
    if (!requirement) continue;
    if (
      requirement.appearance &&
      !document.nodes.some((n) => n.definition === requirement.appearance)
    )
      return tools.filter(
        (t) =>
          t.tool === "insert_component" &&
          property(t, "definition") === requirement.appearance,
      );
  }
  // Required data/appearance ports must be resolved before adding observations.
  const unbound = document.nodes.flatMap((n) =>
    Object.entries(publicDefinition(n.definition).inputs)
      .filter(
        ([port, contract]) =>
          !contract.optional &&
          !document.connections.some(
            (c) => c.to.node === n.id && c.to.port === port,
          ),
      )
      .map(([port]) => ({ node: n.id, port })),
  );
  if (unbound.length) {
    const next = unbound[0];
    return tools
      .filter(
        (t) =>
          t.tool === "connect" &&
          t.schema.type === "object" &&
          t.schema.properties.to.type === "object" &&
          JSON.stringify(t.schema.properties.to.properties.node) ===
            JSON.stringify({ type: "enum", values: [next.node] }) &&
          JSON.stringify(t.schema.properties.to.properties.port) ===
            JSON.stringify({ type: "enum", values: [next.port] }),
      )
      .filter((t) => {
        if (
          document.nodes.find((n) => n.id === next.node)?.definition !==
          "data/SignalSuperposition"
        )
          return true;
        if (
          t.schema.type !== "object" ||
          t.schema.properties.from.type !== "object"
        )
          return false;
        const source = t.schema.properties.from.properties.node;
        return (
          source.type === "enum" &&
          !document.connections.some(
            (c) => c.to.node === next.node && c.from.node === source.values[0],
          )
        );
      });
  }
  for (const node of document.nodes) {
    const requirement = compositionRequirements[node.definition];
    if (!requirement) continue;
    for (const command of requirement.commands)
      if (
        !document.connections.some(
          (c) =>
            c.kind === "command" &&
            c.to.node === node.id &&
            c.to.port === command,
        )
      )
        return tools
          .filter(
            (t) =>
              t.tool === "add_control" &&
              property(t, "target") === node.id &&
              property(t, "command") === command,
          )
          .map((t) => {
            const fields = parameterLeaves(
              publicDefinition(node.definition).commands[command].arguments,
            );
            const field = fields[0];
            const options = field
              ? ["slider", "number", "toggle", "select"].filter((widget) =>
                  acceptsScalar(
                    `controls/${({ slider: "Slider", number: "NumberInput", toggle: "Toggle", select: "Select" } as Record<string, string>)[widget]}`,
                    field.schema,
                  ),
                )
              : ["button"];
            return t.schema.type === "object"
              ? {
                  ...t,
                  schema: {
                    ...t.schema,
                    properties: {
                      ...t.schema.properties,
                      widget: { type: "enum" as const, values: options },
                    },
                  },
                }
              : t;
          });
    for (const output of requirement.observations)
      if (
        !document.connections.some(
          (c) =>
            c.kind === "value" &&
            c.from.node === node.id &&
            c.from.port === output,
        )
      )
        return tools
          .filter(
            (t) =>
              t.tool === "add_observation" && property(t, "source") === node.id,
          )
          .map((t) =>
            t.schema.type === "object"
              ? {
                  ...t,
                  schema: {
                    ...t.schema,
                    properties: {
                      ...t.schema.properties,
                      output: { type: "enum" as const, values: [output] },
                      widget: {
                        type: "enum" as const,
                        values:
                          publicDefinition(node.definition).outputs[output]
                            .schema?.type === "string"
                            ? ["inspector"]
                            : ["readout", "inspector"],
                      },
                    },
                  },
                }
              : t,
          );
  }
  const supported = new Set(bucket.map((c) => c.id));
  return tools.filter(
    (t) =>
      ["configure", "set_lesson", "arrange"].includes(t.tool) ||
      (t.tool === "insert_component" &&
        supported.has(String(property(t, "definition"))) &&
        !required.has(String(property(t, "definition")))),
  );
}
