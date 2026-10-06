import { DocumentRuntime } from "../authoring/runtime";
import { parseRecipe } from "./schema";
/** Build an isolated candidate before the caller commits it to the active shell. */
export function loadRecipe(source: unknown) {
  const recipe = parseRecipe(source);
  const document = structuredClone(recipe.document);
  const runtime = new DocumentRuntime(document);
  return { recipe, document, runtime };
}
