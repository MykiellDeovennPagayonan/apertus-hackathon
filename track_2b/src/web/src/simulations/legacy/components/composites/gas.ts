import { validateRecipe } from "../../../creation-and-editing/validator/recipe";
import type { CompositeRecipe } from "../../../creation-and-editing/authoring-engine/document";
import gasPressureRecipe from "../../../pre-made/gas/gas-pressure.recipe.json";

/** Load the authored recipe independently for each lesson, import, or remix. */
export function loadGasPressureRecipe(): CompositeRecipe {
  const recipe = structuredClone(gasPressureRecipe) as CompositeRecipe;
  validateRecipe(recipe);
  return recipe;
}
