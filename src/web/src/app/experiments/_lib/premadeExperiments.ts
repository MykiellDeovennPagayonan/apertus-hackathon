import { catalogRecipeSlugs } from "../../../simulations/registry/catalogScope";
import { premadeRecipe } from "../../../simulations/registry/recipes/premade";

export const premadeExperiments = Object.fromEntries(
  catalogRecipeSlugs.map((slug) => {
    const recipe = premadeRecipe(slug);
    return [
      slug,
      {
        title: recipe.title,
        description: recipe.description,
        icon: recipe.catalog.icon,
        category: recipe.catalog.category,
        parameters: {},
      },
    ];
  }),
);
