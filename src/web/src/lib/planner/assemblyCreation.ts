import { publicDefinition } from "../../simulations/components/catalog";
import { builtInRecipes } from "../../simulations/components/composites/catalog";
import { acceptedCommandArguments } from "../../simulations/components/controls/commandPresentation";
import { parameterLeaves } from "../../simulations/components/controls/controlContract";
import { isPlaybackCommand } from "../../simulations/components/controls/interactionPolicy";
import {
  finalizeRecipe,
  recipeOverrideSchema,
} from "../../simulations/runtime/authoring/operations";
import {
  insertRecipe,
  removeNodes,
} from "../../simulations/runtime/authoring/recipes";
import {
  type CompositeRecipe,
  emptyAuthoredDocument,
} from "../../simulations/runtime/authoring/types";
import {
  choice,
  object,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { listPremadeRecipes } from "../../simulations/runtime/recipes/registry";
import { toJsonSchema } from "../apertus/structuredSchema";
import { requestStructured } from "../apertus/transport";
import type { ChoiceQuestion } from "../decisions/contracts";
import { parseArgumentJson } from "./argumentJson";
import type { GenerationBudget } from "./budget";
import type { CapabilityCard } from "./catalog";
import { PlannerError } from "./errors";
import { learnerPresentation } from "./learnerPresentation";
import type {
  GenerationRequest,
  GenerationResult,
  TeachingIntent,
} from "./schema";
import { acceptChoice } from "./selection/acceptance";
import { selectCapability } from "./selection/selectCapability";

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
  budget.trace?.("retrieval", cards);
  let recommendation: string | undefined;
  if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
    const capabilities: CapabilityCard[] = cards.map((card, index) => ({
      id: card.candidate,
      version: ranked[index].recipe.version,
      recipeSlug: card.candidate,
      summary: `${card.title}: ${card.description}`,
      supports: ranked[index].models.flatMap((node) => {
        const definition = publicDefinition(node);
        return definition.teaching?.concepts ?? [definition.title];
      }),
      limitations: card.limitations,
      interactionNames: card.interactions,
      observationNames: card.observations,
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
  const count =
    intent.instanceCount ??
    (intent.suggestedStructure === "comparison" ? 2 : 1);
  const slots = Array.from(
    { length: count },
    (_, index) => `experiment${index + 1}`,
  );
  const example = cards.find((card) => count % card.instanceCount === 0);
  const selectionSchema = object({
    ...Object.fromEntries(
      slots.map((slot) => [
        slot,
        choice(
          ...cards.map((card) => card.candidate),
          "covered",
          "unavailable",
        ),
      ]),
    ),
    omitted: { type: "array", minItems: 0, maxItems: 6, items: text() },
  });
  budget.trace?.("stage", { task: "select_capability" });
  const plan = await requestStructured<AssemblyPlan>(
    [
      {
        role: "system",
        content:
          "Choose one candidate ID STRING for each supplied experiment slot. Return ONLY those exact slot keys and omitted. Never return an activities array or copy the candidate list. Slots count independent model instances, NOT whole activities. Each candidate declares instanceCount: if an activity already contains the requested comparison, select it once and mark the remaining slots covered. Repeat an ID only when another copy is needed to reach the requested instance count. Choose different model types only when requested. Honor requiredCapabilities and the accepted teaching goal, interactions and observations together; a matching topic word alone is insufficient. Equivalent implementations are alternatives. Check the real descriptions and interactions. The recommendation is advisory. Independent activities cannot be claimed as a coupled simulation unless an activity implements that relationship. Use unavailable for unsupported core behavior and explain it in omitted. Do not author lesson text or wiring.",
      },
      {
        role: "user",
        content: JSON.stringify({
          request: request.prompt,
          intent,
          recommendation,
          requiredCapabilities,
          candidates: cards,
          experimentSlots: slots,
          exampleResponse: example
            ? {
                ...Object.fromEntries(
                  slots.map((slot, index) => [
                    slot,
                    index % example.instanceCount === 0
                      ? example.candidate
                      : "covered",
                  ]),
                ),
                omitted: [],
              }
            : undefined,
          responseSchema: toJsonSchema(selectionSchema),
        }),
      },
    ],
    (content) => {
      const { value } = parseArgumentJson(content);
      validateValue(selectionSchema, value);
      const selected = value as Record<string, unknown> & {
        omitted: string[];
      };
      const choices = slots.map((slot) => selected[slot] as string);
      const result: AssemblyPlan = {
        omitted: selected.omitted,
        title: Array.from(intent.question ?? intent.goal)
          .slice(0, 100)
          .join(""),
        instruction: intent.question ?? intent.goal,
        activities: choices.includes("unavailable")
          ? []
          : choices.filter((choice) => choice !== "covered"),
      };
      if (result.activities.length > 3)
        throw new Error(
          "Use at most three total independent activity instances.",
        );
      const available = new Set(
        result.activities.flatMap((candidate) => [
          ...ranked[cards.findIndex((card) => card.candidate === candidate)]
            .capabilities,
        ]),
      );
      const missing = requiredCapabilities.filter(
        (capability) => !available.has(capability),
      );
      if (result.activities.length && missing.length)
        throw new Error(
          `Selected activities lack requested capabilities: ${missing.join(", ")}. Select activities whose real contracts support these values. Do not substitute an unrelated activity.`,
        );
      const represented = result.activities.reduce(
        (sum, candidate) =>
          sum +
          cards.find((card) => card.candidate === candidate)!.instanceCount,
        0,
      );
      if (!choices.includes("unavailable") && represented !== count)
        throw new Error(
          `Selected activities contain ${represented} independent model instances; the request needs ${count}. An activity with multiple instances must be selected once, with its additional slots marked covered.`,
        );
      return result;
    },
    "Return one candidate ID string per supplied experiment slot and omitted. Use covered only for instances already contained in a selected activity. Preserve the requested total model instance count. Use exactly the supplied slot keys, never an activities array or additional slots.",
    budget.signal,
    {
      budget,
      stage: "assembly_plan",
      schema: toJsonSchema(selectionSchema),
      maxTokens: 256,
      onEvent: (event, data) => budget.trace?.(`assembly_plan.${event}`, data),
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
        label: String(control.configuration.label ?? control.label),
        description: publicDefinition(
          source.document.nodes.find((node) => node.id === wire.to.node)!,
        ).commands[wire.to.port].description,
      };
    });
    const observationCards = source.document.nodes
      .filter((node) => publicDefinition(node).category === "displays")
      .map((node) => ({
        id: node.id,
        label: String(node.configuration.label ?? node.label),
        description: publicDefinition(node).description,
        outputs: source.document.connections
          .filter((wire) => wire.kind === "value" && wire.to.node === node.id)
          .map((wire) => ({
            name: wire.from.port,
            contract: publicDefinition(
              [...source.document.nodes, ...source.document.resources].find(
                (node) => node.id === wire.from.node,
              )!,
            ).outputs[wire.from.port],
          })),
      }));
    const visibilityCards = [
      ...commandCards.map((card) => ({ ...card, kind: "control" as const })),
      ...observationCards.map((card) => ({
        ...card,
        kind: "observation" as const,
      })),
    ];
    const acceptedVisibility = new Map<string, boolean>();
    if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
      budget.maxDecisionCalls =
        budget.decisionCalls + Math.ceil(visibilityCards.length / 8);
      for (let offset = 0; offset < visibilityCards.length; offset += 8) {
        const batch = visibilityCards.slice(offset, offset + 8);
        const questions: Record<string, ChoiceQuestion> = Object.fromEntries(
          batch.map((card, index) => [
            `visibility${index + 1}`,
            {
              type: "choice",
              instructions:
                "Decide whether this item is essential to the original learning request. Availability alone is insufficient. Unrelated inputs stay fixed; duplicate/internal measurements stay hidden.",
              criteria: {
                include: `${card.kind}: ${card.label}. ${card.description}. This item is a requested input, essential action, or necessary observation of the requested outcome.`,
                omit: `${card.kind}: ${card.label}. This item is unrelated, duplicates information already communicated by the scene, or exposes an internal measurement rather than the requested outcome.`,
              },
            },
          ]),
        );
        budget.consumeDecisionCall();
        try {
          const { provider, policy } = budget.decision;
          const response = await provider(
            {
              state: {
                originalRequest: request.prompt,
                intent,
                activity: source.title,
                scenes: source.document.nodes
                  .filter((node) =>
                    ["appearance", "canvases"].includes(
                      publicDefinition(node).category,
                    ),
                  )
                  .map((node) => ({
                    title: publicDefinition(node).title,
                    description: publicDefinition(node).description,
                  })),
              },
              questions,
            },
            budget.signal,
          );
          const decisions = batch.map((card, index) => {
            const key = `visibility${index + 1}`;
            const accepted = acceptChoice(
              response.answers[key],
              questions[key],
              policy.probabilityGate,
              policy.confidenceGate,
            );
            if (accepted)
              acceptedVisibility.set(
                `${card.kind}:${card.id}`,
                accepted.choice === "include",
              );
            return {
              id: card.id,
              kind: card.kind,
              status: accepted ? "accepted" : "rejected",
              answer: response.answers[key],
            };
          });
          budget.trace?.("presentation.decision", {
            provider: response.provider,
            model: response.model,
            durationMs: response.durationMs,
            usage: response.usage,
            decisions,
          });
        } catch (error) {
          budget.check();
          budget.signal.throwIfAborted();
          budget.trace?.("presentation.decision", {
            status: "unavailable",
            reason:
              error instanceof Error ? error.message : "Decision unavailable",
          });
        }
      }
    }
    const unresolvedControls = commandCards.filter(
      (card) => !acceptedVisibility.has(`control:${card.id}`),
    );
    const unresolvedObservations = observationCards.filter(
      (card) => !acceptedVisibility.has(`observation:${card.id}`),
    );
    const schema = object({
      overrides: recipeOverrideSchema(source),
      controls: object(
        Object.fromEntries(
          unresolvedControls.map((card) => [
            card.id,
            { type: "boolean" as const, description: card.label },
          ]),
        ),
      ),
      observations: object(
        Object.fromEntries(
          unresolvedObservations.map((card) => [
            card.id,
            { type: "boolean" as const, description: card.label },
          ]),
        ),
      ),
    });
    budget.trace?.("stage", { task: "configure_selected_recipe" });
    const configuration = await requestStructured<{
      overrides: Record<string, unknown>;
      controls: string[];
      observations: string[];
    }>(
      [
        {
          role: "system",
          content:
            "Configure this instance for the ORIGINAL requested learning task. Return ONLY overrides, controls and observations. overrides patches exposed starting settings: use {} unless starting values were requested; preserve exact quantities and units. For different-condition comparisons consult priorConfigurations. The application owns acceptedVisibility; do not repeat or change those decisions. Classify ONLY the remaining supplied controls and observations, as OBJECTS keyed by ID with boolean values. Return {} when no items remain. Set true only for requested inputs, essential actions and necessary observations. Leave unrelated conditions at authored defaults and duplicate/internal measurements hidden. Supported does not mean needed. Motion safety and recovery are supplied by the application. Return values, not schemas or ID arrays.",
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
            acceptedVisibility: Object.fromEntries(acceptedVisibility),
            commands: unresolvedControls.map(({ id, label, description }) => ({
              id,
              label,
              description,
            })),
            observations: unresolvedObservations,
            parameters: source.parameters.map((parameter) => ({
              name: parameter.name,
              default:
                [...source.document.nodes, ...source.document.resources].find(
                  (node) => node.id === parameter.node,
                )!.configuration[parameter.field] ?? parameter.default,
              schema: parameter.schema,
            })),
            responseSchema: toJsonSchema(schema),
          }),
        },
      ],
      (content) => {
        const { value } = parseArgumentJson(content);
        validateValue(schema, value);
        const response = value as {
          overrides: Record<string, unknown>;
          controls: Record<string, boolean>;
          observations: Record<string, boolean>;
        };
        const result = {
          overrides: response.overrides,
          controls: commandCards
            .filter(
              (card) =>
                acceptedVisibility.get(`control:${card.id}`) ??
                response.controls[card.id],
            )
            .map((card) => card.endpoint),
          observations: observationCards
            .filter(
              (card) =>
                acceptedVisibility.get(`observation:${card.id}`) ??
                response.observations[card.id],
            )
            .map((card) => card.id),
        };
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
      "Return overrides as values. controls and observations are objects with exactly the supplied ID keys and boolean values. True means essential to the original request, false means unnecessary. Do not return arrays or schemas.",
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
          (publicDefinition(node).category === "displays" &&
            !configuration.observations.includes(node.id)) ||
          (publicDefinition(node).category === "controls" &&
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
            )),
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
  document = learnerPresentation(document);
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
      covered: intent.concepts,
      omitted: plan.omitted,
      explanation: plan.omitted.join("; "),
    },
  };
}
