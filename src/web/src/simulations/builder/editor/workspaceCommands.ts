import {
  actions,
  canvasNames,
  isPairOutput,
} from "../../registry/contracts/objects/composition";
import { properties } from "../../registry/objects/registry";
import type { SceneObject } from "../../legacy/components/traits/SceneObjects";
import {
  canvasTarget,
  clockTarget,
} from "../../creation-and-editing/runtime-engine/composition/projectCanvas";
import type {
  CanvasComponent,
  CompositionScene,
  SceneControl,
} from "../../creation-and-editing/runtime-engine/composition/types";
export function upgradeWorkspace(scene: CompositionScene) {
  if (scene.workspace) return;
  const populated = scene.objects.length > 0;
  scene.workspace = {
    version: scene.version,
    canvases: [],
    placements: {},
    trips: [],
    arrangement: "side-by-side",
  };
  if (!populated) return;
  const canvas = addCanvas(scene, "canvas-main");
  for (const o of scene.objects) {
    scene.workspace.placements[o.id] = canvas.id;
    if (o.kind === "person") {
      for (const step of o.schedule)
        scene.workspace.trips.push({
          ...step,
          person: o.id,
          label: `${o.label} trip`,
        });
      o.schedule = [];
    }
  }
  for (const c of scene.controls)
    if (c.target === "clock") c.target = clockTarget(canvas.id);
  for (const m of scene.measurements)
    if (m.target === "clock") m.target = clockTarget(canvas.id);
}

export function addCanvas(scene: CompositionScene, id: string) {
  const w = scene.workspace;
  if (!w) throw new Error("Canvas components require a connection workspace");
  if (w.canvases.length >= 8) throw new Error("Use at most eight canvases");
  const c: CanvasComponent = {
    id,
    label: `${canvasNames[scene.kind]} ${w.canvases.length + 1}`,
    kind: scene.kind,
    settings: structuredClone(scene.canvas),
    ...(scene.clock ? { clock: structuredClone(scene.clock) } : {}),
  };
  w.canvases.push(c);
  return c;
}

export function removeCanvas(scene: CompositionScene, id: string) {
  const w = scene.workspace;
  if (!w) return;
  w.canvases = w.canvases.filter((c) => c.id !== id);
  for (const [o, c] of Object.entries(w.placements))
    if (c === id) delete w.placements[o];
  for (const binding of [...scene.controls, ...scene.measurements])
    if (
      binding.target === clockTarget(id) ||
      binding.target === canvasTarget(id)
    )
      binding.target = "";
}

export function controlDefaults(
  c: SceneControl,
  scene: CompositionScene,
  target: string,
  property: string,
) {
  const o = scene.objects.find((o) => o.id === target);
  if (c.widget === "button") {
    const spec = actions(o)[property];
    if (!spec) throw new Error("This component does not support that action");
    Object.assign(c, {
      target,
      property,
      binding: "action",
      fixed: structuredClone(spec.defaults),
      unit: "",
    });
    return;
  }
  const p = properties(o)[property];
  if (!p) throw new Error("This component does not support that property");
  Object.assign(c, {
    target,
    property,
    binding: "property",
    unit: p.unit ?? "",
    min: p.min,
    max: p.max,
    step: p.step,
    widget: p.toggle ? "toggle" : c.widget === "number" ? "number" : "slider",
  });
}

export function targetChoices(scene: CompositionScene) {
  return [
    ...scene.objects.map((o) => ({
      id: o.id,
      label: o.label,
      object: o as SceneObject | undefined,
    })),
    ...(scene.workspace?.canvases.map((c) => ({
      id: canvasTarget(c.id),
      label: `${c.label} reset`,
      object: undefined,
      canvasAction: true,
    })) ?? []),
    ...(scene.workspace?.canvases
      .filter((c) => c.kind === "town")
      .map((c) => ({
        id: clockTarget(c.id),
        label: `${c.label} clock`,
        object: undefined,
      })) ?? []),
  ];
}

export function pendingConnections(scene: CompositionScene): string[] {
  const w = scene.workspace;
  if (!w) return [];
  return [
    ...(!w.canvases.length ? ["Add a canvas"] : []),
    ...scene.objects
      .filter((o) => !Object.hasOwn(w.placements, o.id))
      .map((o) => `Connect ${o.label} to a canvas`),
    ...scene.controls
      .filter((c) => !c.target)
      .map((c) => `Connect ${c.label} to a property`),
    ...scene.measurements
      .filter(
        (m) => !m.target || !m.output || (isPairOutput(m.output) && !m.other),
      )
      .map((m) => `Connect ${m.label} to its inputs`),
    ...w.trips
      .filter((t) => !t.person)
      .map((t) => `Connect ${t.label} to a person`),
    ...w.canvases
      .filter(
        (c) =>
          c.kind === "town" &&
          !scene.objects.some(
            (o) => o.kind === "ground" && w.placements[o.id] === c.id,
          ),
      )
      .map((c) => `Add ground to ${c.label}`),
  ];
}
