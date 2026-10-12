import { publicDefinition } from "../../components/catalog";
import {
  automaticGraphPositions,
  graphRole,
} from "../../runtime/authoring/graphLayout";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { Endpoint, Port } from "../../runtime/authoring/types";
import type { ExperimentDocument } from "../document";
import type { GraphNode, GraphPort, GraphWire, MovingBlock } from "./types";

export const portLabel = (name: string) =>
  name
    .replace(/^set:/, "Set ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
const graphPort = (id: string, p: Port): GraphPort => ({
  id,
  label: portLabel(id),
  connectable: true,
  type:
    p.kind === "event" || p.kind === "command"
      ? "action"
      : p.kind === "attachment"
        ? "placement"
        : "data",
});
export function resolveGraphEndpoint(
  doc: ExperimentDocument,
  endpoint: Endpoint,
): Endpoint {
  if (!doc.authored?.groups.some((g) => g.id === endpoint.node))
    return endpoint;
  const group = requireValue(
    doc.authored?.groups.find((g) => g.id === endpoint.node),
  );
  const parsed: unknown = JSON.parse(endpoint.port);
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    parsed.some((v) => typeof v !== "string") ||
    !group.members.includes(parsed[0])
  )
    throw new Error("Choose a valid composite port");
  return { node: parsed[0], port: parsed[1] };
}
export function authoredGraph(
  doc: ExperimentDocument,
  moving: MovingBlock | null,
  saved: boolean,
) {
  const d = requireValue(doc.authored);
  const collapsed = d.groups.filter((group) => {
    if (!group.collapsed) return false;
    let parent = group.parent;
    const visited = new Set<string>();
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      const ancestor = d.groups.find((g) => g.id === parent);
      if (ancestor?.collapsed) return false;
      parent = ancestor?.parent;
    }
    return true;
  });
  const owner = (id: string) => collapsed.find((g) => g.members.includes(id));
  const blocks: GraphNode[] = [...d.nodes, ...d.resources]
    .filter((n) => !owner(n.id) && n.definition !== "displays/Box")
    .map((n) => {
      const def = publicDefinition(n);
      return {
        id: n.id,
        label: n.label,
        componentType: def.title,
        kind: graphRole[def.category] as GraphNode["kind"],
        displayKind: def.discovery?.kind === "object" ? "Object" : undefined,
        description: def.description,
        inputs: [
          ...Object.entries(def.inputs).map(([id, p]) => graphPort(id, p)),
          ...Object.entries(def.commands).map(([id, c]) => ({
            id,
            label: c.description,
            type: "action" as const,
            connectable: true,
          })),
        ],
        outputs: Object.entries(def.outputs).map(([id, p]) => graphPort(id, p)),
        x: 0,
        y: 0,
      };
    });
  for (const group of collapsed) {
    const inputs: GraphPort[] = [],
      outputs: GraphPort[] = [];
    for (const exposed of group.exposedPorts ?? []) {
      const id = JSON.stringify([exposed.endpoint.node, exposed.endpoint.port]);
      const list = exposed.direction === "input" ? inputs : outputs;
      list.push({ ...graphPort(id, exposed.port), label: exposed.name });
    }
    // Boundary ports remain real child endpoints. Collapsing is only a graph projection.
    for (const c of d.connections) {
      const insideFrom = group.members.includes(c.from.node),
        insideTo = group.members.includes(c.to.node);
      if (insideFrom === insideTo) continue;
      const e = insideTo ? c.to : c.from;
      const n = requireValue(
        [...d.nodes, ...d.resources].find((n) => n.id === e.node),
      );
      const def = publicDefinition(n);
      const p = (insideTo ? def.inputs : def.outputs)[e.port] ?? {
        kind: "command",
        unit: "",
      };
      const list = insideTo ? inputs : outputs;
      const id = JSON.stringify([e.node, e.port]);
      if (!list.some((p) => p.id === id))
        list.push({
          ...graphPort(id, p),
          label: `${n.label}: ${portLabel(e.port)}`,
        });
    }
    blocks.push({
      id: group.id,
      label: group.label,
      kind: "Composite",
      description: `${group.members.length} components · Edit to expand`,
      inputs,
      outputs,
      x: 0,
      y: 0,
    });
  }
  const arranged = automaticGraphPositions(blocks);
  for (const block of blocks) Object.assign(block, arranged[block.id]);
  for (const n of blocks)
    Object.assign(
      n,
      saved ? doc.editor.positions[n.id] : {},
      moving?.id === n.id ? moving : {},
    );
  const wires: GraphWire[] = d.connections.flatMap((c) => {
    const a = owner(c.from.node),
      b = owner(c.to.node);
    if (a && a.id === b?.id) return [];
    return [
      {
        from: a?.id ?? c.from.node,
        to: b?.id ?? c.to.node,
        fromPort: a ? JSON.stringify([c.from.node, c.from.port]) : c.from.port,
        toPort: b ? JSON.stringify([c.to.node, c.to.port]) : c.to.port,
        type:
          c.kind === "command"
            ? "action"
            : c.kind === "attachment"
              ? "placement"
              : "data",
        label: portLabel(c.to.port),
      },
    ];
  });
  return {
    blocks,
    wires,
    node: (id: string) => blocks.find((n) => n.id === id),
  };
}
