import {
  boolean,
  object,
  choice,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import type { InputRequirement } from "../../registry/contracts/inputCapability";
import { publicDefinition } from "../../registry/index";
import type { CompositeRecipe } from "../authoring-engine/document";
import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import { adjustableBindings } from "./assemblyCandidates";
import { addBoundControl, hasBoundControl } from "../authoring-engine/bindings";
import { acceptsScalar, parameterLeaves } from "../../registry/contracts/controlContract";
import { commandPresentation } from "../../registry/contracts/commandPresentation";

/** Registered scalar commands are capabilities even when a template omits their widgets. */
export function withAvailableInputs(source: CompositeRecipe): CompositeRecipe {
  const recipe = structuredClone(source);
  let nextId = recipe.document.nodes.length;
  for (const node of source.document.nodes) {
    const definition = publicDefinition(node);
    if (definition.category !== "models") continue;
    for (const [command, contract] of Object.entries(definition.commands)) {
      const presentation = commandPresentation(command, definition.id);
      for (const leaf of parameterLeaves(contract.arguments)) {
        if (hasBoundControl(recipe.document, node.id, command, leaf.path)) continue;
        const widget = ([
          ["slider", "controls/Slider"],
          ["toggle", "controls/Toggle"],
          ["select", "controls/Select"],
        ] as const).find(([, control]) => acceptsScalar(control, leaf.schema));
        if (!widget) continue;
        let id: string;
        do { id = `available-input/${nextId++}`; }
        while (recipe.document.nodes.some((node) => node.id === id));
        recipe.document = addBoundControl(recipe.document, {
          target: node.id,
          command,
          field: leaf.path,
          widget: widget[0],
          label: `${node.label}: ${presentation.presentation[leaf.path]?.label ?? presentation.label ?? contract.description}`,
        }, id);
        // A template's fixed board hosts do not cover newly appended layouts.
        delete recipe.document.presentation;
      }
    }
  }
  return recipe;
}

/** Apertus interprets requested quantities; the application preserves selected identities. */
export async function resolveInputRequirements(
  request: GenerationRequest,
  budget: GenerationBudget,
  source: CompositeRecipe,
): Promise<{ requirements: InputRequirement[]; unsupported?: string }> {
  const bindings = adjustableBindings(source);
  const schema = object({
    supported: boolean,
    inputs: {
      type: "array",
      minItems: 0,
      maxItems: bindings.length,
      items: choice(...bindings.map((binding) => binding.id), "unavailable"),
    },
  });
  const answer = await requestStructured<{ supported: boolean; inputs: string[] }>(
    [
      {
        role: "system",
        content:
          'Interpret the ORIGINAL request against this offered activity. Decide whether its models, scenes and command inputs can fulfill the requested meaning. Resolve informal wording using the supplied meanings, units and bindings, not literal names. Return only {"supported":true,"inputs":["supplied-input-id"]}. Retain every input the user requests to adjust and any input necessary to perform the requested activity. Outcomes, observations and comparison labels are not additional adjustable quantities. Do not invent requirements from a generated learning question. Return an empty inputs array when none is needed. If a requested quantity or behavior is genuinely missing, return {"supported":false,"inputs":[]}. Never substitute another quantity or use unavailable as an input ID.',
      },
      {
        role: "user",
        content: JSON.stringify({
          request: request.prompt,
          activity: {
            title: source.title,
            meaning: source.description,
            limitations: source.assumptions,
          },
          models: source.document.nodes
            .filter((node) => publicDefinition(node).category === "models")
            .map((node) => {
              const definition = publicDefinition(node);
              return {
                instance: node.id,
                title: definition.title,
                meaning: definition.description.slice(0, 400),
                outputs: definition.teaching?.observations ?? Object.keys(definition.outputs),
              };
            }),
          inputs: bindings.map((binding) => ({
            id: binding.id,
            labels: binding.labels,
            meaning: binding.meaning,
            model: publicDefinition(
              [...source.document.nodes, ...source.document.resources].find(
                (node) => node.id === binding.wires[0].to.node,
              )!,
            ).title,
            command: binding.command,
            field: binding.field,
            fields: binding.capability.fields,
            units: binding.capability.units,
            instances: binding.wires.map((wire) => wire.to.node),
          })),
        }),
      },
    ],
    (content) => {
      const { value } = parseArgumentJson(content);
      validateValue(schema, value);
      const answer = value as { supported: boolean; inputs: string[] };
      if (new Set(answer.inputs).size !== answer.inputs.length ||
          answer.inputs.some((id) => !bindings.some((binding) => binding.id === id)))
        throw new Error("Return distinct supplied input IDs; use an empty array for unsupported activities");
      return answer;
    },
    'Return supported and only distinct supplied input IDs, preserving the original request.',
    budget.signal,
    {
      budget,
      stage: "assembly_input_requirement",
      schema: toJsonSchema(schema),
      maxTokens: 384,
      maxRepairsPerIssue: 1,
      onEvent: (event, data) => budget.trace?.(`assembly_input_requirement.${event}`, data),
    },
  );
  const requirements = answer.inputs.map((id) => {
    const binding = bindings.find((binding) => binding.id === id)!;
    return {
      interaction: binding.labels.join(" / "),
      capabilities: [binding.capability.id],
    };
  });
  budget.trace?.("assembly.requirements", { supported: answer.supported, requirements });
  return {
    requirements,
    ...(answer.supported ? {} : { unsupported: "The selected activity cannot represent the requested interactions." }),
  };
}
