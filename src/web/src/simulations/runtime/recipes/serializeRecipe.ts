import type { AuthoredDocument, CompositeRecipe } from "../authoring/types";
import { parseRecipe } from "./schema";
/** Save authored starting conditions, never an incidental animation checkpoint. */
export function serializeRecipe(
  recipe: CompositeRecipe,
  document: AuthoredDocument = recipe.document,
) {
  const candidate = structuredClone(recipe);
  candidate.document = structuredClone(document);
  for (const group of candidate.document.groups)
    for (const parameter of group.parameters) {
      const node = [
        ...candidate.document.nodes,
        ...candidate.document.resources,
      ].find((node) => node.id === parameter.node);
      if (node)
        parameter.default = structuredClone(
          node.configuration[parameter.field],
        );
    }
  candidate.title = document.lesson.title;
  candidate.dependencies = [
    ...new Map(
      [...document.nodes, ...document.resources].map((node) => [
        `${node.definition}@${node.version}`,
        { id: node.definition, version: node.version },
      ]),
    ).values(),
  ];
  for (const parameter of candidate.parameters) {
    const node = [...document.nodes, ...document.resources].find(
      (node) => node.id === parameter.node,
    );
    if (node)
      parameter.default = structuredClone(node.configuration[parameter.field]);
  }
  return JSON.stringify(parseRecipe(candidate), null, 2);
}
