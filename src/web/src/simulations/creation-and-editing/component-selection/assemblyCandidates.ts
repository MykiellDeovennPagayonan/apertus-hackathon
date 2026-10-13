import { isPlaybackCommand } from "../../registry/contracts/interactionPolicy";
import { parameterLeaves } from "../../registry/contracts/controlContract";
import {
  inputCapability,
  namedInputRequirements,
  type InputCapability,
} from "../../registry/contracts/inputCapability";
import { publicDefinition } from "../../registry/index";
import { catalogRecipeAllowed } from "../../registry/catalogScope";
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
/** Group equivalent inputs across comparison instances without changing their bindings. */
export function adjustableBindings(recipe: CompositeRecipe) {
  const groups = new Map<
    string,
    {
      id: string;
      definition: string;
      command: string;
      field: string;
      labels: string[];
      meaning: string;
      capability: InputCapability;
      wires: ReturnType<typeof controls>;
    }
  >();
  const nodes = [...recipe.document.nodes, ...recipe.document.resources];
  for (const wire of controls(recipe)) {
    const target = nodes.find((node) => node.id === wire.to.node)!;
    const control = nodes.find((node) => node.id === wire.from.node)!;
    const definition = publicDefinition(target);
    const command = definition.commands[wire.to.port];
    if (
      (isPlaybackCommand(wire.to.port) && definition.lifecycle.clock) ||
      !parameterLeaves(command.arguments).length
    )
      continue;
    const field = String(control.configuration.parameter ?? "");
    const key = JSON.stringify([target.definition, wire.to.port, field]);
    let group = groups.get(key);
    if (!group) {
      group = {
        id: `input${groups.size + 1}`,
        definition: target.definition,
        command: wire.to.port,
        field,
        labels: [],
        meaning: command.description,
        capability: inputCapability(definition, wire.to.port, field),
        wires: [],
      };
      groups.set(key, group);
    }
    group.labels.push(String(control.configuration.label ?? control.label));
    group.wires.push(wire);
  }
  // An input shared by comparison instances must exist on every represented model.
  for (const group of groups.values())
    group.capability.names = [
      ...new Set([
        ...group.capability.names,
        ...group.labels.map((label) =>
          label.replace(/\([^)]*\)|\s*·.*$/g, "").trim(),
        ),
      ]),
    ];
  return [...groups.values()].filter((group) =>
    nodes
      .filter((node) => node.definition === group.definition)
      .every((node) => group.wires.some((wire) => wire.to.node === node.id)),
  );
}
export function matchInputBinding(
  interaction: string,
  bindings: ReturnType<typeof adjustableBindings>,
) {
  const requirements = namedInputRequirements(
    interaction,
    bindings.map((binding) => binding.capability),
  );
  if (requirements.length !== 1) return undefined;
  const matching = bindings.filter((binding) =>
    requirements[0].capabilities.includes(binding.capability.id),
  );
  return matching.length === 1 ? matching[0] : undefined;
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
  ]
    .filter(catalogRecipeAllowed)
    .map((recipe) => {
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
      return {
        recipe,
        names,
        details,
        models,
        bindings: adjustableBindings(recipe),
      };
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
    .filter(({ models }) => models.length > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.recipe.document.nodes.length - b.recipe.document.nodes.length,
    )
    .slice(0, 8);
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
  return {
    ranked,
    cards,
  };
}
