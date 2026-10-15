import { validateRuntimeRecipe } from "../validator/runnable";
import { validateAuthoredDocument } from "../validator/document";
import { parseRecipe } from "../validator/parseRecipe";
import type { AuthoredDocument, CompositeRecipe } from "./document";
import { serializeRecipe } from "./serializeRecipe";
export function finalizeRecipe(
  document: AuthoredDocument,
  metadata: Partial<CompositeRecipe> = {},
) {
  validateAuthoredDocument(document, true);
  if (
    !document.nodes.length ||
    !document.lesson.title.trim() ||
    !document.lesson.instruction.trim()
  )
    throw new Error("A lesson needs content, title, and instructions");
  for (const node of document.nodes.filter(
    (n) => n.definition === "models/BridgeResponse",
  ))
    for (const port of ["joints", "members", "load"])
      if (
        !document.connections.some(
          (c) => c.to.node === node.id && c.to.port === port,
        )
      )
        throw new Error("A bridge needs declared topology and load");
  const candidate: CompositeRecipe = {
    recipeVersion: 2,
    id: metadata.id ?? "generated/lesson",
    version: metadata.version ?? 1,
    title: document.lesson.title,
    description: metadata.description ?? document.lesson.instruction,
    tags: metadata.tags ?? [],
    document: structuredClone(document),
    nested: [],
    parameters: metadata.parameters ?? [],
    externalPorts: metadata.externalPorts ?? [],
    dependencies: [],
    assumptions: metadata.assumptions ?? [],
  };
  const recipe = parseRecipe(serializeRecipe(candidate));
  validateRuntimeRecipe(recipe);
  return recipe;
}
