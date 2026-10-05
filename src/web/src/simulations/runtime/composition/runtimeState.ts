import {
  applyAction,
  fractionAction,
  sceneKinds,
} from "../../components/contracts/composition";
import { componentDefinition } from "../../components/registry";
import {
  type CompositionScene,
  type SceneObject,
  setProperty,
  validateScene,
} from "./index";
export const templateForScene = (scene: CompositionScene) =>
  Object.keys(sceneKinds).find(
    (key) => sceneKinds[key as keyof typeof sceneKinds] === scene.kind,
  ) ?? "line";
export function configurationKey(scene: CompositionScene) {
  return JSON.stringify({
    kind: scene.kind,
    clock: scene.kind === "town" ? scene.clock : undefined,
    objects: scene.objects.map((o) => {
      const definition = componentDefinition(o.kind);
      const ignored = new Set(["color", "label", ...definition.presentation]);
      return Object.fromEntries(
        Object.entries(o).filter(([key]) => !ignored.has(key)),
      );
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
    const definition = componentDefinition(o.kind);
    if (definition.state.length)
      return {
        ...o,
        ...Object.fromEntries(
          definition.state.map((key) => [
            key,
            (current as unknown as Record<string, unknown>)[key],
          ]),
        ),
        ...(display ? { display } : {}),
      } as SceneObject;
    return {
      ...current,
      label: o.label,
      color: o.color,
      ...Object.fromEntries(
        definition.presentation.map((key) => [
          key,
          (o as unknown as Record<string, unknown>)[key],
        ]),
      ),
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
