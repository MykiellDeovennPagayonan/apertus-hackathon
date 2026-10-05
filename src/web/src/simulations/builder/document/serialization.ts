import { parseRecipe } from "../../runtime/resolver";
import { fromRecipe } from "./legacy";
import type { ExperimentDocument } from "./types";
import { validateDocument } from "./validateDocument";
export function parseDocument(source: string): ExperimentDocument {
  const input: unknown = JSON.parse(source);
  if (input && typeof input === "object" && "documentVersion" in input) {
    validateDocument(input);
    return input;
  }
  return fromRecipe(parseRecipe(source));
}
export function serializeDocument(doc: ExperimentDocument) {
  validateDocument(doc);
  return JSON.stringify(doc, null, 2);
}
