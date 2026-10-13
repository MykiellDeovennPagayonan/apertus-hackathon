import {
  object,
  choice,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import {
  namedInputRequirements,
  type InputRequirement,
} from "../../registry/contracts/inputCapability";
import { publicDefinition } from "../../registry/index";
import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { assemblyCandidates } from "./assemblyCandidates";

/** Resolve unfamiliar wording once across candidates, never against a chosen activity's substitutes. */
export async function resolveInputRequirements(
  request: GenerationRequest,
  budget: GenerationBudget,
  retrieval: ReturnType<typeof assemblyCandidates>,
): Promise<{ requirements: InputRequirement[]; unsupported?: string }> {
  const requirements = [...retrieval.inputRequirements];
  const candidates = [
    ...new Map(
      retrieval.ranked.flatMap(({ bindings }) =>
        bindings.map((binding) => [binding.capability.id, binding] as const),
      ),
    ).values(),
  ].map((binding, index) => ({ id: `quantity${index + 1}`, binding }));
  for (const interaction of retrieval.unresolvedInputs) {
    const aliases = namedInputRequirements(
      interaction,
      candidates.map(({ binding }) => binding.capability),
    );
    if (
      aliases.length &&
      aliases.every((alias) =>
        requirements.some((requirement) =>
          alias.capabilities.some((id) =>
            requirement.capabilities.includes(id),
          ),
        ),
      )
    )
      continue;
    const compatible = retrieval.ranked.filter(({ bindings }) =>
      requirements.every((requirement) =>
        bindings.some((binding) =>
          requirement.capabilities.includes(binding.capability.id),
        ),
      ),
    );
    const available = candidates.filter(
      ({ binding }) =>
        (binding.capability.fields.length > 1 ||
          !requirements.some((requirement) =>
            requirement.capabilities.includes(binding.capability.id),
          )) &&
        compatible.some(({ bindings }) =>
          bindings.some(
            (input) => input.capability.id === binding.capability.id,
          ),
        ),
    );
    if (!available.length)
      return {
        requirements,
        unsupported: `No supported input matches ${interaction}.`,
      };
    const schema = object({
      candidate: choice("unavailable", ...available.map(({ id }) => id)),
    });
    const answer = await requestStructured<{ candidate: string }>(
      [
        {
          role: "system",
          content:
            'Resolve the requested adjustable quantity to ONE registered capability, or unavailable when none is equivalent. Preserve the original object, quantity and units. Similar subject matter or a numeric input is insufficient. Existing resolved requirements are authoritative. Return only {"candidate":"supplied-id"}; never substitute another quantity.',
        },
        {
          role: "user",
          content: JSON.stringify({
            request: request.prompt,
            interaction,
            resolved: requirements.map(
              (requirement) => requirement.interaction,
            ),
            candidates: [
              {
                id: "unavailable",
                meaning:
                  "No registered input represents this requested quantity",
              },
              ...available.map(({ id, binding }) => ({
                id,
                model: publicDefinition(binding.definition).title,
                names: binding.capability.names,
                labels: binding.labels,
                meaning: binding.meaning.slice(0, 160),
                units: binding.capability.units,
              })),
            ],
          }),
        },
      ],
      (content) => {
        const { value } = parseArgumentJson(content);
        validateValue(schema, value);
        return value as { candidate: string };
      },
      "Return one supplied quantity ID or unavailable. Do not change the requested quantity.",
      budget.signal,
      {
        budget,
        stage: "assembly_input_requirement",
        schema: toJsonSchema(schema),
        maxTokens: 64,
        maxRepairsPerIssue: 1,
        onEvent: (event, data) =>
          budget.trace?.(`assembly_input_requirement.${event}`, data),
      },
    );
    const selected = available.find(({ id }) => id === answer.candidate);
    if (!selected)
      return {
        requirements,
        unsupported: `No supported input matches ${interaction}.`,
      };
    requirements.push({
      interaction,
      capabilities: [selected.binding.capability.id],
    });
  }
  budget.trace?.("assembly.requirements", requirements);
  return { requirements };
}
