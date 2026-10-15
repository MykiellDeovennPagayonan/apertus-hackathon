import type { Snapshot } from "../../creation-and-editing/runtime-engine/DocumentRuntime";
import type { AuthoredDocument } from "../../creation-and-editing/authoring-engine/document";
import { publicDefinition } from "../index";

export function readoutLabel(
  configuredLabel: string,
  sourceDefinition?: string,
  output?: string,
  unit = "",
) {
  return sourceDefinition === "prefabs/physical-systems/Pendulum" && output === "period"
    ? "Time for one full swing"
    : sourceDefinition === "prefabs/physical-systems/ResistiveCircuit" && output === "bulbPower"
      ? "Power per bulb · brightness proxy"
      : unit && configuredLabel.endsWith(` ${unit}`)
        ? configuredLabel.slice(0, -unit.length - 1)
        : configuredLabel;
}

/** Resolve a display's first validated value binding consistently across renderers. */
export function boundObservation(
  document: AuthoredDocument,
  snapshot: Snapshot,
  nodeId: string,
) {
  const binding = document.connections.find(
    (connection) =>
      connection.kind === "value" && connection.to.node === nodeId,
  );
  const source = document.nodes.find((node) => node.id === binding?.from.node);
  const value = binding
    ? snapshot.outputs[binding.from.node]?.[binding.from.port]
    : undefined;
  const rawUnit =
    source && binding
      ? publicDefinition(source).outputs[binding.from.port]?.unit
      : undefined;
  return {
    binding,
    source,
    value,
    unit: rawUnit && rawUnit !== "1" && rawUnit !== "*" ? rawUnit : "",
    needsBridgeSelection:
      source?.definition === "models/BridgeResponse" &&
      binding?.from.port === "selected" &&
      (!value || typeof value === "string"),
  };
}
