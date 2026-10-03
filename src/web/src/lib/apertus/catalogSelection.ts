import { templateNames } from "../../simulations/runtime/capabilities";
import { definitions } from "../../simulations/runtime/catalog";
import type { DemoType } from "../../simulations/runtime/types";
import { compositions } from "../../simulations/runtime/validation";

const topics: Record<Exclude<DemoType, "assembly">, RegExp> = {
  gas: /gas|pressure|temperature|volume/i,
  projectile:
    /\b(projectiles?|launch(?:es|ing)?|angles?|gravity|moon|mars|throw(?:ing)?|ballistic|trajector(?:y|ies)|sweeps?)\b/i,
  bridge: /bridge|truss|load|truck|beam/i,
  town: /town|citizen|market|road|school|nighttime/i,
  counting: /count|circles|box/i,
  arithmetic: /add|subtract|addition|subtraction/i,
  "equal-groups": /share|groups|baskets|multiply|divide|division/i,
  "fraction-builder": /fraction|\d+\s*\/\s*\d+/i,
  "fraction-number-line":
    /number line|place\s+\d+\s*\/|add\s+\d+\s*\/|subtract\s+\d+\s*\//i,
  ratio: /ratio|percent/i,
  "area-perimeter": /area|perimeter|rectangle/i,
  coordinates: /coordinate|plot|point|cartesian/i,
  probability: /\b(probability|coins?|dice|die|trials?|random)\b/i,
};
export function selectCapabilities(prompt: string, demo: DemoType | null) {
  if (demo === "assembly") return [];
  const selected = demo
    ? [demo]
    : Object.entries(topics)
        .filter(([, pattern]) => pattern.test(prompt))
        .map(([key]) => key as Exclude<DemoType, "assembly">);
  const refs = new Set<string>();
  for (const model of selected) {
    refs.add(`compositions/${templateNames[model]}`);
    for (const [kind, ids] of Object.entries(compositions[model].components))
      for (const id of ids) refs.add(`${kind}/${id}`);
    if (model === "projectile")
      refs.add("compositions/ProjectileSweepExperiment");
  }
  const visit = (ref: string) => {
    const d = definitions.get(ref);
    for (const dep of d?.required ?? [])
      if (!refs.has(dep)) {
        refs.add(dep);
        visit(dep);
      }
  };
  [...refs].forEach(visit);
  return [...refs].map((ref) => {
    const defaultsEntry = Object.entries(compositions).find(
      ([, c]) => ref === `compositions/${c.id}`,
    );
    return {
      ref,
      ...definitions.get(ref),
      ...(defaultsEntry
        ? {
            defaults: defaultsEntry[1].defaults,
            assumptions: defaultsEntry[1].assumptions,
          }
        : {}),
    };
  });
}
