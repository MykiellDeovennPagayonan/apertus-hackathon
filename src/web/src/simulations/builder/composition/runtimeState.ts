import { applyAction, fractionAction, sceneKinds } from "./definitions";
import type { CompositionScene, SceneObject } from "./model";
import { setProperty, validateScene } from "./model";
export const templateForScene = (scene: CompositionScene) =>
  Object.keys(sceneKinds).find(
    (key) => sceneKinds[key as keyof typeof sceneKinds] === scene.kind,
  ) ?? "line";
export function configurationKey(scene: CompositionScene) {
  return JSON.stringify({
    kind: scene.kind,
    clock: scene.kind === "town" ? scene.clock : undefined,
    objects: scene.objects.map((o) => {
      const { color, label, ...rest } = o;
      if (rest.kind === "gas")
        return { id: rest.id, kind: rest.kind, inputs: rest.inputs };
      if (rest.kind === "fraction-bar")
        return { id: rest.id, kind: rest.kind, shaded: rest.shaded };
      if (rest.kind === "line") {
        const { width, dashed, draggable, ...geometry } = rest;
        return geometry;
      }
      if (rest.kind === "square") {
        const { width, opacity, draggable, ...geometry } = rest;
        return geometry;
      }
      return rest;
    }),
  });
}
export function mergeRuntimeObjects(
  authored: SceneObject[],
  runtime: SceneObject[],
  baseline: SceneObject[] = authored,
) {
  return authored.map((o) => {
    const current = runtime.find((v) => v.id === o.id && v.kind === o.kind);
    if (!current) return o;
    const previous = baseline.find((v) => v.id === o.id);
    const display =
      "display" in o &&
      "display" in current &&
      previous &&
      "display" in previous &&
      JSON.stringify(o.display) === JSON.stringify(previous.display)
        ? current.display
        : "display" in o
          ? o.display
          : undefined;
    if (o.kind === "gas" && current.kind === "gas")
      return { ...o, inputs: current.inputs, display: display ?? o.display };
    if (o.kind === "fraction-bar" && current.kind === "fraction-bar")
      return { ...o, shaded: current.shaded, display: display ?? o.display };
    return {
      ...current,
      label: o.label,
      color: o.color,
      ...(o.kind === "line"
        ? { width: o.width, dashed: o.dashed, draggable: o.draggable }
        : o.kind === "square"
          ? { width: o.width, opacity: o.opacity, draggable: o.draggable }
          : {}),
    } as SceneObject;
  });
}
/** Stage every domain mutation before validation; callers publish only successful results. */
export function updateRuntimeObject(
  scene: CompositionScene,
  target: string,
  mode: "property" | "action" | "piece",
  key: string,
  value: unknown,
): SceneObject {
  const candidate = structuredClone(scene.objects.find((o) => o.id === target));
  if (!candidate) throw new Error("Missing object");
  if (mode === "property")
    setProperty(candidate, key, value as number | boolean);
  else if (mode === "action") applyAction(candidate, key, value);
  else {
    if (candidate.kind !== "fraction-bar" || !candidate.interactive)
      throw new Error("Direct shading is disabled for this lesson.");
    fractionAction(candidate, "TOGGLE_FRACTION_PIECE", {
      bar: 0,
      piece: value,
    });
  }
  validateScene(
    {
      ...scene,
      objects: scene.objects.map((o) => (o.id === target ? candidate : o)),
    },
    templateForScene(scene),
    false,
  );
  return candidate;
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
