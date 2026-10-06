import { validateRecipe } from "../../runtime/authoring/recipes";
import type { CompositeRecipe } from "../../runtime/authoring/types";
import gasPressureRecipe from "../../pre-made/gas/gas-pressure.recipe.json";

/** Load the authored recipe independently for each lesson, import, or remix. */
export function loadGasPressureRecipe(): CompositeRecipe {
  const recipe = structuredClone(gasPressureRecipe) as CompositeRecipe;
  validateRecipe(recipe);
  return recipe;
}
