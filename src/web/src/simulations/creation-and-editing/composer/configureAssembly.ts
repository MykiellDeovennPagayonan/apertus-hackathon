import { acceptedCommandArguments } from "../../registry/contracts/commandPresentation";
import {
  choice,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import type { CompositeRecipe } from "../authoring-engine/document";
import type { GenerationBudget } from "../budget";
import { controls } from "../component-selection/assemblyCandidates";
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
  requiredControls: string[],
) {
  if (!source.parameters.length) return { overrides: {} };
  const wires = controls(source);
  const parameters = source.parameters.map((parameter, index) => ({
    ...parameter,
    key: `setting${index + 1}`,
  }));
  budget.trace?.("stage", { task: "configure_selected_recipe" });
  const result: { overrides: Record<string, unknown> } = { overrides: {} };
  const verifyOverrides = (result: { overrides: Record<string, unknown> }) => {
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
          requiredControls.includes(`${wire.to.node}.${wire.to.port}`),
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
              JSON.stringify(value.current) === JSON.stringify(value.previous),
          )
        )
          throw new Error(
            `The requested ${accepted.map((value) => value.command).join(", ")} values are identical to the previous instance. Choose genuinely different initial values, including derived properties; changing labels or unrelated settings is insufficient.`,
          );
        const compared = source.parameters;
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
  };
  let remaining = parameters;
  while (remaining.length) {
    const selectionSchema = object({
      candidate: choice("done", ...remaining.map((parameter) => parameter.key)),
    });
    const selected = await requestStructured<{ candidate: string }>(
      [
        {
          role: "system",
          content:
            'Choose ONE setting whose starting VALUE the original request specifies, or return {"candidate":"done"} to keep defaults. An adjustable input does not request an initial value. For different-condition comparisons choose the requested distinguishing setting. Never return a list.',
        },
        {
          role: "user",
          content: JSON.stringify({
            request: request.prompt,
            instance: index + 1,
            instances: instanceCount,
            alreadyConfigured: Object.keys(result.overrides),
            candidates: [
              {
                id: "done",
                label:
                  "Keep all remaining registered starting values; no initial value change is requested",
              },
              ...remaining.map((parameter) => ({
                id: parameter.key,
                label: parameter.name,
              })),
            ],
          }),
        },
      ],
      (content) => {
        const { value } = parseArgumentJson(content);
        validateValue(selectionSchema, value);
        return value as { candidate: string };
      },
      'Return only {"candidate":"done"} or one supplied setting ID.',
      budget.signal,
      {
        budget,
        stage: "assembly_settings",
        schema: toJsonSchema(selectionSchema),
        maxTokens: 64,
        onEvent: (event, data) =>
          budget.trace?.(`assembly_settings.${event}`, data),
      },
    );
    if (selected.candidate === "done") break;
    const parameter = remaining.find(
      (parameter) => parameter.key === selected.candidate,
    )!;
    const schema = object({ value: parameter.schema });
    const current =
      [...source.document.nodes, ...source.document.resources].find(
        (node) => node.id === parameter.node,
      )!.configuration[parameter.field] ?? parameter.default;
    const answer = await requestStructured<{ value: unknown }>(
      [
        {
          role: "system",
          content:
            'Set the one selected starting setting from the original request. Preserve explicit quantities and units. Return only {"value":actualValue}; never return a schema or other settings. For a requested different-condition comparison, distinguish this instance from prior values.',
        },
        {
          role: "user",
          content: JSON.stringify({
            request: request.prompt,
            instance: index + 1,
            instances: instanceCount,
            setting: {
              name: parameter.name,
              current,
              contract: toJsonSchema(parameter.schema),
            },
            priorValues: priorConfigurations
              .filter((previous) => previous.activity === source.id)
              .map((previous) => previous.overrides[parameter.name] ?? current),
          }),
        },
      ],
      (content) => {
        const { value } = parseArgumentJson(content);
        validateValue(schema, value);
        return value as { value: unknown };
      },
      'Return only {"value":actualValue} matching the selected setting contract.',
      budget.signal,
      {
        budget,
        stage: "assembly_setting_value",
        memoryContext: {
          revision: "assembly-setting-v1",
          tools: [source.id],
          fields: { value: parameter.field },
        },
        schema: toJsonSchema(schema),
        maxTokens: 256,
        verify: (answer) => {
          if (remaining.length === 1)
            verifyOverrides({
              overrides: {
                ...result.overrides,
                [parameter.name]: answer.value,
              },
            });
        },
        onEvent: (event, data) =>
          budget.trace?.(`assembly_setting_value.${event}`, data),
      },
    );
    result.overrides[parameter.name] = answer.value;
    remaining = remaining.filter(
      (candidate) => candidate.key !== parameter.key,
    );
  }
  verifyOverrides(result);
  return result;
}
