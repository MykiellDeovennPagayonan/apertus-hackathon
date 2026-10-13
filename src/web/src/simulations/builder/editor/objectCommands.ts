import { createObject, objectSpaces } from "../../registry/objects/registry";
import { entrance } from "../../legacy/components/systems/BuildingGeometrySystem";
import type {
  ObjectKind,
  SceneObject,
} from "../../legacy/components/traits/SceneObjects";
import type { CompositionScene } from "../../creation-and-editing/runtime-engine/composition/types";
export function addSceneObject(
  scene: CompositionScene,
  kind: ObjectKind,
  id: string,
) {
  if (objectSpaces[kind] !== scene.kind)
    throw new Error("This object is incompatible with the canvas");
  if (scene.objects.length >= 64) throw new Error("Use at most 64 objects");
  if (
    !scene.workspace &&
    kind === "ground" &&
    scene.objects.some((o) => o.kind === "ground")
  )
    throw new Error("This scene already has ground. Edit its size or color.");
  const item = createObject(kind, id);
  const count = scene.objects.filter((o) => o.kind === kind).length;
  item.label += ` ${count + 1}`;
  if (item.kind === "line") {
    item.a.y = count;
    item.b.y += count;
    item.color = ["#4367b2", "#b75d45", "#48805b", "#8c5f9c"][count % 4];
  }
  if (item.kind === "gas") {
    item.display.x += (count % 2) * 45;
    item.display.y += Math.floor(count / 2) * 55;
  }
  if (item.kind === "fraction-bar") item.display.y += count * 22;
  if (item.kind === "building") item.x = Math.min(count * 7, 18);
  scene.objects.push(item);
  return item;
}
export function removeSceneObject(scene: CompositionScene, id: string) {
  const removed = scene.objects.find((o) => o.id === id);
  if (removed?.kind === "building")
    for (const o of scene.objects)
      if (o.kind === "person")
        for (const step of o.schedule)
          if (step.target === id) {
            const p = entrance(removed);
            step.target = "";
            step.x = p.x;
            step.z = p.y;
          }
  scene.objects = scene.objects.filter((o) => o.id !== id);
  if (scene.workspace) {
    for (const c of scene.controls) if (c.target === id) c.target = "";
    for (const m of scene.measurements) {
      if (m.target === id) m.target = "";
      if (m.other === id) m.other = "";
    }
  } else {
    scene.controls = scene.controls.filter((c) => c.target !== id);
    scene.measurements = scene.measurements.filter(
      (m) => m.target !== id && m.other !== id,
    );
  }
  if (scene.workspace) {
    delete scene.workspace.placements[id];
    for (const trip of scene.workspace.trips) {
      if (trip.person === id) trip.person = "";
      if (trip.target === id && removed?.kind === "building") {
        const p = entrance(removed);
        trip.target = "";
        trip.x = p.x;
        trip.z = p.y;
      }
    }
  }
}

/** Display handles never capture experimental gas inputs or fraction shading. */
export function authoredDisplayCommit(
  scene: CompositionScene,
  object: SceneObject,
): SceneObject {
  const authored = scene.objects.find((o) => o.id === object.id);
  return authored &&
    (object.kind === "gas" || object.kind === "fraction-bar") &&
    authored.kind === object.kind
    ? { ...authored, display: object.display }
    : object;
}
