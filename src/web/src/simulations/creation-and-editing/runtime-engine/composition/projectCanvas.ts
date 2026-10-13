import { isPairOutput } from "../../../registry/contracts/objects/composition";
import type { CanvasComponent, CompositionScene } from "./types";
export const canvasTarget = (id: string) => `canvas/${id}`;
export const clockTarget = (id: string) => `clock/${id}`;
export function canvasFor(scene: CompositionScene, objectId: string) {
  return scene.workspace?.canvases.find(
    (c) => c.id === scene.workspace?.placements[objectId],
  );
}
export function projectedScene(
  scene: CompositionScene,
  canvas: CanvasComponent,
): CompositionScene {
  const w = scene.workspace;
  const objects = scene.objects
    .filter((o) => w?.placements[o.id] === canvas.id)
    .map((o) => {
      if (o.kind !== "person") return o;
      const trips =
        w?.trips.filter(
          (t) =>
            t.person === o.id &&
            (!t.target || w.placements[t.target] === canvas.id),
        ) ?? [];
      return {
        ...o,
        schedule: [
          ...o.schedule,
          ...trips.map(({ person: _person, label: _label, ...step }) => step),
        ].sort((a, b) => a.at - b.at),
      };
    });
  const included = (id: string) => objects.some((o) => o.id === id);
  const scoped = (id: string) =>
    id === clockTarget(canvas.id)
      ? "clock"
      : id === canvasTarget(canvas.id)
        ? "canvas"
        : id;
  return {
    version: scene.version,
    kind: canvas.kind,
    canvas: canvas.settings,
    ...(canvas.clock ? { clock: canvas.clock } : {}),
    objects,
    controls: scene.controls
      .filter(
        (c) =>
          included(c.target) ||
          c.target === clockTarget(canvas.id) ||
          c.target === canvasTarget(canvas.id),
      )
      .map((c) => ({ ...c, target: scoped(c.target) })),
    measurements: scene.measurements
      .filter(
        (m) =>
          (included(m.target) || m.target === clockTarget(canvas.id)) &&
          (!isPairOutput(m.output) || included(m.other)),
      )
      .map((m) => ({ ...m, target: scoped(m.target) })),
  };
}
