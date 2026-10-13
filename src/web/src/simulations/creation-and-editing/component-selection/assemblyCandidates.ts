import { parameterLeaves } from "../../registry/contracts/controlContract";
import { publicDefinition } from "../../registry/index";
import { builtInRecipes } from "../../registry/recipes/builtIn";
import { listPremadeRecipes } from "../../registry/recipes/premade";
import type { CompositeRecipe } from "../authoring-engine/document";
import type { GenerationRequest } from "../input/contracts";
import type { TeachingIntent } from "../intent-interpreter/contracts";
export const terms = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2)
      .map((word) => word.replace(/s$/, "")),
  );
export function controls(recipe: CompositeRecipe) {
  return recipe.document.connections.filter(
    (wire) =>
      wire.kind === "command" &&
      recipe.document.nodes.some(
        (node) =>
          node.id === wire.from.node &&
          publicDefinition(node).category === "controls",
      ),
  );
}
export function assemblyCandidates(
  request: GenerationRequest,
  intent: TeachingIntent,
) {
  const query = terms(
    [
      request.prompt,
      intent.goal,
      ...intent.concepts,
      ...intent.interactions,
    ].join(" "),
  );
  const promptTerms = terms(request.prompt);
  const assemblies = [
    ...listPremadeRecipes().map(({ recipe }) => recipe),
    ...builtInRecipes,
  ].map((recipe) => {
    const models = recipe.document.nodes.filter(
      (node) => publicDefinition(node).category === "models",
    );
    const names = terms(
      [
        recipe.title,
        ...recipe.tags,
        ...models.flatMap((node) => {
          const definition = publicDefinition(node);
          return [
            definition.title,
            definition.id,
            ...definition.tags,
            ...Object.keys(definition.inputs),
            ...Object.keys(definition.outputs),
          ];
        }),
      ].join(" "),
    );
    const details = terms(
      [
        recipe.description,
        ...models.flatMap((node) => [
          publicDefinition(node).description,
          ...Object.keys(publicDefinition(node).commands),
          ...Object.keys(publicDefinition(node).outputs),
        ]),
      ].join(" "),
    );
    const capabilities = terms(
      models
        .flatMap((node) => {
          const definition = publicDefinition(node);
          return [
            ...Object.keys(definition.inputs),
            ...Object.keys(definition.outputs),
            ...Object.keys(definition.commands),
            ...(definition.configuration.type === "object"
              ? Object.keys(definition.configuration.properties)
              : []),
          ];
        })
        .join(" "),
    );
    const parameters = terms(
      models
        .flatMap((node) =>
          parameterLeaves(publicDefinition(node).configuration)
            .filter(
              (leaf) =>
                leaf.schema.type === "number" || leaf.schema.type === "integer",
            )
            .map((leaf) => leaf.path),
        )
        .join(" "),
    );
    return { recipe, names, details, models, capabilities, parameters };
  });
  const frequency = new Map<string, number>();
  for (const assembly of assemblies)
    for (const term of new Set([...assembly.names, ...assembly.details]))
      frequency.set(term, (frequency.get(term) ?? 0) + 1);
  const ranked = assemblies
    .map((assembly) => ({
      ...assembly,
      score: [...query].reduce(
        (sum, term) =>
          sum +
          (assembly.names.has(term) ? 4 : assembly.details.has(term) ? 1 : 0) *
            Math.log(1 + assemblies.length / ((frequency.get(term) ?? 0) + 1)) *
            (promptTerms.has(term) ? 2 : 1),
        0,
      ),
    }))
    .filter(({ score, models }) => score > 0 && models.length > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.recipe.document.nodes.length - b.recipe.document.nodes.length,
    )
    .slice(0, 8);
  const capabilityFrequency = new Map<string, number>();
  for (const assembly of assemblies)
    for (const term of assembly.parameters)
      capabilityFrequency.set(term, (capabilityFrequency.get(term) ?? 0) + 1);
  const adjustedWords = terms(
    intent.interactions
      .filter((interaction) =>
        /\b(?:adjust|change|control|set|vary|move|drag|resize|manipulate|increase|decrease)\b/i.test(
          interaction,
        ),
      )
      .join(" "),
  );
  const requiredCapabilities = [...promptTerms].filter(
    (term) =>
      adjustedWords.has(term) &&
      (capabilityFrequency.get(term) ?? 0) > 0 &&
      capabilityFrequency.get(term)! < assemblies.length / 4,
  );
  const cards = ranked.map(({ recipe, models }, index) => ({
    candidate: `activity${index + 1}`,
    title: recipe.title,
    description: recipe.description.slice(0, 500),
    instanceCount: models.every(
      (node) => node.definition === models[0].definition,
    )
      ? models.length
      : 1,
    models: models.slice(0, 4).map((node) => ({
      title: publicDefinition(node).title,
      description: publicDefinition(node).description.slice(0, 240),
    })),
    interactions: [
      ...new Set(
        controls(recipe).map(
          (wire) =>
            publicDefinition(
              recipe.document.nodes.find((node) => node.id === wire.to.node)!,
            ).commands[wire.to.port].description,
        ),
      ),
    ].slice(0, 12),
    observations: models.flatMap((node) => {
      const definition = publicDefinition(node);
      return [
        ...(definition.teaching?.observations ?? []),
        ...Object.keys(definition.outputs),
      ];
    }),
    limitations: recipe.assumptions
      .slice(0, 6)
      .map((limit) => limit.slice(0, 240)),
  }));
  return { ranked, cards, requiredCapabilities };
}
