import { acceptedCommandArguments } from "../../registry/contracts/commandPresentation";
import {
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import type { CompositeRecipe } from "../authoring-engine/document";
import type { GenerationBudget } from "../budget";
import { controls, terms } from "../component-selection/assemblyCandidates";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { TeachingIntent } from "../intent-interpreter/contracts";
export async function configureAssembly(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
  source: CompositeRecipe,
  index: number,
  instanceCount: number,
  priorConfigurations: {
    activity: string;
    overrides: Record<string, unknown>;
  }[],
  requiredCapabilities: string[],
) {
  if (!source.parameters.length) return { overrides: {} };
  const wires = controls(source);
  const parameters = source.parameters.map((parameter, index) => ({
    ...parameter,
    key: `setting${index + 1}`,
  }));
  const schema = object(
    Object.fromEntries(
      parameters.map((parameter) => [parameter.key, parameter.schema]),
    ),
    parameters.map((parameter) => parameter.key),
  );
  budget.trace?.("stage", { task: "configure_selected_recipe" });
  return await requestStructured<{ overrides: Record<string, unknown> }>(
    [
      {
        role: "system",
        content:
          "Configure starting settings for the original learning request. Return ONLY ONE flat patch object keyed by the supplied setting IDs. The application maps IDs to parameters. Do not invent parameter names or an overrides envelope. Use {} unless starting values were requested. Preserve exact quantities and units. For different-condition comparisons choose different requested values within their contracts using priorConfigurations. Do not return controls, observations, visibility decisions or schemas.",
      },
      {
        role: "user",
        content: JSON.stringify({
          request: request.prompt,
          intent,
          activity: source.title,
          instance: index + 1,
          instances: instanceCount,
          priorConfigurations,
          parameters: parameters.map((parameter) => ({
            id: parameter.key,
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
      const result = {
        overrides: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(
            ([key, setting]) => [
              parameters.find((parameter) => parameter.key === key)!.name,
              setting,
            ],
          ),
        ),
      };
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
      return result;
    },
    "Return a flat object using ONLY the supplied setting IDs and actual values. Omit settings that were not requested. Return {} for unchanged defaults. Do not return an overrides envelope, parameter names, visibility decisions or schemas.",
    budget.signal,
    {
      budget,
      stage: "assembly_configuration",
      schema: toJsonSchema(schema),
      maxTokens: 512,
      repairFeedback: (error) => ({
        key: error instanceof Error ? error.message : "invalid_settings",
        details: {
          response_keys: parameters.map((parameter) => parameter.key),
          expected_contract: toJsonSchema(schema),
          parameter_ids: parameters.map(({ key, name }) => ({ id: key, name })),
          root: "flat setting-keyed patch; {} preserves defaults",
        },
      }),
      onEvent: (event, data) =>
        budget.trace?.(`assembly_configuration.${event}`, data),
    },
  );
}
