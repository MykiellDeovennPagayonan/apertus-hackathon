import { isPlaybackCommand } from "../../registry/contracts/interactionPolicy";
import { object } from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import { inputCapability } from "../../registry/contracts/inputCapability";
import { emptyAuthoredDocument } from "../authoring-engine/document";
import { finalizeRecipe } from "../authoring-engine/finalizeRecipe";
import {
  insertRecipe,
  remapDocument,
  removeNodes,
} from "../authoring-engine/recipes";
import type { GenerationBudget } from "../budget";
import {
  assemblyCandidates,
  controls,
} from "../component-selection/assemblyCandidates";
import { selectAssemblyPlan } from "../component-selection/assemblyPlan";
import { PlannerError } from "../errors";
import type { GenerationRequest } from "../input/contracts";
import type { GenerationResult } from "../input/results";
import type { TeachingIntent } from "../intent-interpreter/contracts";
import { learnerPresentation } from "../simulation/layout/learnerLayout";
import { choosePresentation } from "./choosePresentation";
import { configureAssembly } from "./configureAssembly";
export async function createFromAssemblies(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
): Promise<GenerationResult> {
  budget.enableCompositionMode();
  budget.trace?.("selection.start", {});
  const retrieval = assemblyCandidates(request, intent);
  const { ranked, cards } = retrieval;
  if (!ranked.length)
    return {
      protocolVersion: 1,
      status: "unsupported",
      requestId: request.requestId,
      message: "I couldn't find an available model for this experiment.",
    };
  budget.trace?.("retrieval", cards);
  const plan = await selectAssemblyPlan(request, intent, budget, retrieval);
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
  const requestedWires: { control: string; node: string; command: string }[] =
    [];
  const requiredInputs: {
    interaction: string;
    capability: string;
    control: string;
    node: string;
    command: string;
    definition: string;
    field: string;
  }[] = [];
  const observationWires: {
    source: string;
    output: string;
    display: string;
    input: string;
  }[] = [];
  const priorConfigurations: {
    activity: string;
    overrides: Record<string, unknown>;
  }[] = [];
  for (const [index, candidate] of plan.activities.entries()) {
    const source =
      plan.bindings[index].source ?? ranked[cards.findIndex((card) => card.candidate === candidate)].recipe;
    const wires = controls(source);
    const presentation = await choosePresentation(
      request,
      intent,
      budget,
      source,
      plan.bindings[index],
    );
    if (presentation.unsupported)
      return {
        protocolVersion: 1,
        status: "unsupported",
        requestId: request.requestId,
        message: presentation.unsupported,
      };
    const settings = await configureAssembly(
      request,
      intent,
      budget,
      source,
      index,
      plan.activities.length,
      priorConfigurations,
      plan.bindings[index].controls,
    );
    const configuration = { ...settings, ...presentation };
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
    for (const { interaction, capability, binding } of plan.bindings[index]
      .resolved)
      for (const wire of binding.wires)
        requiredInputs.push({
          interaction,
          capability,
          control: `${prefix}/${wire.from.node}`,
          node: `${prefix}/${wire.to.node}`,
          command: wire.to.port,
          definition: binding.definition,
          field: binding.field,
        });
    document = insertRecipe(
      document,
      assembly,
      () => {
        throw new Error("Activity must be fully expanded");
      },
      (id) => `${prefix}/${id}`,
    );
    if (plan.activities.length === 1 && pruned.presentation?.mode === "board")
      document.presentation = remapDocument(
        pruned,
        (id) => `${prefix}/${id}`,
      ).presentation;
    for (const wire of wires.filter(
      (wire) =>
        keep.has(`${wire.to.node}.${wire.to.port}`) ||
        plan.bindings[index].resolved.some(({ binding }) =>
          binding.wires.some((required) => required.id === wire.id),
        ),
    ))
      requestedWires.push({
        control: `${prefix}/${wire.from.node}`,
        node: `${prefix}/${wire.to.node}`,
        command: wire.to.port,
      });
    for (const wire of source.document.connections.filter(
      (wire) =>
        wire.kind === "value" &&
        presentation.observations.includes(wire.to.node),
    ))
      observationWires.push({
        source: `${prefix}/${wire.from.node}`,
        output: wire.from.port,
        display: `${prefix}/${wire.to.node}`,
        input: wire.to.port,
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
  for (const required of requiredInputs) {
    const control = document.nodes.find((node) => node.id === required.control);
    const target = [...document.nodes, ...document.resources].find(
      (node) => node.id === required.node,
    );
    if (
      !control ||
      !target ||
      target.definition !== required.definition ||
      inputCapability(
        publicDefinition(target),
        required.command,
        required.field,
      ).id !== required.capability ||
      String(control.configuration.parameter ?? "") !== required.field ||
      !document.connections.some(
        (wire) =>
          wire.kind === "command" &&
          wire.from.node === required.control &&
          wire.to.node === required.node &&
          wire.to.port === required.command,
      )
    )
      throw new PlannerError(
        `Missing required binding for ${required.interaction}`,
        502,
      );
  }
  budget.trace?.("validation.required_inputs", requiredInputs);
  for (const required of requestedWires) {
    if (
      !document.connections.some(
        (wire) =>
          wire.kind === "command" &&
          wire.from.node === required.control &&
          wire.to.node === required.node &&
          wire.to.port === required.command,
      )
    )
      throw new PlannerError(
        `Missing requested interaction: ${required.command}`,
        502,
      );
  }
  for (const required of observationWires)
    if (
      !document.connections.some(
        (wire) =>
          wire.kind === "value" &&
          wire.from.node === required.source &&
          wire.from.port === required.output &&
          wire.to.node === required.display &&
          wire.to.port === required.input,
      )
    )
      throw new PlannerError(
        `Missing selected observation: ${required.output}`,
        502,
      );
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
