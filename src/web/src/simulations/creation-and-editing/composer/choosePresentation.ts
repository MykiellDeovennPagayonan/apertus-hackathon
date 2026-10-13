import {
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import type { CompositeRecipe } from "../authoring-engine/document";
import type { GenerationBudget } from "../budget";
import { controls, terms } from "../component-selection/assemblyCandidates";
import { acceptChoice } from "../component-selection/decisions/acceptance";
import type { ChoiceQuestion } from "../component-selection/decisions/contracts";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { TeachingIntent } from "../intent-interpreter/contracts";
export async function choosePresentation(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
  source: CompositeRecipe,
  requiredCapabilities: string[],
) {
  budget.trace?.("stage", { task: "choose_presentation" });
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
                  description:
                    source.document.connections
                      .filter(
                        (wire) =>
                          wire.kind === "value" && wire.to.node === node.id,
                      )
                      .map(
                        (wire) =>
                          publicDefinition(
                            [
                              ...source.document.nodes,
                              ...source.document.resources,
                            ].find((node) => node.id === wire.from.node)!,
                          ).outputs[wire.from.port].description,
                      )
                      .filter(Boolean)
                      .join(" ") || publicDefinition(node).description,
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
  for (const capability of requiredCapabilities) {
    const matching = commandCards.filter((card) =>
      terms(card.endpoint).has(capability),
    );
    if (
      matching.length &&
      matching.every(
        (card) => acceptedVisibility.get(`control:${card.id}`) === false,
      )
    )
      for (const card of matching)
        acceptedVisibility.delete(`control:${card.id}`);
  }
  const unresolvedControls = commandCards.filter(
    (card) => !acceptedVisibility.has(`control:${card.id}`),
  );
  const unresolvedObservations = observationCards.filter(
    (card) => !acceptedVisibility.has(`observation:${card.id}`),
  );

  const choices = [
    ...unresolvedControls.map((card) => ({
      ...card,
      kind: "control" as const,
    })),
    ...unresolvedObservations.map((card) => ({
      ...card,
      kind: "observation" as const,
    })),
  ].map((card, index) => ({ ...card, key: `item${index + 1}` }));
  const choiceKeys = new Map(
    choices.map((card) => [`${card.kind}:${card.id}`, card.key]),
  );
  const schema = object(
    Object.fromEntries(
      choices.map((card) => [
        card.key,
        { type: "boolean" as const, description: card.label },
      ]),
    ),
  );
  const response =
    unresolvedControls.length || unresolvedObservations.length
      ? await requestStructured<Record<string, boolean>>(
          [
            {
              role: "system",
              content:
                "Select only requested inputs, essential actions, and necessary observations for the original learning request. Return ONE flat object keyed only by the supplied item IDs with boolean values. Availability alone does not mean needed. Keep unrelated independent variables at their authored defaults; do not add an input merely because it changes model behavior. Omit internal measurements already communicated by the scene unless explicitly requested. Do not return values, settings, schemas or arrays.",
            },
            {
              role: "user",
              content: JSON.stringify({
                request: request.prompt,
                intent,
                activity: source.title,
                items: choices.map(({ key, kind, label, description }) => ({
                  id: key,
                  kind,
                  label,
                  description,
                })),
                responseSchema: toJsonSchema(schema),
              }),
            },
          ],
          (content) => {
            const { value } = parseArgumentJson(content);
            validateValue(schema, value);
            return value as Record<string, boolean>;
          },
          "Return only a flat object with the supplied item IDs as keys and boolean values. Do not return control names, nested objects, arrays or settings.",
          budget.signal,
          {
            budget,
            stage: "assembly_presentation",
            schema: toJsonSchema(schema),
            maxTokens: 512,
            repairFeedback: (error) => ({
              key:
                error instanceof Error ? error.message : "invalid_presentation",
              details: {
                response_keys: choices.map((card) => card.key),
                expected_contract: toJsonSchema(schema),
                value_type: "boolean",
                root: "flat item-keyed object",
              },
            }),
            verify: (response) => {
              verifyPresentation(response);
            },
            onEvent: (event, data) =>
              budget.trace?.(`assembly_presentation.${event}`, data),
          },
        )
      : {};
  function verifyPresentation(response: Record<string, boolean>) {
    const result = project(response);
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
          `The requested ${capability} adjustment needs a persistent control. Include ${matching.map((wire) => `${wire.to.node}.${wire.to.port}`).join(" or ")} in the presentation.`,
        );
    }
    if (
      intent.interactions.length &&
      commands.some((command) => !/reset$/i.test(command)) &&
      !result.controls.length
    )
      throw new Error(
        "The requested interactive experiment needs persistent controls.",
      );
  }
  function project(response: Record<string, boolean>) {
    return {
      controls: commandCards
        .filter(
          (card) =>
            acceptedVisibility.get(`control:${card.id}`) ??
            response[choiceKeys.get(`control:${card.id}`)!],
        )
        .map((card) => card.endpoint),
      observations: observationCards
        .filter(
          (card) =>
            acceptedVisibility.get(`observation:${card.id}`) ??
            response[choiceKeys.get(`observation:${card.id}`)!],
        )
        .map((card) => card.id),
    };
  }
  verifyPresentation(response);
  return project(response);
}
