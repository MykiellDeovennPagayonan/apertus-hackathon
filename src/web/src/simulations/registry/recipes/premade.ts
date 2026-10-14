import type { CompositeRecipe } from "../../creation-and-editing/authoring-engine/document";
import { premadeSources } from "./premade.generated";
import { parseRecipe } from "../../creation-and-editing/validator/parseRecipe";
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
