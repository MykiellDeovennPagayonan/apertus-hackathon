import type {
  GraphNode,
  GraphPort,
  GraphWire,
  MovingBlock,
} from "../connections";
import type { ExperimentDocument } from "../document";
import { requireRecord } from "../records";
import {
  actions,
  canvasNames,
  isPairOutput,
  outputSpec,
  pairKind,
} from "./definitions";
import {
  type CompositionScene,
  formatHour,
  outputs,
  properties,
  propertyValue,
} from "./model";
import {
  canvasFor,
  canvasTarget,
  clockTarget,
  controlDefaults,
} from "./workspace";

const port = (
  id: string,
  label: string,
  type: GraphPort["type"],
): GraphPort => ({ id, label, type, connectable: true });
export type Endpoint = {
  node: string;
  port: string;
};
export function compositionGraph(
  doc: ExperimentDocument,
  moving: MovingBlock | null = null,
  saved = true,
) {
  const s = requireRecord(doc.scene),
    w = requireRecord(s.workspace);
  const nodes: GraphNode[] = [],
    wires: GraphWire[] = [];
  const wire = (
    from: string,
    fromPort: string,
    to: string,
    toPort: string,
    type: GraphWire["type"],
    label: string,
  ) => wires.push({ from, fromPort, to, toPort, type, label });
  s.controls.forEach((c, i) => {
    nodes.push({
      id: c.id,
      label: c.label,
      kind: "Control",
      description: c.target
        ? `${c.widget} · learner changes`
        : "Connect to an editable property",
      inputs: [],
      outputs: [
        port(
          "value",
          c.widget === "button"
            ? "Action"
            : c.widget === "toggle"
              ? "On / off"
              : "Value",
          "action",
        ),
      ],
      x: 48,
      y: 80 + i * 180,
    });
    if (c.target)
      wire(
        c.id,
        "value",
        c.target.startsWith("clock/")
          ? c.target.slice(6)
          : c.target.startsWith("canvas/")
            ? c.target.slice(7)
            : c.target,
        `${c.widget === "button" ? "action" : "property"}:${c.property}`,
        "action",
        c.property,
      );
  });
  s.objects.forEach((o, i) => {
    const c = canvasFor(s, o.id);
    nodes.push({
      id: o.id,
      label: o.label,
      kind: "Object",
      description: c
        ? `${o.kind} · ${c.label}`
        : `${o.kind} · connect to a canvas`,
      inputs: [
        ...Object.entries(properties(o)).map(([key, p]) =>
          port(
            `property:${key}`,
            p.label + (p.unit ? ` (${p.unit})` : ""),
            "action",
          ),
        ),
        ...Object.entries(actions(o)).map(([key, spec]) =>
          port(`action:${key}`, spec.label, "action"),
        ),
      ],
      outputs: [
        port(
          "geometry",
          o.kind === "line" || o.kind === "square" ? "Geometry" : "Object",
          "placement",
        ),
        ...Object.entries(outputs(o))
          .filter(
            ([key]) =>
              !isPairOutput(key) &&
              (o.kind !== "line" ||
                ["equation", "slope", "intercept"].includes(key) ||
                s.measurements.some(
                  (m) => m.target === o.id && m.output === key,
                )),
          )
          .map(([key, label]) => port(`output:${key}`, label, "data")),
        ...(o.kind === "line"
          ? [port("line", "Line", "data")]
          : o.kind === "fraction-bar"
            ? [port("fraction-bar", "Fraction bar", "data")]
            : []),
        ...(o.kind === "person" ? [port("person", "Person", "action")] : []),
        ...(o.kind === "building"
          ? [port("destination", "Destination", "action")]
          : []),
      ],
      x: 410,
      y: 80 + i * 440,
    });
    if (c) wire(o.id, "geometry", c.id, "objects", "placement", "Display");
  });
  w.canvases.forEach((c, i) => {
    nodes.push({
      id: c.id,
      label: c.label,
      kind: "View",
      description:
        c.kind === "cartesian"
          ? "Empty axes + connected geometry"
          : c.kind === "town"
            ? "Space for connected town objects"
            : `Empty ${canvasNames[c.kind].toLowerCase()} + connected objects`,
      inputs: [
        port("action:reset", "Reset", "action"),
        port(
          "objects",
          c.kind === "cartesian" ? "Geometry" : "Objects",
          "placement",
        ),
        ...(c.kind === "town"
          ? Object.entries(properties(undefined)).map(([key, p]) =>
              port(`property:${key}`, p.label, "action"),
            )
          : []),
      ],
      outputs:
        c.kind === "town"
          ? Object.entries(outputs(undefined)).map(([key, label]) =>
              port(`output:${key}`, label, "data"),
            )
          : [],
      x: 790,
      y: 80 + i * 370,
    });
  });
  s.measurements.forEach((m, i) => {
    const intersection = isPairOutput(m.output);
    const pair = m.output === "comparison" ? "bar" : "line";
    nodes.push({
      id: m.id,
      label: m.label,
      kind: "Result",
      description: intersection
        ? m.output === "comparison"
          ? "Comparison of two fraction bars"
          : "Intersection of two lines"
        : m.target
          ? `Readout · ${m.output}`
          : "Connect a calculated output",
      inputs: intersection
        ? [
            port("first", `First ${pair}`, "data"),
            port("second", `Second ${pair}`, "data"),
          ]
        : [port("data", "Value", "data")],
      outputs: [],
      x: 1170,
      y: 80 + i * 210,
    });
    if (m.target)
      wire(
        m.target.startsWith("clock/") ? m.target.slice(6) : m.target,
        intersection ? pairKind(m.output) : `output:${m.output}`,
        m.id,
        intersection ? "first" : "data",
        "data",
        intersection ? "First line" : m.output,
      );
    if (intersection && m.other)
      wire(
        m.other,
        pairKind(m.output),
        m.id,
        "second",
        "data",
        `Second ${pair}`,
      );
  });
  w.trips.forEach((t, i) => {
    nodes.push({
      id: t.id,
      label: t.label,
      kind: "Behavior",
      description: `Depart at ${formatHour(t.at)}`,
      inputs: [
        port("action:reset", "Reset", "action"),
        port("person", "Person", "action"),
        port("destination", "Destination", "action"),
      ],
      outputs: [],
      x: 1170,
      y: 110 + s.measurements.length * 210 + i * 230,
    });
    if (t.person)
      wire(t.person, "person", t.id, "person", "action", "Move person");
    if (t.target)
      wire(t.target, "destination", t.id, "destination", "action", "Go to");
  });
  // Pack by role without overlapping cards. Tall objects consume their actual port height.
  let column = 48;
  for (const kind of ["Control", "Object", "View", "Result", "Behavior"]) {
    let y = 80,
      x = column;
    const group = nodes.filter((n) => n.kind === kind);
    if (!group.length) continue;
    for (const n of group) {
      const height =
        96 +
        Math.max(n.inputs.length, n.outputs.length, 1) * 40 +
        (n.kind === "Object" ? 48 : 0);
      if (y + height > 2900) {
        x += 330;
        y = 80;
      }
      n.x = x;
      n.y = y;
      y += height + 60;
    }
    column = x + 360;
  }
  const blocks = nodes.map((n) => ({
    ...n,
    ...(saved ? (doc.editor.positions[n.id] ?? {}) : {}),
    ...(moving?.id === n.id ? { x: moving.x, y: moving.y } : {}),
  }));
  return {
    blocks,
    wires,
    node: (id: string) => blocks.find((n) => n.id === id),
  };
}
export function connectionError(
  s: CompositionScene,
  from: Endpoint,
  to: Endpoint,
): string | null {
  const w = requireRecord(s.workspace);
  const o = s.objects.find((o) => o.id === from.node);
  const dest = s.objects.find((o) => o.id === to.node);
  const canvas = w.canvases.find((c) => c.id === to.node);
  const sourceCanvas = w.canvases.find((c) => c.id === from.node);
  const control = s.controls.find((c) => c.id === from.node);
  const result = s.measurements.find((m) => m.id === to.node);
  const trip = w.trips.find((t) => t.id === to.node);
  if (from.node === to.node) return "Choose a different component";
  if (
    control?.widget === "button" &&
    from.port === "value" &&
    to.port.startsWith("action:")
  ) {
    const key = to.port.slice(7);
    return (dest && Object.hasOwn(actions(dest), key)) ||
      (canvas && key === "reset")
      ? null
      : "Unsupported action target";
  }
  if (from.port === "geometry" && o && to.port === "objects" && canvas) {
    if (
      o.kind === "ground" &&
      s.objects.some(
        (v) =>
          v.id !== o.id &&
          v.kind === "ground" &&
          w.placements[v.id] === canvas.id,
      )
    )
      return "This scene already has ground";
    // Moving connected objects must not silently break pair measurements or destinations.
    if (
      s.measurements.some(
        (m) =>
          isPairOutput(m.output) &&
          (m.target === o.id || m.other === o.id) &&
          w.placements[m.target === o.id ? m.other : m.target] &&
          w.placements[m.target === o.id ? m.other : m.target] !== canvas.id,
      )
    )
      return "Disconnect the intersection before moving this line to another plane";
    if (
      w.trips.some(
        (t) =>
          (t.person === o.id &&
            t.target &&
            w.placements[t.target] &&
            w.placements[t.target] !== canvas.id) ||
          (t.target === o.id &&
            t.person &&
            w.placements[t.person] &&
            w.placements[t.person] !== canvas.id),
      )
    )
      return "Disconnect the trip before moving this object to another scene";
    return null;
  }
  if (
    control &&
    from.port === "value" &&
    to.port.startsWith("property:") &&
    (dest || canvas?.kind === "town")
  ) {
    if (control.widget === "button") return "Action buttons connect to actions";
    const p = properties(dest)[to.port.slice(9)];
    if (!p || Boolean(p.toggle) !== (control.widget === "toggle"))
      return "Connect numeric controls to numbers and toggles to on / off properties";
    if (dest?.kind === "line" && dest.a.x === dest.b.x)
      return "A vertical line has no finite slope or y intercept";
    if (dest && !p.toggle) {
      const start = propertyValue(dest, to.port.slice(9));
      if (typeof start !== "number" || start < p.min || start > p.max)
        return `Set the starting ${p.label.toLowerCase()} between ${p.min} and ${p.max} before connecting this control`;
    }
    return null;
  }
  if (
    result &&
    from.port.startsWith("output:") &&
    to.port === "data" &&
    (o || sourceCanvas?.kind === "town") &&
    Object.hasOwn(outputs(o), from.port.slice(7))
  )
    return null;
  if (
    result &&
    isPairOutput(result.output) &&
    o?.kind === pairKind(result.output) &&
    from.port === pairKind(result.output) &&
    ["first", "second"].includes(to.port)
  ) {
    const other = to.port === "first" ? result.other : result.target;
    if (other === o.id) return "Choose two different lines";
    if (
      other &&
      w.placements[other] &&
      w.placements[o.id] &&
      w.placements[other] !== w.placements[o.id]
    )
      return "Intersection lines must share a plane";
    return null;
  }
  if (
    trip &&
    ((o?.kind === "person" && from.port === "person" && to.port === "person") ||
      (o?.kind === "building" &&
        from.port === "destination" &&
        to.port === "destination"))
  ) {
    const other = to.port === "person" ? trip.target : trip.person;
    if (
      other &&
      w.placements[other] &&
      w.placements[o.id] &&
      w.placements[other] !== w.placements[o.id]
    )
      return "Person and destination must share a scene";
    if (
      o.kind === "person" &&
      (trip.at < o.spawnAt ||
        w.trips.some(
          (t) => t.id !== trip.id && t.person === o.id && t.at === trip.at,
        ))
    )
      return "Set a departure after spawning and distinct from this person's other trips";
    return null;
  }
  return "These ports cannot connect";
}
export function connectPorts(
  s: CompositionScene,
  from: Endpoint,
  to: Endpoint,
) {
  const error = connectionError(s, from, to);
  if (error) throw new Error(error);
  if (to.port.startsWith("action:")) {
    const c = requireRecord(s.controls.find((c) => c.id === from.node));
    controlDefaults(
      c,
      s,
      requireRecord(s.workspace).canvases.some((v) => v.id === to.node)
        ? canvasTarget(to.node)
        : to.node,
      to.port.slice(7),
    );
  } else if (to.port === "objects")
    requireRecord(s.workspace).placements[from.node] = to.node;
  else if (to.port.startsWith("property:")) {
    const c = requireRecord(s.controls.find((c) => c.id === from.node));
    controlDefaults(
      c,
      s,
      requireRecord(s.workspace).canvases.some((c) => c.id === to.node)
        ? clockTarget(to.node)
        : to.node,
      to.port.slice(9),
    );
  } else if (["data", "first", "second"].includes(to.port)) {
    const m = requireRecord(s.measurements.find((m) => m.id === to.node));
    if (to.port === "second") m.other = from.node;
    else {
      m.target = requireRecord(s.workspace).canvases.some(
        (c) => c.id === from.node,
      )
        ? clockTarget(from.node)
        : from.node;
      if (to.port === "data") {
        m.output = from.port.slice(7);
        m.other = "";
        m.unit = outputSpec(
          s.objects.find((o) => o.id === from.node),
          m.output,
        ).unit;
      }
    }
  } else {
    const t = requireRecord(
      requireRecord(s.workspace).trips.find((t) => t.id === to.node),
    );
    if (to.port === "person") t.person = from.node;
    else t.target = from.node;
  }
}
export function disconnectWire(s: CompositionScene, wire: GraphWire) {
  if (wire.toPort === "objects")
    delete requireRecord(s.workspace).placements[wire.from];
  else if (
    wire.toPort.startsWith("property:") ||
    wire.toPort.startsWith("action:")
  )
    requireRecord(s.controls.find((c) => c.id === wire.from)).target = "";
  else if (["data", "first", "second"].includes(wire.toPort)) {
    const m = requireRecord(s.measurements.find((m) => m.id === wire.to));
    if (wire.toPort === "second") m.other = "";
    else m.target = "";
  } else {
    const t = requireRecord(
      requireRecord(s.workspace).trips.find((t) => t.id === wire.to),
    );
    if (wire.toPort === "person") t.person = "";
    else t.target = "";
  }
}
