import { publicDefinition } from "../../components/catalog";
import { createPublicNode } from "../../components/composites/catalog";
import { componentDefinition } from "../../components/registry";
import { assemblyDocument } from "../../runtime/authoring/adapters";
import { convertToBoard } from "../../runtime/authoring/board";
import { requireValue } from "../../runtime/authoring/requireValue";
import {
  emptyAuthoredDocument,
  emptyLayout,
} from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";
import { projectedScene } from "../../runtime/composition/projectCanvas";
import type { Assembly } from "../../runtime/contribution";
import { addCanvas, upgradeWorkspace } from "../editor/workspaceCommands";
import { createBlankDocument } from "./legacy";
import { composeLegacy } from "./migrations/composeLegacy";
import type { ExperimentDocument } from "./types";

/** Legacy envelope is only a compatibility shell for existing storage/history. authored is the version-3 source of truth. */
export function canonicalDocument(
  authored = emptyAuthoredDocument(),
): ExperimentDocument {
  validateAuthoredDocument(authored);
  return {
    documentVersion: 3,
    authored,
    template: "line",
    recipe: null,
    lesson: structuredClone(authored.lesson),
    presentation: {
      layout: "right",
      view: "line",
      particles: true,
      directShading: true,
      camera: "overview",
      controls: [],
      results: [],
    },
    editor: structuredClone(authored.editor),
  };
}

/** A new manual experiment begins on the common spatial board with no domain preset. */
export function createFreshDocument(): ExperimentDocument {
  const authored = emptyAuthoredDocument();
  authored.presentation = convertToBoard(authored);
  return canonicalDocument(authored);
}
export function fromAssembly(assembly: Assembly): ExperimentDocument {
  return canonicalDocument(assemblyDocument(assembly));
}

/** Pure translation preserves drafts and leaves the source object untouched. Spatial execution continues using its supported legacy adapter until phase 4. */
export function migrateManualDocument(
  source: ExperimentDocument,
): ExperimentDocument {
  if (source.authored) return structuredClone(source);
  let scene = source.scene;
  if (!scene && !source.recipe?.assembly) scene = composeLegacy(source).scene;
  if (!scene) {
    if (source.recipe?.assembly) return fromAssembly(source.recipe.assembly);
    throw new Error(
      "This legacy document needs its composition adapter first.",
    );
  }
  const d = emptyAuthoredDocument();
  d.lesson = structuredClone(source.lesson);
  d.compatibility = {
    source: structuredClone(source) as unknown as Record<string, unknown>,
    notices: [],
  };
  const canvases = scene.workspace?.canvases ?? [
    { id: "canvas", kind: scene.kind, label: "Canvas", settings: scene.canvas },
  ];
  for (const canvas of canvases) {
    d.scopes.push({ id: `scope/${canvas.id}`, label: canvas.label });
    const node = createPublicNode(
      `canvases/${canvas.kind}`,
      canvas.id,
      `scope/${canvas.id}`,
    );
    node.configuration = structuredClone(canvas.settings);
    d.nodes.push(node);
    d.layout.children.push({
      ...emptyLayout(`layout/${canvas.id}`),
      node: canvas.id,
    });
  }
  const fallback = d.scopes[0].id;
  for (let object of scene.objects) {
    if (object.kind === "person" && scene.workspace) {
      const canvas = scene.workspace.canvases.find(
        (c) => c.id === scene.workspace?.placements[object.id],
      );
      if (canvas)
        object =
          projectedScene(scene, canvas).objects.find(
            (o) => o.id === object.id,
          ) ?? object;
    }
    const scope = `scope/${scene.workspace?.placements[object.id] ?? canvases[0].id}`,
      { id: _id, ...configuration } = object;
    d.nodes.push({
      id: object.id,
      definition: componentDefinition(object.kind).id,
      version: 1,
      label: object.label,
      scope,
      configuration: structuredClone(configuration),
    });
    const canvas = scene.workspace?.placements[object.id] ?? canvases[0].id;
    if (canvases.some((c) => c.id === canvas))
      d.connections.push({
        id: `placement/${object.id}`,
        kind: "attachment",
        from: { node: object.id, port: "appearance" },
        to: { node: canvas, port: "objects" },
      });
  }
  for (const canvas of canvases.filter((c) => c.kind === "town")) {
    const clock = createPublicNode(
      "models/ScheduledTrip",
      `clock/${canvas.id}`,
      `scope/${canvas.id}`,
    );
    clock.configuration = {
      time: canvas.clock?.start ?? scene.clock?.start ?? 0,
      playing: canvas.clock?.playing ?? scene.clock?.playing ?? false,
      speed: canvas.clock?.speed ?? scene.clock?.speed ?? 1,
      secondsPerHour:
        canvas.clock?.secondsPerHour ?? scene.clock?.secondsPerHour ?? 5,
    };
    d.nodes.push(clock);
    d.connections.push({
      id: `timeline/${canvas.id}`,
      kind: "attachment",
      from: { node: clock.id, port: "appearance" },
      to: { node: canvas.id, port: "timeline" },
    });
    for (const object of scene.objects.filter(
      (o) =>
        (scene.workspace?.placements[o.id] ?? canvases[0].id) === canvas.id,
    ))
      d.connections.push({
        id: `timeline/${object.id}`,
        kind: "value",
        from: { node: object.id, port: "data" },
        to: { node: clock.id, port: "objects" },
      });
  }
  for (const c of scene.controls) {
    const targetId =
      c.target === "clock" ? `clock/${canvases[0].id}` : c.target;
    const target = d.nodes.find((n) => n.id === targetId),
      scope = target?.scope ?? fallback;
    const node = createPublicNode(
      `controls/${c.widget === "button" ? "Button" : c.widget === "toggle" ? "Toggle" : c.widget === "slider" ? "Slider" : "NumberInput"}`,
      c.id,
      scope,
    );
    node.configuration.label = c.label;
    node.configuration.initial = JSON.stringify(
      c.fixed ??
        (c.widget === "button"
          ? {}
          : { value: c.widget === "toggle" ? false : c.min }),
    );
    d.nodes.push(node);
    d.layout.children.push({ ...emptyLayout(`layout/${c.id}`), node: c.id });
    const command = c.binding === "action" ? c.property : `set:${c.property}`;
    if (target && publicDefinition(target).commands[command])
      d.connections.push({
        id: `binding/${c.id}`,
        kind: "command",
        from: { node: c.id, port: "submit" },
        to: { node: targetId, port: command },
        ...(c.fixed ? { arguments: structuredClone(c.fixed) } : {}),
      });
  }
  for (const result of scene.measurements) {
    const resultTarget =
      result.target === "clock" ? `clock/${canvases[0].id}` : result.target;
    const target = d.nodes.find((n) => n.id === resultTarget),
      node = createPublicNode(
        "displays/Readout",
        result.id,
        target?.scope ?? fallback,
      );
    node.configuration = { label: result.label, precision: result.precision };
    d.nodes.push(node);
    d.layout.children.push({
      ...emptyLayout(`layout/${result.id}`),
      node: result.id,
    });
    if (target && result.other && d.nodes.some((n) => n.id === result.other)) {
      const operation = createPublicNode(
        result.output === "intersection"
          ? "operations/LineIntersection"
          : "operations/FractionComparison",
        `operation/${result.id}`,
        target.scope,
      );
      d.nodes.push(operation);
      for (const [port, id] of [
        ["first", result.target],
        ["second", result.other],
      ])
        d.connections.push({
          id: `binding/${result.id}/${port}`,
          kind: "attachment",
          from: { node: id, port: "model" },
          to: { node: operation.id, port },
        });
      d.connections.push({
        id: `binding/${result.id}`,
        kind: "value",
        from: { node: operation.id, port: "result" },
        to: { node: result.id, port: "value" },
      });
    } else if (
      target &&
      publicDefinition(target).outputs[result.output]
    )
      d.connections.push({
        id: `binding/${result.id}`,
        kind: "value",
        from: { node: resultTarget, port: result.output },
        to: { node: result.id, port: "value" },
      });
  }
  // Legacy readers remain available for representations the canonical document cannot translate losslessly.
  for (const [id, p] of Object.entries(source.editor.positions))
    if (d.nodes.some((n) => n.id === id))
      d.editor.positions[id] = structuredClone(p);
  d.editor.zoom = source.editor.zoom;
  d.groups = (source.editor.groups ?? [])
    .map((g) => ({
      ...structuredClone(g),
      members: g.members.filter((id) => d.nodes.some((n) => n.id === id)),
      collapsed: false,
      parameters: [],
    }))
    .filter((g) => g.members.length > 0);
  d.layout.kind =
    scene.workspace?.arrangement === "side-by-side" ? "grid" : "stack";
  const connected = new Set(
    d.connections.filter((c) => c.kind === "command").map((c) => c.from.node),
  );
  for (const control of scene.controls)
    if (!connected.has(control.id))
      d.compatibility?.notices.push(
        `${control.label}: preserved as a disconnected draft; original binding is retained in the migration source.`,
      );
  validateAuthoredDocument(d);
  const result = canonicalDocument(d);
  result.template = source.template;
  result.presentation.layout = source.presentation.layout;
  result.editor = structuredClone(d.editor);
  return result;
}

/** Setup creates the selected initial canvas in the common authoring document. */
export function createCanvasDocument(
  template: ExperimentDocument["template"],
  layout: ExperimentDocument["presentation"]["layout"],
): ExperimentDocument {
  const source = createBlankDocument(template, layout);
  const legacy = composeLegacy(source);
  if (!legacy.scene) throw new Error("Canvas setup could not be created");
  upgradeWorkspace(legacy.scene);
  if (!legacy.scene.workspace?.canvases.length)
    addCanvas(legacy.scene, `canvas-${crypto.randomUUID()}`);
  const next = migrateManualDocument(legacy);
  delete next.authored?.compatibility;
  next.template = template;
  next.presentation.layout = layout;
  requireValue(next.authored).layout.kind =
    layout === "bottom" ? "stack" : "grid";
  requireValue(next.authored).presentation = convertToBoard(
    requireValue(next.authored),
  );
  return next;
}
