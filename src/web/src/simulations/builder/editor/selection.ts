import { publicDefinition } from "../../components/catalog";
import { builtInRecipe } from "../../components/composites/catalog";
import {
  insertRecipe,
  removeNodes,
  selectionRecipe,
} from "../../runtime/authoring/recipes";
import { requireValue } from "../../runtime/authoring/requireValue";
import { entrance } from "../../runtime/composition/index";
import { clockTarget } from "../../runtime/composition/projectCanvas";
import { requireRecord } from "../../runtime/records";
import type { ExperimentDocument } from "../document";
import { compositionGraph } from "../graph/deriveGraph";

export type ComponentClipboard = {
  document: ExperimentDocument;
  ids: string[];
};

export function expandSelection(doc: ExperimentDocument, ids: string[]) {
  if (doc.authored)
    return [
      ...new Set(
        ids.flatMap(
          (id) =>
            requireValue(doc.authored).groups.find((g) => g.id === id)
              ?.members ?? [id],
        ),
      ),
    ];
  const selected = new Set(ids);
  for (const group of doc.editor.groups ?? [])
    if (group.members.some((id) => selected.has(id)))
      for (const id of group.members) selected.add(id);
  return [...selected];
}

export function cleanEditor(doc: ExperimentDocument) {
  const ids = new Set(
    doc.authored
      ? [
          ...doc.authored.nodes,
          ...doc.authored.resources,
          ...doc.authored.groups,
        ].map((n) => n.id)
      : compositionGraph(doc).blocks.map((b) => b.id),
  );
  for (const id of Object.keys(doc.editor.positions))
    if (!ids.has(id)) delete doc.editor.positions[id];
  if (doc.authored) doc.authored.editor = structuredClone(doc.editor);
  if (doc.editor.groups)
    doc.editor.groups = doc.editor.groups
      .map((g) => ({ ...g, members: g.members.filter((id) => ids.has(id)) }))
      .filter((g) => g.members.length >= 2);
}

export function groupComponents(doc: ExperimentDocument, ids: string[]) {
  const members = expandSelection(doc, ids);
  if (doc.authored) {
    if (members.length < 2) throw new Error("Select at least two components");
    const id = `group-${crypto.randomUUID()}`;
    const children = doc.authored.groups.filter(
      (g) => g.members.every((m) => members.includes(m)) && !g.parent,
    );
    for (const child of children) child.parent = id;
    doc.authored.groups.push({
      id,
      label: "Group",
      members,
      collapsed: true,
      parameters: [],
    });
    return;
  }
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
  if (doc.authored) {
    const removed = new Set(
      doc.authored.groups
        .filter(
          (g) =>
            ids.includes(g.id) || g.members.every((id) => ids.includes(id)),
        )
        .map((g) => g.id),
    );
    doc.authored.groups = doc.authored.groups.filter((g) => !removed.has(g.id));
    for (const g of doc.authored.groups)
      if (g.parent && removed.has(g.parent)) delete g.parent;
    cleanEditor(doc);
    return;
  }
  doc.editor.groups = (doc.editor.groups ?? []).filter(
    (g) => !g.members.some((id) => ids.includes(id)),
  );
}

/** Remove selected components without silently deleting surviving controls or results. */
export function deleteComponents(doc: ExperimentDocument, ids: string[]) {
  if (doc.authored) {
    doc.authored = removeNodes(doc.authored, expandSelection(doc, ids));
    cleanEditor(doc);
    return;
  }
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
  if (doc.authored && clipboard.document.authored) {
    const ids = expandSelection(clipboard.document, clipboard.ids);
    const recipe = selectionRecipe(clipboard.document.authored, ids, {
      id: "clipboard",
      title: "Copy",
      description: "",
      tags: [],
    });
    const prefix = crypto.randomUUID();
    recipe.externalPorts = recipe.externalPorts.map((p) => ({
      ...p,
      required: false,
    }));
    const bindings: Record<string, { node: string; port: string }> = {};
    for (const external of recipe.externalPorts) {
      const original = clipboard.document.authored.connections.find((c) =>
        external.direction === "input"
          ? c.to.node === external.endpoint.node &&
            c.to.port === external.endpoint.port &&
            !ids.includes(c.from.node)
          : c.from.node === external.endpoint.node &&
            c.from.port === external.endpoint.port &&
            !ids.includes(c.to.node),
      );
      const endpoint =
        external.direction === "input" ? original?.from : original?.to;
      if (external.direction === "output" && endpoint) {
        const target = [...doc.authored.nodes, ...doc.authored.resources].find(
          (n) => n.id === endpoint.node,
        );
        const input =
          target && publicDefinition(target).inputs[endpoint.port];
        if (
          input &&
          input.cardinality !== "many" &&
          doc.authored.connections.some(
            (c) => c.to.node === endpoint.node && c.to.port === endpoint.port,
          )
        )
          continue;
      }
      if (
        endpoint &&
        [...doc.authored.nodes, ...doc.authored.resources].some(
          (n) => n.id === endpoint.node,
        )
      )
        bindings[external.name] = endpoint;
    }
    doc.authored = insertRecipe(
      doc.authored,
      recipe,
      builtInRecipe,
      (id) => `${prefix}/${id}`,
      {},
      bindings,
    );
    Object.assign(doc.editor.positions, doc.authored.editor.positions);
    for (const g of recipe.document.groups) {
      const p = clipboard.document.editor.positions[g.id];
      if (p)
        doc.editor.positions[`${prefix}/${g.id}`] = {
          x: p.x + offset,
          y: p.y + offset,
        };
    }
    const graph = compositionGraph(clipboard.document);
    for (const id of ids) {
      const node = graph.node(id);
      if (node)
        doc.editor.positions[`${prefix}/${id}`] = {
          x: node.x + offset,
          y: node.y + offset,
        };
    }
    doc.authored.editor = structuredClone(doc.editor);
    return ids.map((id) => `${prefix}/${id}`);
  }
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
