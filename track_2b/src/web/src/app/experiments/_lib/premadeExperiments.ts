import { premadeRecipe } from "../../../simulations/registry/recipes/premade";

export const premadeExperiments = Object.fromEntries(
  [
    "projectile",
    "pythagorean",
    "acid-base-titration",
    "tile-patterns",
    "cell-division",
    "area-perimeter",
    "coordinates",
    "slope",
    "pendulum",
    "arithmetic",
    "can-material",
    "pulleys",
  ].map((slug) => {
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
