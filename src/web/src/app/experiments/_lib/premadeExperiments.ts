import { listPremadeRecipes } from "../../../simulations/registry/recipes/premade";

const entries: Record<
  string,
  {
    title: string;
    description: string;
    icon: string;
    parameters: Record<string, unknown>;
  }
> = {
  ...Object.fromEntries(
    listPremadeRecipes().map(({ slug, recipe }) => [
      slug,
      {
        title: recipe.title,
        description: recipe.description,
        icon: recipe.catalog.icon,
        parameters: {},
      },
    ]),
  ),
  gas: {
    title: "Gas pressure",
    description: "Squeeze a gas and discover how volume changes pressure.",
    icon: "◌",
    parameters: {},
  },
  town: {
    title: "Living town",
    description: "Watch citizens follow their daily routines in 3D.",
    icon: "⌂",
    parameters: {},
  },
};

// Preserve legacy catalog positions; migrated order comes from recipe metadata.
const order = new Map<string, number>([
  ...listPremadeRecipes().map(
    ({ slug, recipe }) => [slug, recipe.catalog.order] as [string, number],
  ),
  ["gas", 4.5],
  ["town", 5],
]);
export const premadeExperiments = Object.fromEntries(
  Object.entries(entries).sort(
    ([a], [b]) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity),
  ),
) as typeof entries;
