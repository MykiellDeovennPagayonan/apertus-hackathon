const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const {
  catalogRecipeSlugs,
  recommendedCatalogComponents,
  catalogComponentIds,
  catalogRecipeAllowed,
} = load("src/simulations/registry/catalogScope.ts");
const { libraryChoices } = load(
  "src/simulations/builder/composition/libraryChoices.ts",
);
const { premadeRecipe } = load("src/simulations/registry/recipes/premade.ts");
const { publicDefinition, publicDefinitions } = load(
  "src/simulations/registry/index.ts",
);
const { retrieveComponentBucket } = load(
  "src/simulations/creation-and-editing/component-selection/componentCandidates.ts",
);
const { assemblyCandidates } = load(
  "src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts",
);
const { capabilityCards } = load(
  "src/simulations/creation-and-editing/component-selection/recipeCapabilities.ts",
);
const { buildTurnTools } = load(
  "src/simulations/creation-and-editing/authoring-engine/tools.ts",
);
assert.equal(catalogRecipeSlugs.length, 40);
assert.equal(new Set(recommendedCatalogComponents).size, 26);
const used = new Set(
  catalogRecipeSlugs.flatMap((slug) => {
    const recipe = premadeRecipe(slug);
    assert.ok(catalogRecipeAllowed(recipe), slug);
    return [...recipe.document.nodes, ...recipe.document.resources].map(
      (node) => node.definition,
    );
  }),
);
assert.equal(used.size, 109);
assert.ok(recommendedCatalogComponents.every((id) => !used.has(id)));
assert.equal(catalogComponentIds.size, 135);
assert.deepEqual(
  new Set(libraryChoices("all", "").map((d) => d.id)),
  catalogComponentIds,
);
assert.equal(publicDefinitions.size, 458);
for (const id of [
  "models/AIAgent",
  "prefabs/biogeochemistry/NitrogenCycle",
  "prefabs/physics/Lens",
]) {
  assert.ok(publicDefinition(id));
  assert.equal(catalogComponentIds.has(id), false);
}
assert.ok(
  libraryChoices("all", "nitrogen").every((d) => catalogComponentIds.has(d.id)),
);
assert.ok(
  libraryChoices("controls", "number").some(
    (d) => d.id === "controls/NumberInput",
  ),
);
assert.equal(catalogRecipeAllowed(premadeRecipe("nitrogen-cycle")), false);
const excludedResource = structuredClone(premadeRecipe("slope"));
excludedResource.document.resources.push({
  ...excludedResource.document.nodes[0],
  definition: "resources/Theme",
});
assert.equal(catalogRecipeAllowed(excludedResource), false);
const nested = structuredClone(premadeRecipe("slope"));
nested.nested.push({
  id: "hidden",
  recipe: "prebuilt/nitrogen-cycle",
  version: 1,
});
assert.equal(catalogRecipeAllowed(nested), false);
assert.ok(
  capabilityCards().every((card) =>
    catalogRecipeAllowed(premadeRecipe(card.recipeSlug)),
  ),
);
for (const prompt of [
  "Make a pendulum with adjustable length",
  "Change a line slope",
  "Nitrogen cycle",
  "Make an AI debate",
  "Make a bridge",
  "Help me count circles",
]) {
  const intent = {
    goal: prompt,
    concepts: [],
    interactions: [],
    observations: [],
    explicitConstraints: [],
    suggestedStructure: "single",
  };
  const bucket = retrieveComponentBucket(prompt, intent);
  assert.ok(
    bucket.every((card) =>
      card.kind === "initial"
        ? catalogComponentIds.has(card.id)
        : catalogRecipeAllowed(premadeRecipe(card.recipeSlug)),
    ),
    prompt,
  );
  const request = { prompt };
  assert.ok(
    assemblyCandidates(request, intent).ranked.every((entry) =>
      catalogRecipeAllowed(entry.recipe),
    ),
    prompt,
  );
}
const excludedCard = load(
  "src/simulations/creation-and-editing/component-selection/componentCandidates.ts",
).buildInitialCard("models/AIAgent");
assert.ok(
  !buildTurnTools(premadeRecipe("slope").document, [excludedCard]).some(
    (tool) => tool.tool === "insert_component",
  ),
);
const excludedComposite = load(
  "src/simulations/creation-and-editing/component-selection/componentCandidates.ts",
).buildCompositeCard("nitrogen-cycle");
assert.ok(
  !buildTurnTools(premadeRecipe("slope").document, [excludedComposite]).some(
    (tool) => tool.tool === "insert_recipe",
  ),
);
console.log(
  "Catalog scope: 40 recipes, 109 used + 26 retained definitions; picker and AI candidates exclude other definitions while the full registry remains loadable.",
);
