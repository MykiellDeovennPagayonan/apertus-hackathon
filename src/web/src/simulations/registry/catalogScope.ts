import type { CompositeRecipe } from "../creation-and-editing/authoring-engine/document";
import { premadeSources } from "./recipes/premade.generated";

// Shared scope for the experiment catalog, builder discovery and AI retrieval.
export const catalogRecipeSlugs = [
  "projectile",
  "price-elasticity",
  "pythagorean",
  "acid-base-titration",
  "cost-and-profit",
  "tree-height",
  "galvanic-cell",
  "craft-production",
  "tile-patterns",
  "wildfire",
  "can-material",
  "survey-sampling",
  "levers",
  "pulleys",
  "bicycle-gears",
  "tipping",
  "collisions",
  "hydraulics",
  "buoyancy",
  "doppler-siren",
  "guitar-string",
  "cooling-drinks",
  "magnet-induction",
  "rc-circuit",
  "fraction-number-line",
  "cell-division",
  "area-perimeter",
  "beer-lambert",
  "arithmetic",
  "gas-equilibrium",
  "phase-change",
  "coordinates",
  "water-pressure",
  "voting-systems",
  "counting",
  "equal-groups",
  "pendulum",
  "slope",
  "bridge",
  "shared-fishing-lake",
] as const;

export const recommendedCatalogComponents = [
  "controls/NumberInput",
  "controls/Toggle",
  "controls/Form",
  "controls/TextInput",
  "displays/Chart",
  "displays/DataTable",
  "displays/Formula",
  "displays/Histogram",
  "displays/Heatmap",
  "displays/Legend",
  "layout/Stack",
  "layout/Row",
  "layout/Grid",
  "layout/Panel",
  "layout/Split",
  "layout/Disclosure",
  "data/Expression",
  "data/FieldSelector",
  "data/Literal",
  "data/Literal-record",
  "data/Literal-list",
  "data/CentimetresToMetres",
  "data/UnitConversion",
  "resources/Dataset",
  "prefabs/AuthoredSquare",
  "prefabs/AuthoredFractionBar",
] as const;

export const catalogComponentIds: ReadonlySet<string> = new Set([
  ...catalogRecipeSlugs.flatMap((slug) => {
    const document = premadeSources[slug].document;
    return [...document.nodes, ...document.resources].map(
      (node) => node.definition,
    );
  }),
  ...recommendedCatalogComponents,
]);

/** Assemblies must not offer a back door to excluded definitions. */
export function catalogRecipeAllowed(recipe: CompositeRecipe) {
  return (
    recipe.nested.length === 0 &&
    [...recipe.document.nodes, ...recipe.document.resources].every((node) =>
      catalogComponentIds.has(node.definition),
    )
  );
}
