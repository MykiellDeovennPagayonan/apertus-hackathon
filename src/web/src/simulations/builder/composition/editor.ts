import type { ExperimentDocument } from "../document";
import { requireRecord } from "../records";
import { compositionGraph } from "./graph";
import { entrance } from "./model";
import { clockTarget } from "./workspace";

export type ComponentClipboard = {
  document: ExperimentDocument;
  ids: string[];
};

export function expandSelection(doc: ExperimentDocument, ids: string[]) {
  const selected = new Set(ids);
  for (const group of doc.editor.groups ?? [])
    if (group.members.some((id) => selected.has(id)))
      for (const id of group.members) selected.add(id);
  return [...selected];
}

export function cleanEditor(doc: ExperimentDocument) {
  const ids = new Set(compositionGraph(doc).blocks.map((b) => b.id));
  for (const id of Object.keys(doc.editor.positions))
    if (!ids.has(id)) delete doc.editor.positions[id];
  if (doc.editor.groups)
    doc.editor.groups = doc.editor.groups
      .map((g) => ({ ...g, members: g.members.filter((id) => ids.has(id)) }))
      .filter((g) => g.members.length >= 2);
}

export function groupComponents(doc: ExperimentDocument, ids: string[]) {
  const members = expandSelection(doc, ids);
  if (members.length < 2)
    throw new Error("Select at least two components to create a group");
  const groups = doc.editor.groups ?? [];
  doc.editor.groups = [
    ...groups.filter((g) => !g.members.some((id) => members.includes(id))),
    {
      id: `group-${crypto.randomUUID()}`,
      label: `Group ${groups.length + 1}`,
      members,
    },
  ];
}

export function ungroupComponents(doc: ExperimentDocument, ids: string[]) {
  doc.editor.groups = (doc.editor.groups ?? []).filter(
    (g) => !g.members.some((id) => ids.includes(id)),
  );
}

/** Remove selected components without silently deleting surviving controls or results. */
export function deleteComponents(doc: ExperimentDocument, ids: string[]) {
  const removed = new Set(ids);
  const scene = requireRecord(doc.scene);
  const workspace = requireRecord(scene.workspace);
  for (const trip of workspace.trips) {
    const building = scene.objects.find((o) => o.id === trip.target);
    if (removed.has(trip.target) && building?.kind === "building") {
      const p = entrance(building);
      trip.x = p.x;
      trip.z = p.y;
      trip.target = "";
    }
    if (removed.has(trip.person)) trip.person = "";
  }
  const cleared = (id: string) =>
    removed.has(id) ||
    [...removed].some((v) => id === clockTarget(v) || id === `canvas/${v}`);
  scene.objects = scene.objects.filter((o) => !removed.has(o.id));
  scene.controls = scene.controls.filter((c) => !removed.has(c.id));
  scene.measurements = scene.measurements.filter((m) => !removed.has(m.id));
  workspace.canvases = workspace.canvases.filter((c) => !removed.has(c.id));
  workspace.trips = workspace.trips.filter((t) => !removed.has(t.id));
  for (const [id, canvas] of Object.entries(workspace.placements))
    if (removed.has(id) || removed.has(canvas)) delete workspace.placements[id];
  for (const control of scene.controls)
    if (cleared(control.target)) control.target = "";
  for (const measurement of scene.measurements) {
    if (cleared(measurement.target)) measurement.target = "";
    if (cleared(measurement.other)) measurement.other = "";
  }
  cleanEditor(doc);
}

/** Copy only the selection, remapping internal references and retaining valid external bindings. */
export function pasteComponents(
  doc: ExperimentDocument,
  clipboard: ComponentClipboard,
  offset = 40,
) {
  const scene = requireRecord(doc.scene);
  const original = requireRecord(clipboard.document.scene);
  if (scene.kind !== original.kind)
    throw new Error("Paste components into the same kind of experiment");
  const workspace = requireRecord(scene.workspace);
  const sourceWorkspace = requireRecord(original.workspace);
  const selected = new Set(clipboard.ids);
  const remap = new Map(
    clipboard.ids.map((id) => [id, `component-${crypto.randomUUID()}`]),
  );
  const existing = new Set(compositionGraph(doc).blocks.map((b) => b.id));
  const reference = (id: string): string => {
    if (!id) return "";
    if (id.startsWith("clock/") || id.startsWith("canvas/")) {
      const prefix = id.startsWith("clock/") ? "clock/" : "canvas/";
      const canvas = reference(id.slice(prefix.length));
      return canvas ? prefix + canvas : "";
    }
    return remap.get(id) ?? (existing.has(id) ? id : "");
  };
  const copy = <T extends { id: string; label: string }>(record: T): T => ({
    ...structuredClone(record),
    id: requireRecord(remap.get(record.id)),
    label: `${record.label} copy`.slice(0, 100),
  });
  scene.objects.push(
    ...original.objects.filter((o) => selected.has(o.id)).map(copy),
  );
  workspace.canvases.push(
    ...sourceWorkspace.canvases.filter((c) => selected.has(c.id)).map(copy),
  );
  scene.controls.push(
    ...original.controls
      .filter((c) => selected.has(c.id))
      .map((c) => ({
        ...copy(c),
        target: reference(c.target),
      })),
  );
  scene.measurements.push(
    ...original.measurements
      .filter((m) => selected.has(m.id))
      .map((m) => ({
        ...copy(m),
        target: reference(m.target),
        other: reference(m.other),
      })),
  );
  workspace.trips.push(
    ...sourceWorkspace.trips
      .filter((t) => selected.has(t.id))
      .map((t) => ({
        ...copy(t),
        person: reference(t.person),
        target: reference(t.target),
      })),
  );
  for (const [id, canvas] of Object.entries(sourceWorkspace.placements)) {
    const target = reference(canvas);
    if (selected.has(id) && target) {
      const newId = requireRecord(remap.get(id));
      const object = scene.objects.find((o) => o.id === newId);
      // A second ground needs its own scene; keep the new component as an editable draft.
      if (
        object?.kind === "ground" &&
        scene.objects.some(
          (o) =>
            o.id !== newId &&
            o.kind === "ground" &&
            workspace.placements[o.id] === target,
        )
      )
        continue;
      workspace.placements[newId] = target;
    }
  }
  for (const m of scene.measurements) {
    if (
      !remapHasValue(remap, m.id) ||
      !["intersection", "comparison"].includes(m.output)
    )
      continue;
    const a = workspace.placements[m.target],
      b = workspace.placements[m.other];
    if (a && b && a !== b) m.other = "";
  }
  for (const t of workspace.trips) {
    if (!remapHasValue(remap, t.id)) continue;
    if (
      t.person &&
      workspace.trips.some(
        (other) =>
          other.id !== t.id && other.person === t.person && other.at === t.at,
      )
    )
      t.person = "";
    const a = workspace.placements[t.person],
      b = workspace.placements[t.target];
    if (a && b && a !== b) t.target = "";
  }
  for (const g of clipboard.document.editor.groups ?? [])
    if (g.members.every((id) => selected.has(id))) {
      doc.editor.groups ??= [];
      doc.editor.groups.push({
        ...g,
        id: `group-${crypto.randomUUID()}`,
        members: g.members.map((id) => requireRecord(remap.get(id))),
      });
    }
  const graph = compositionGraph(clipboard.document);
  for (const id of clipboard.ids) {
    const node = requireRecord(graph.node(id));
    doc.editor.positions[requireRecord(remap.get(id))] = {
      x: node.x + offset,
      y: node.y + offset,
    };
  }
  return [...remap.values()];
}

function remapHasValue(remap: Map<string, string>, id: string) {
  return [...remap.values()].includes(id);
}
