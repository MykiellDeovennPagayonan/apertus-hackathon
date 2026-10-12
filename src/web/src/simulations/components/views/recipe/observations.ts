import type { Snapshot } from "../../../runtime/authoring/runtime";
import type { AuthoredDocument } from "../../../runtime/authoring/types";
import { publicDefinition } from "../../catalog";

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
