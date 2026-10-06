import type { CompositeRecipe } from "../authoring/types";
import { premadeSources } from "./premadeRegistry.generated";
import { parseRecipe } from "./schema";
export function hasPremadeRecipe(
  slug: string,
): slug is keyof typeof premadeSources {
  return Object.hasOwn(premadeSources, slug);
}
export function premadeRecipe(
  slug: string,
): CompositeRecipe & { catalog: NonNullable<CompositeRecipe["catalog"]> } {
  if (!hasPremadeRecipe(slug))
    throw new Error(`Unknown premade recipe: ${slug}`);
  const recipe = parseRecipe(premadeSources[slug]);
  if (!recipe.catalog) throw new Error(`${slug}: missing catalog metadata`);
  return { ...recipe, catalog: recipe.catalog };
}
export function listPremadeRecipes() {
  return Object.keys(premadeSources)
    .map((slug) => ({ slug, recipe: premadeRecipe(slug) }))
    .sort(
      (a, b) =>
        a.recipe.catalog.order - b.recipe.catalog.order ||
        a.recipe.id.localeCompare(b.recipe.id),
    );
}
