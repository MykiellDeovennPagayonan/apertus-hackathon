import { parseRecipe } from "../validator/parseRecipe";
import { DocumentRuntime } from "./DocumentRuntime";
/** Build an isolated candidate before the caller commits it to the active shell. */
export function loadRecipe(source: unknown) {
  const recipe = parseRecipe(source);
  const document = structuredClone(recipe.document);
  const runtime = new DocumentRuntime(document);
  return { recipe, document, runtime };
}

/** An isolated snapshot for authoring projections; always release its providers. */
export function inspectDocument(
  document: import("../authoring-engine/document").AuthoredDocument,
) {
  const runtime = new DocumentRuntime(document);
  try {
    return structuredClone(runtime.getSnapshot());
  } finally {
    runtime.dispose();
  }
}
