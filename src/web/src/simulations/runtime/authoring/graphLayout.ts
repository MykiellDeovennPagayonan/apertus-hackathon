import type { PublicDefinition } from "./types";

export const graphRole: Record<PublicDefinition["category"], string> = {
  models: "Object",
  controls: "Control",
  displays: "Result",
  canvases: "View",
  appearance: "Placement",
  behaviors: "Behavior",
  resources: "Resource",
  layout: "Placement",
};

/** Deterministic graph placement shared by headless construction and the editor. */
export function automaticGraphPositions(
  blocks: {
    id: string;
    kind: string;
    inputs: readonly unknown[];
    outputs: readonly unknown[];
  }[],
) {
  const positions: Record<string, { x: number; y: number }> = {};
  let x = 48;
  for (const kind of [
    "Composite",
    "Control",
    "Object",
    "View",
    "Result",
    "Behavior",
    "Placement",
    "Resource",
  ]) {
    let y = 80;
    const column = blocks.filter((node) => node.kind === kind);
    for (const node of column) {
      const height =
        96 +
        Math.max(node.inputs.length, node.outputs.length, 1) * 40 +
        (kind === "Object" ? 48 : 0);
      if (y + height > 2900) {
        x += 340;
        y = 80;
      }
      positions[node.id] = { x, y };
      y += height + 70;
    }
    if (column.length) x += 360;
  }
  return positions;
}
