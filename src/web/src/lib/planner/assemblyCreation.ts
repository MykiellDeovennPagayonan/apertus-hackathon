import { publicDefinition } from "../../simulations/components/catalog";
import { builtInRecipes } from "../../simulations/components/composites/catalog";
import { parameterLeaves } from "../../simulations/components/controls/controlContract";
import {
  finalizeRecipe,
  recipeOverrideSchema,
} from "../../simulations/runtime/authoring/operations";
import {
  insertRecipe,
  removeNodes,
} from "../../simulations/runtime/authoring/recipes";
import {
  emptyAuthoredDocument,
  type CompositeRecipe,
} from "../../simulations/runtime/authoring/types";
import { listPremadeRecipes } from "../../simulations/runtime/recipes/registry";
import {
  choice,
  object,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { requestStructured } from "../apertus/transport";
import { toJsonSchema } from "../apertus/structuredSchema";
import { parseArgumentJson } from "./argumentJson";
import type { GenerationBudget } from "./budget";
import type { CapabilityCard } from "./catalog";
import { PlannerError } from "./errors";
import type {
  GenerationRequest,
  GenerationResult,
  TeachingIntent,
} from "./schema";
import { selectCapability } from "./selection/selectCapability";
import { learnerPresentation } from "./learnerPresentation";
import { isPlaybackCommand } from "../../simulations/components/controls/interactionPolicy";
import { acceptedCommandArguments } from "../../simulations/components/controls/commandPresentation";

const text = (maxLength = 240) => ({
  type: "string" as const,
  minLength: 1,
  maxLength,
});
type AssemblyPlan = {
  activities: string[];
  title: string;
  instruction: string;
  omitted: string[];
};
const terms = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2)
      .map((word) => word.replace(/s$/, "")),
  );

function controls(recipe: CompositeRecipe) {
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

/** Discover complete assemblies from both catalogs; inference never authors their wiring. */
export async function createFromAssemblies(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
): Promise<GenerationResult> {
  budget.enableCompositionMode();
  budget.trace?.("selection.start", {});
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
  const observedWords = terms(intent.observations.join(" "));
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
      (!observedWords.has(term) || adjustedWords.has(term)) &&
      (capabilityFrequency.get(term) ?? 0) > 0 &&
      capabilityFrequency.get(term)! < assemblies.length / 4,
  );
  if (!ranked.length)
    return {
      protocolVersion: 1,
      status: "unsupported",
      requestId: request.requestId,
      message: "I couldn't find an available model for this experiment.",
    };
  const cards = ranked.map(({ recipe, models }, index) => ({
    candidate: `activity${index + 1}`,
    title: recipe.title,
    description: recipe.description.slice(0, 500),
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
    limitations: recipe.assumptions
      .slice(0, 6)
      .map((limit) => limit.slice(0, 240)),
  }));
  budget.trace?.("retrieval", cards);
  let recommendation: string | undefined;
  if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
    const capabilities: CapabilityCard[] = cards.map((card, index) => ({
      id: card.candidate,
      version: ranked[index].recipe.version,
      recipeSlug: card.candidate,
      summary: `${card.title}: ${card.description}`,
      supports: card.models.map((model) => model.title),
      limitations: card.limitations,
      interactionNames: card.interactions,
      observationNames: [],
      names: [card.title],
    }));
    const selected = await selectCapability(
      request.prompt,
      intent,
      capabilities,
      budget,
      () => budget.decision,
    );
    if (selected.status === "selected")
      recommendation = selected.capability.recipeSlug;
    // Uncertainty is a retrieval hint, not evidence that a supported experiment is impossible.
  }
  const selectionSchema = object({
    activities: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: choice(...cards.map((card) => card.candidate)),
    },
    omitted: { type: "array", minItems: 0, maxItems: 6, items: text() },
  });
  budget.trace?.("stage", { task: "select_capability" });
  const groundedIndex = ranked.findIndex(
    (assembly) =>
      requiredCapabilities.length > 0 &&
      requiredCapabilities.every((capability) =>
        assembly.capabilities.has(capability),
      ) &&
      assembly.models.some((node) =>
        [...terms(`${publicDefinition(node).title} ${node.definition}`)].some(
          (term) =>
            promptTerms.has(term) &&
            (frequency.get(term) ?? 0) < assemblies.length / 4,
        ),
      ),
  );
  const plan: AssemblyPlan =
    groundedIndex >= 0
      ? {
          activities: Array.from(
            {
              length:
                intent.instanceCount ??
                (intent.suggestedStructure === "comparison" ? 2 : 1),
            },
            () => cards[groundedIndex].candidate,
          ),
          title: (intent.question ?? intent.goal).slice(0, 120),
          instruction: intent.question ?? intent.goal,
          omitted: [],
        }
      : await requestStructured<AssemblyPlan>(
          [
            {
              role: "system",
              content:
                "Select working activities for the requested experiment. Return ONLY activities and omitted. activities is an array of candidate ID STRINGS, never activity objects. Select ONE ID for a single model type, including comparisons of that same model. The application creates the requested number of independent copies. Select multiple IDs only for explicitly different model types. Honor requiredCapabilities. Equivalent implementations are alternatives. Check the real descriptions and interactions. The recommendation is advisory. Independent activities cannot be claimed as a coupled simulation unless an activity implements that relationship. omitted lists unavailable behavior; activities is [] if the core behavior is unavailable. Do not write lesson text, copy activity objects or author any wiring.",
            },
            {
              role: "user",
              content: JSON.stringify({
                request: request.prompt,
                intent,
                recommendation,
                requiredCapabilities,
                candidates: cards,
                exampleResponse: {
                  activities: [cards[0].candidate],
                  omitted: [],
                },
                responseSchema: toJsonSchema(selectionSchema),
              }),
            },
          ],
          (content) => {
            const { value } = parseArgumentJson(content);
            validateValue(selectionSchema, value);
            const selected = value as Pick<
              AssemblyPlan,
              "activities" | "omitted"
            >;
            const count =
              intent.instanceCount ??
              (intent.suggestedStructure === "comparison" ? 2 : 1);
            const result: AssemblyPlan = {
              ...selected,
              title: (intent.question ?? intent.goal).slice(0, 120),
              instruction: intent.question ?? intent.goal,
              activities:
                selected.activities.length === 1
                  ? Array.from({ length: count }, () => selected.activities[0])
                  : selected.activities,
            };
            if (result.activities.length > 3)
              throw new Error(
                "Use at most three total independent activity instances.",
              );
            const available = new Set(
              result.activities.flatMap((candidate) => [
                ...ranked[
                  cards.findIndex((card) => card.candidate === candidate)
                ].capabilities,
              ]),
            );
            const missing = requiredCapabilities.filter(
              (capability) => !available.has(capability),
            );
            if (result.activities.length && missing.length)
              throw new Error(
                `Selected activities lack requested capabilities: ${missing.join(", ")}. Select activities whose real contracts support these values. Do not substitute an unrelated activity.`,
              );
            if (
              result.activities.length &&
              intent.instanceCount &&
              result.activities.length !== intent.instanceCount
            )
              throw new Error(
                `Preserve the accepted request's ${intent.instanceCount} independent instances. Adjust count and activities; do not substitute a different number.`,
              );
            if (
              intent.suggestedStructure === "comparison" &&
              result.activities.length === 1
            )
              throw new Error(
                "The accepted request is a comparison. Supply at least two independent activity instances; repeat the same activity ID to compare the same model. One instance cannot fulfill this request.",
              );
            return result;
          },
          "Return only activities as an array of supplied ID strings and omitted as an array of unavailable behaviors. The application supplies instance counts and lesson text.",
          budget.signal,
          {
            budget,
            stage: "assembly_plan",
            schema: toJsonSchema(selectionSchema),
            maxTokens: 256,
            onEvent: (event, data) =>
              budget.trace?.(`assembly_plan.${event}`, data),
          },
        );
  if (!plan.activities.length)
    return {
      protocolVersion: 1,
      status: "unsupported",
      requestId: request.requestId,
      message:
        plan.omitted.join("; ") ||
        "The available models cannot represent that experiment.",
    };
  const selectedCapabilities = new Set(
    plan.activities.flatMap((candidate) => [
      ...ranked[cards.findIndex((card) => card.candidate === candidate)]
        .capabilities,
    ]),
  );
  const observableTerms = new Set(
    assemblies.flatMap((assembly) =>
      assembly.models.flatMap((node) => [
        ...terms(Object.keys(publicDefinition(node).outputs).join(" ")),
      ]),
    ),
  );
  const observationWords = terms(intent.observations.join(" "));
  const missingObservations = [...promptTerms].filter(
    (term) =>
      observationWords.has(term) &&
      observableTerms.has(term) &&
      !selectedCapabilities.has(term),
  );
  for (const term of missingObservations)
    plan.omitted.push(`The selected model does not provide ${term}.`);
  let document = emptyAuthoredDocument();
  const assumptions: string[] = [];
  const requestedWires: { node: string; command: string }[] = [];
  const priorConfigurations: {
    activity: string;
    overrides: Record<string, unknown>;
  }[] = [];
  for (const [index, candidate] of plan.activities.entries()) {
    const source =
      ranked[cards.findIndex((card) => card.candidate === candidate)].recipe;
    const wires = controls(source);
    const commands = [
      ...new Set(wires.map((wire) => `${wire.to.node}.${wire.to.port}`)),
    ];
    const commandCards = commands.map((id) => {
      const wire = wires.find(
        (wire) => `${wire.to.node}.${wire.to.port}` === id,
      )!;
      const control = source.document.nodes.find(
        (node) => node.id === wire.from.node,
      )!;
      const key =
        commands.filter((command) => command.endsWith(`.${wire.to.port}`))
          .length === 1
          ? wire.to.port
          : id;
      return {
        id: key,
        endpoint: id,
        description: publicDefinition(
          source.document.nodes.find((node) => node.id === wire.to.node)!,
        ).commands[wire.to.port].description,
        aliases: [
          id,
          wire.to.port,
          wire.to.port.replace(/^(?:set:|SET_)/, ""),
          control.id,
          control.label,
          String(control.configuration.label ?? ""),
        ],
      };
    });
    const schema = object({
      overrides: recipeOverrideSchema(source),
      controls: {
        type: "array",
        minItems: 0,
        maxItems: Math.min(3, commands.length),
        items: commands.length
          ? choice(...commandCards.map((command) => command.id))
          : text(),
      },
    });
    budget.trace?.("stage", { task: "configure_selected_recipe" });
    const configuration = await requestStructured<{
      overrides: Record<string, unknown>;
      controls: string[];
    }>(
      [
        {
          role: "system",
          content:
            "Configure this instance for ONE learning question. Return ONLY overrides and controls. overrides is a patch of exposed starting settings: use {} unless the user requests starting values; preserve exact quantities and units. A requested different-condition comparison needs distinct values; consult priorConfigurations. controls MUST be an array of command ID STRINGS, never objects. Include every requested adjustable value, but never expose the full model capability list. Do not add unrelated amplitude, starting-condition, playback, step or reset controls. Keep at most three essential controls across the whole experiment, unless the explicit task needs more. Do not invent commands, settings or effects. Independent instances need independent controls. Motion safety and recovery are supplied by the application. Return values, not schemas.",
        },
        {
          role: "user",
          content: JSON.stringify({
            request: request.prompt,
            intent,
            activity: source.title,
            instance: index + 1,
            instances: plan.activities.length,
            priorConfigurations,
            commands: commandCards.map(({ id, description }) => ({
              id,
              description,
            })),
            parameters: source.parameters.map((parameter) => ({
              name: parameter.name,
              default: parameter.default,
              schema: parameter.schema,
            })),
            responseSchema: toJsonSchema(schema),
            exampleResponse: {
              overrides: {},
              controls: commandCards
                .filter((command) => !/reset|restart/i.test(command.id))
                .slice(0, 1)
                .map((command) => command.id),
            },
          }),
        },
      ],
      (content) => {
        let { value } = parseArgumentJson(content);
        if (
          value &&
          typeof value === "object" &&
          Array.isArray((value as { controls?: unknown }).controls)
        ) {
          const response = value as {
            overrides: Record<string, unknown>;
            controls: unknown[];
          };
          value = {
            ...response,
            controls: response.controls.map((control) => {
              if (
                control &&
                typeof control === "object" &&
                Object.keys(control).length === 1 &&
                "id" in control &&
                typeof control.id === "string"
              )
                control = control.id;
              if (typeof control !== "string") return control;
              if (commandCards.some((command) => command.id === control))
                return control;
              const matching = commandCards.filter((command) =>
                command.aliases.some(
                  (alias) => alias.toLowerCase() === control.toLowerCase(),
                ),
              );
              return matching.length === 1 ? matching[0].id : control;
            }),
          };
        }
        validateValue(schema, value);
        const result = value as {
          overrides: Record<string, unknown>;
          controls: string[];
        };
        result.controls = result.controls.map(
          (id) => commandCards.find((command) => command.id === id)!.endpoint,
        );
        const requestedCommands = commands.filter((command) =>
          [...terms(command.split(".").at(-1)!)].some(
            (term) =>
              requiredCapabilities.includes(term) || adjustedWords.has(term),
          ),
        );
        // Grounded adjustments limit exposure; inference must not add unrelated settings.
        if (requestedCommands.length)
          result.controls = result.controls.filter((command) =>
            requestedCommands.includes(command),
          );
        if (result.controls.some((command) => !commands.includes(command)))
          throw new Error("Choose a command actually wired in this activity");
        if (intent.comparisonConditions === "different") {
          for (const previous of priorConfigurations.filter(
            (previous) => previous.activity === source.id,
          )) {
            const stateFor = (
              overrides: Record<string, unknown>,
              target: string,
            ) => {
              const node = source.document.nodes.find(
                (node) => node.id === target,
              )!;
              const state = {
                ...structuredClone(publicDefinition(node).defaults),
                ...structuredClone(node.configuration),
              };
              for (const parameter of source.parameters.filter(
                (parameter) => parameter.node === target,
              ))
                if (Object.hasOwn(overrides, parameter.name))
                  state[parameter.field] = structuredClone(
                    overrides[parameter.name],
                  );
              return state;
            };
            const adjustable = wires.filter((wire) =>
              requiredCapabilities.some((capability) =>
                terms(wire.to.port).has(capability),
              ),
            );
            const accepted = adjustable
              .map((wire) => ({
                command: wire.to.port,
                current: acceptedCommandArguments(
                  wire.to.port,
                  stateFor(result.overrides, wire.to.node),
                ),
                previous: acceptedCommandArguments(
                  wire.to.port,
                  stateFor(previous.overrides, wire.to.node),
                ),
              }))
              .filter((value) => value.current && value.previous);
            if (
              accepted.length &&
              accepted.every(
                (value) =>
                  JSON.stringify(value.current) ===
                  JSON.stringify(value.previous),
              )
            )
              throw new Error(
                `The requested ${accepted.map((value) => value.command).join(", ")} values are identical to the previous instance. Choose genuinely different initial values, including derived properties; changing labels or unrelated settings is insufficient.`,
              );
            const requested = source.parameters.filter((parameter) =>
              [...terms(parameter.name)].some((term) =>
                requiredCapabilities.includes(term),
              ),
            );
            const compared = requested.length ? requested : source.parameters;
            if (
              !accepted.length &&
              compared.length &&
              compared.every(
                (parameter) =>
                  JSON.stringify(
                    result.overrides[parameter.name] ?? parameter.default,
                  ) ===
                  JSON.stringify(
                    previous.overrides[parameter.name] ?? parameter.default,
                  ),
              )
            )
              throw new Error(
                `The comparison requests different starting conditions, but these ${compared.map((parameter) => parameter.name).join(", ")} values match the previous instance. Choose different requested values within their contracts; preserve unrelated settings.`,
              );
          }
        }
        for (const capability of requiredCapabilities) {
          const matching = wires.filter((wire) =>
            terms(wire.to.port).has(capability),
          );
          if (
            matching.length &&
            !matching.some((wire) =>
              result.controls.includes(`${wire.to.node}.${wire.to.port}`),
            )
          )
            throw new Error(
              `The requested ${capability} adjustment needs a persistent control. Include ${matching.map((wire) => `${wire.to.node}.${wire.to.port}`).join(" or ")}.`,
            );
        }
        if (
          intent.interactions.length &&
          commands.some((command) => !/reset$/i.test(command)) &&
          !result.controls.length
        )
          throw new Error(
            "The requested interactive experiment needs persistent controls. Select the requested commands.",
          );
        return result;
      },
      "Return overrides as values and every requested persistent control using exact command IDs.",
      budget.signal,
      {
        budget,
        stage: "assembly_configuration",
        schema: toJsonSchema(schema),
        maxTokens: 768,
        onEvent: (event, data) =>
          budget.trace?.(`assembly_configuration.${event}`, data),
      },
    );
    const keep = new Set(configuration.controls);
    priorConfigurations.push({
      activity: source.id,
      overrides: configuration.overrides,
    });
    const discard = source.document.nodes
      .filter(
        (node) =>
          publicDefinition(node).category === "controls" &&
          wires.some((wire) => wire.from.node === node.id) &&
          !wires.some(
            (wire) =>
              wire.from.node === node.id &&
              (keep.has(`${wire.to.node}.${wire.to.port}`) ||
                (isPlaybackCommand(wire.to.port) &&
                  publicDefinition(
                    source.document.nodes.find(
                      (target) => target.id === wire.to.node,
                    )!,
                  ).lifecycle.clock)),
          ),
      )
      .map((node) => node.id);
    // Apply parameter overrides before pruning so exposed parameters retain their real targets.
    const instance = structuredClone(source.document);
    for (const [name, value] of Object.entries(configuration.overrides)) {
      const parameter = source.parameters.find(
        (parameter) => parameter.name === name,
      )!;
      const node = [...instance.nodes, ...instance.resources].find(
        (node) => node.id === parameter.node,
      )!;
      node.configuration[parameter.field] = structuredClone(value);
    }
    const pruned = removeNodes(instance, discard);
    pruned.lesson = structuredClone(source.document.lesson);
    if (plan.activities.length > 1) {
      for (const layout of pruned.layout.children)
        if (layout.label) layout.label = `${layout.label} (${index + 1})`;
      for (const node of pruned.nodes.filter(
        (node) => publicDefinition(node).category === "controls",
      )) {
        node.label = `${source.title} ${index + 1}: ${node.label}`;
        const contract = publicDefinition(node).configuration;
        if (contract.type === "object" && contract.properties.label)
          node.configuration.label = `${source.title} ${index + 1}: ${node.configuration.label ?? node.label}`;
      }
    }
    const assembly = finalizeRecipe(pruned, {
      id: source.id,
      assumptions: source.assumptions,
      tags: source.tags,
    });
    const prefix = `activity_${index + 1}`;
    document = insertRecipe(
      document,
      assembly,
      () => {
        throw new Error("Activity must be fully expanded");
      },
      (id) => `${prefix}/${id}`,
    );
    for (const wire of wires.filter((wire) =>
      keep.has(`${wire.to.node}.${wire.to.port}`),
    ))
      requestedWires.push({
        node: `${prefix}/${wire.to.node}`,
        command: wire.to.port,
      });
    assumptions.push(...source.assumptions);
  }
  document.lesson = {
    title: plan.title,
    instruction: plan.omitted.length
      ? plan.omitted.join(" ")
      : plan.instruction,
    explanation: [...new Set([...plan.omitted, ...assumptions])].join("\n"),
  };
  document = learnerPresentation(document, intent);
  budget.trace?.("validation.start", {});
  for (const required of requestedWires) {
    if (
      !document.connections.some(
        (wire) =>
          wire.kind === "command" &&
          wire.to.node === required.node &&
          wire.to.port === required.command,
      )
    )
      throw new PlannerError(
        `Missing requested interaction: ${required.command}`,
        502,
      );
  }
  const recipe = finalizeRecipe(document, {
    id: `generated/${request.requestId}`,
    assumptions: [...new Set(assumptions)],
    tags: [...intent.concepts],
  });
  await budget.construction?.publish(recipe.document, 1, "checking");
  return {
    protocolVersion: 1,
    status: "created",
    requestId: request.requestId,
    expectedSessionId: null,
    expectedAuthoredRevision: null,
    recipe,
    coverage: {
      level: plan.omitted.length ? "partial" : "full",
      covered: intent.concepts.filter(
        (concept) =>
          !missingObservations.some((term) => terms(concept).has(term)),
      ),
      omitted: plan.omitted,
      explanation: plan.omitted.join("; "),
    },
  };
}
