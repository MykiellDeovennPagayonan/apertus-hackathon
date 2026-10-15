import {
  migrateControlDependencies,
  migrateControls,
} from "../../legacy/compatibility/migrateControls";
import type { CompositeRecipe } from "../authoring-engine/document";
import { htmlComponent } from "./componentEvidence";
import { validateRecipe } from "./recipe";
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
  if (candidate?.recipeVersion === 1 && htmlComponent(candidate))
    candidate.recipeVersion = 2;
  validateRecipe(candidate);
  return candidate;
}
