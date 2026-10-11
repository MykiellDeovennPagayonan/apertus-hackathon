import {
  publicDefinition,
  publicDefinitions,
} from "../../simulations/components/catalog";
import { recipeOverrideSchema } from "../../simulations/runtime/authoring/operations";
import type { AuthoredDocument } from "../../simulations/runtime/authoring/types";
import {
  listPremadeRecipes,
  premadeRecipe,
} from "../../simulations/runtime/recipes/registry";
import type { TeachingIntent } from "./schema";

/** Readiness only. Titles, values, schemas and meaning are projected from their owners. */
export const generationEligibility = [
  { slug: "arithmetic", version: 1 },
  { slug: "area-perimeter", version: 1 },
  { slug: "bridge", version: 1 },
  { slug: "market-equilibrium", version: 1 },
  { slug: "price-elasticity", version: 1 },
  { slug: "cost-and-profit", version: 1 },
  { slug: "trade-and-tariffs", version: 1 },
  { slug: "monopoly-pricing", version: 1 },
  { slug: "acid-base-titration", version: 1 },
  { slug: "gas-equilibrium", version: 1 },
  { slug: "phase-change", version: 1 },
  { slug: "beer-lambert", version: 1 },
  { slug: "galvanic-cell", version: 1 },
] as const;
export type CapabilityCard = {
  id: string;
  version: number;
  recipeSlug: string;
  summary: string;
  supports: string[];
  limitations: string[];
  interactionNames: string[];
  observationNames: string[];
  names: string[];
};
export function capabilityCards(): CapabilityCard[] {
  return listPremadeRecipes()
    .filter(({ slug, recipe }) =>
      generationEligibility.some(
        (entry) => entry.slug === slug && entry.version === recipe.version,
      ),
    )
    .map(({ slug, recipe }) => {
      const model = recipe.document.nodes
        .map((n) => publicDefinition(n.definition))
        .find((d) => d.teaching);
      if (!model?.teaching)
        throw new Error(`${slug}: missing teaching contract`);
      return {
        id: recipe.id,
        version: recipe.version,
        recipeSlug: slug,
        summary: recipe.description,
        supports: [...model.teaching.concepts],
        limitations: [...model.teaching.limitations, ...recipe.assumptions],
        interactionNames: [...model.teaching.interactions],
        observationNames: [...model.teaching.observations],
        names: [
          recipe.title,
          ...recipe.tags,
          ...model.teaching.concepts,
          ...model.teaching.keywords,
        ],
      };
    });
}
const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const contains = (text: string, phrase: string) =>
  ` ${words(text)} `.includes(` ${words(phrase)} `);
export function retrieveCapabilities(
  prompt: string,
  intent: TeachingIntent,
  broader = false,
) {
  const summary = [prompt, intent.goal, ...intent.concepts].join(" ");
  const ranked = capabilityCards()
    .map((card) => {
      // A model's interpretation alone cannot turn weight or momentum into a bridge request.
      const grounded = card.supports.filter((concept) =>
        contains(prompt, concept),
      ).length;
      const identity =
        contains(prompt, card.recipeSlug) || contains(prompt, card.names[0]);
      const keyword = card.names.filter((name) =>
        contains(prompt, name),
      ).length;
      const score =
        grounded * 4 +
        (identity ? 8 : 0) +
        keyword +
        card.supports.filter((concept) => contains(summary, concept)).length;
      const useful = grounded > 0 || identity || keyword >= (broader ? 2 : 3);
      return { card, score, useful };
    })
    .filter((entry) => entry.useful)
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id));
  return ranked.slice(0, 8);
}
export function selectedContract(slug: string) {
  const recipe = premadeRecipe(slug);
  const selected = capabilityCards().find((c) => c.recipeSlug === slug);
  if (!selected) throw new Error("Recipe is not eligible for generation");
  const definitions = [
    ...new Set(
      recipe.document.nodes
        .filter(
          (n) =>
            !["models/TrussJoint", "models/TrussMember"].includes(n.definition),
        )
        .map((n) => n.definition),
    ),
  ].map((id) => {
    const def = publicDefinition(id);
    return {
      id,
      version: def.version,
      title: def.title,
      category: def.category,
      commands: def.commands,
      outputs: def.outputs,
    };
  });
  return {
    recipe: slug,
    version: recipe.version,
    title: recipe.title,
    parameters: recipeOverrideSchema(recipe),
    startingValues: Object.fromEntries(
      recipe.parameters.map((p) => [p.name, p.default]),
    ),
    limitations: selected.limitations,
    definitions,
  };
}
export function activeHandles(document: AuthoredDocument) {
  return document.nodes
    .filter(
      (n) =>
        n.definition.startsWith("prefabs/earth-atmosphere/") ||
        [
          "models/arithmetic",
          "models/area-perimeter",
          "models/BridgeResponse",
          "models/BridgeLoad",
        ].includes(n.definition),
    )
    .slice(0, 12)
    .map((n) => {
      const def = publicDefinition(n.definition);
      return {
        target: n.id,
        label: n.label,
        definition: n.definition,
        configuration: n.configuration,
        configurationSchema: def.configuration,
        commands: def.commands,
        outputs: def.outputs,
      };
    });
}
export function compatibleComponents() {
  return [...publicDefinitions.values()]
    .filter((d) =>
      [
        "displays/Text",
        "displays/Readout",
        "displays/Inspector",
        "controls/Slider",
        "controls/NumberInput",
        "controls/Toggle",
        "controls/Select",
        "controls/Button",
      ].includes(d.id),
    )
    .map((d) => ({
      id: d.id,
      version: d.version,
      configuration: d.configuration,
    }));
}
