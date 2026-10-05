export type MovingBlock = { id: string; x: number; y: number };
export type ConnectionType = "action" | "data" | "placement";
export type GraphPort = {
  id: string;
  label: string;
  type: ConnectionType;
  connectable?: boolean;
};
export type GraphNode = {
  id: string;
  label: string;
  kind:
    | "Object"
    | "Control"
    | "Result"
    | "View"
    | "Lesson"
    | "Placement"
    | "Behavior"
    | "Composite"
    | "Resource";
  description: string;
  inputs: GraphPort[];
  outputs: GraphPort[];
  x: number;
  y: number;
};
export type GraphWire = {
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  type: ConnectionType;
  label: string;
};
export const NODE_WIDTH = 248;
export const NODE_HEADER = 96;
export const PORT_HEIGHT = 40;
export function portPoint(
  node: GraphNode,
  id: string,
  side: "input" | "output",
) {
  const ports = side === "input" ? node.inputs : node.outputs;
  const index = Math.max(
    0,
    ports.findIndex((port) => port.id === id),
  );
  return {
    x: node.x + (side === "output" ? NODE_WIDTH : 0),
    y: node.y + NODE_HEADER + index * PORT_HEIGHT + PORT_HEIGHT / 2,
  };
}
