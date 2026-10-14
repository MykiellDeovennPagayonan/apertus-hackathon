import {
  migrateControlDependencies,
  migrateControls,
} from "../../legacy/compatibility/migrateControls";
import { validateRecipe } from "./recipe";
import type { CompositeRecipe } from "../authoring-engine/document";
export function parseRecipe(source: unknown): CompositeRecipe {
  const candidate =
    typeof source === "string" ? JSON.parse(source) : structuredClone(source);
  if (candidate?.document) {
    const original = candidate.document;
    const migrated = migrateControls(original);
    candidate.document = migrated;
    if (
      Array.isArray(candidate.dependencies) &&
      Array.isArray(original.nodes)
    ) {
      candidate.dependencies = migrateControlDependencies(
        original,
        migrated,
        candidate.dependencies,
      );
    }
  }
  validateRecipe(candidate);
  return candidate;
}
