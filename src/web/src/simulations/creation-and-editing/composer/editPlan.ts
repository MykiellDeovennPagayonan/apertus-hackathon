import {
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { fieldValue } from "../authoring-engine/configurationPatch";
import type { GenerationBudget } from "../budget";
import type { EditCandidates } from "../component-selection/editCandidates";
import type { selectEditTargets } from "../component-selection/selectEditTargets";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { EditPlan } from "../intent-interpreter/contracts";
import {
  EditValidationError,
  validateEditPlan,
  validateEditResult,
} from "../validator/edit";
export function editPlanHelpers(env: EditCandidates) {
  const {
    active,
    document,
    instances,
    candidates,
    properties,
    candidateFields,
    presentationItem,
    currentConfiguration,
    context,
    componentChoices,
    candidateChoices,
    selectionCatalog,
  } = env;
  const adjustedValue = (
    candidate: (typeof candidates)[number],
    adjustment: NonNullable<
      EditPlan["selections"][number]["adjustments"]
    >[number],
  ) => {
    const target = properties(candidate.schema).target;
    const node = instances.find(
      (node) => target?.type === "enum" && node.id === target.values[0],
    );
    const current =
      candidate.tool === "resize"
        ? fieldValue(presentationItem(candidate)?.rect ?? {}, adjustment.field)
        : fieldValue(currentConfiguration(node!.id), adjustment.field);
    const schema = candidateFields(candidate)[adjustment.field];
    const details = {
      node_id: node?.id ?? candidate.id,
      field: adjustment.field,
      current_value: current,
      adjustment,
      expected: schema,
    };
    if (
      adjustment.operation !== "set" &&
      (typeof current !== "number" || !Number.isFinite(current))
    )
      throw new EditValidationError(
        `unavailable_value:${candidate.id}:${adjustment.field}`,
        "The current value is unavailable; use an absolute value or clarify",
        details,
      );
    const value =
      adjustment.operation === "set"
        ? adjustment.operand
        : adjustment.operation === "scale"
          ? (current as number) * adjustment.operand
          : (current as number) + adjustment.operand;
    try {
      validateValue(schema, value);
    } catch (error) {
      throw new EditValidationError(
        `invalid_value:${candidate.id}:${adjustment.field}`,
        error instanceof Error ? error.message : "Invalid value",
        { ...details, received: value },
      );
    }
    return value;
  };
  const repairFeedback = (
    error: unknown,
  ): { key: string; details: Record<string, unknown> } => {
    if (error instanceof EditValidationError)
      return {
        key: error.code,
        details: { code: error.code, ...error.details },
      };
    const message = error instanceof Error ? error.message : "Invalid JSON";
    const invalidJson =
      error instanceof SyntaxError ||
      /JSON|Unexpected token|Unterminated/i.test(message);
    const path = invalidJson ? "$" : message.split(": ")[0];
    const code = invalidJson
      ? "invalid_json"
      : /\.candidate$/.test(path)
        ? "unknown_operation"
        : /\.targets(?:\[\d+\])?$/.test(path)
          ? "unknown_target"
          : /expected (?:number|integer|boolean|one of)|invalid string/.test(
                message,
              )
            ? "invalid_value"
            : /unknown field/.test(message)
              ? "unknown_field"
              : "invalid_schema";
    return {
      key: `${code}:${path}`,
      details: {
        code,
        path,
        repair:
          code === "unknown_field"
            ? {
                action: "remove_unknown_key",
                key: /unknown field (\S+)/.exec(message)?.[1],
                message_location: "response_root",
              }
            : undefined,
        allowed_components: ["unknown_operation", "unknown_target"].includes(
          code,
        )
          ? componentChoices
          : undefined,
        allowed_operations:
          code === "unknown_operation" ? candidateChoices : undefined,
      },
    };
  };
  return { adjustedValue, repairFeedback };
}
export async function editPlan(
  request: GenerationRequest,
  budget: GenerationBudget,
  env: EditCandidates,
  target: Awaited<ReturnType<typeof selectEditTargets>>,
) {
  budget.trace?.("stage", { task: "edit_intent" });
  const { adjustedValue, repairFeedback } = editPlanHelpers(env);
  const selected = env.candidates.filter((candidate) =>
    target.candidates.includes(candidate.id),
  );
  const fields = selected
    .flatMap((candidate) =>
      Object.entries(env.candidateFields(candidate)).map(([field, schema]) => ({
        candidate,
        field,
        schema,
      })),
    )
    .map((entry, index) => ({ ...entry, key: `field${index + 1}` }));
  const numeric = fields.filter(
    (entry) =>
      entry.schema.type === "number" || entry.schema.type === "integer",
  );
  const properties: Record<string, ParameterSchema> = {
    message: { type: "string", minLength: 0, maxLength: 400 },
  };
  for (const candidate of selected) {
    properties[candidate.id] = { type: "boolean" };
    properties[`${candidate.id}_scope`] = choice("selected", "all_matching");
  }
  for (const entry of fields)
    properties[entry.key] = { type: "boolean", description: entry.field };
  for (const entry of numeric) {
    properties[`${entry.key}_operation`] = choice("set", "scale", "offset");
    properties[`${entry.key}_operand`] = num(
      -Number.MAX_VALUE,
      Number.MAX_VALUE,
    );
  }
  const schema = object(properties, Object.keys(properties));
  return await requestStructured<EditPlan>(
    [
      {
        role: "system",
        content:
          "Plan ONLY the selected operations for the original follow-up. Return ONE FLAT object using the supplied response keys. Operation keys and field keys contain booleans: true includes the operation or field, false excludes it. Select only requested fields. For an operation with fields, selected field keys identify its exact scope; for removal/runtime/other structural operations select its operation key. Omitted booleans mean false. Scope keys may be omitted for selected, or use all_matching only for the same configuration setting across equivalent instances. For a numeric field, its optional _operation and _operand keys form a pair: set/scale/offset and a JSON number, calculated from CURRENT values. Omit both to defer concrete values to the argument stage. Do not return arrays, nested selection objects, field-name objects, values, schemas or an operations envelope. Preserve all unrequested components, settings and text. For a general visual enlargement/reduction select both width and height; select only one dimension when the request explicitly specifies it. Keep scientific quantities separate from visual size. If the fields cannot be determined, select no operations or fields and ask one specific question in message. Do not return a mode key; the application already accepted the target mode.",
      },
      {
        role: "user",
        content: JSON.stringify({
          request: request.prompt,
          clarification: request.clarification,
          currentLesson: env.document.lesson,
          operations: selected.map((candidate) => ({
            id: candidate.id,
            operation: candidate.tool,
            component: env.candidateChoices.find(
              (choice) => choice.id === candidate.id,
            )?.component,
            currentBounds: env.presentationItem(candidate)?.rect,
          })),
          fields: fields.map(({ key, candidate, field, schema }) => ({
            id: key,
            operation: candidate.id,
            name: field,
            type: schema.type,
          })),
          components: env.context.nodes
            .map(
              ({ runtime: _runtime, assumptions: _assumptions, ...node }) =>
                node,
            )
            .filter((node) =>
              selected.some((candidate) => {
                const target = env.properties(candidate.schema).target;
                return (
                  candidate.node === node.id ||
                  (target?.type === "enum" && target.values[0] === node.id)
                );
              }),
            ),
          responseSchema: toJsonSchema(schema),
        }),
      },
    ],
    (content) => {
      const { value } = parseArgumentJson(content);
      validateValue(schema, value);
      const wire = value as Record<string, unknown>;
      const selections: Record<string, { scope: string; fields: string[] }> =
        {};
      for (const candidate of selected) {
        const chosen = fields.filter(
          (entry) =>
            entry.candidate.id === candidate.id && wire[entry.key] === true,
        );
        if (wire[candidate.id] === true || chosen.length)
          selections[candidate.id] = {
            scope:
              (wire[`${candidate.id}_scope`] as string | undefined) ??
              "selected",
            fields: chosen.map((entry) => entry.field),
          };
      }
      const adjustments = numeric.flatMap((entry) => {
        const operation = wire[`${entry.key}_operation`],
          operand = wire[`${entry.key}_operand`];
        if (operation === undefined && operand === undefined) return [];
        if (operation === undefined || operand === undefined)
          throw new EditValidationError(
            `incomplete_adjustment:${entry.key}`,
            "Supply both adjustment operation and numeric operand, or omit both",
            { field: entry.field },
          );
        return [
          {
            candidate: entry.candidate.id,
            field: entry.field,
            operation,
            operand,
          },
        ];
      });
      return validateEditPlan(
        {
          mode: Object.keys(selections).length
            ? target.mode
            : typeof wire.message === "string" && wire.message.trim()
              ? "clarify"
              : target.mode,
          message: wire.message ?? "",
          selections,
          adjustments,
        },
        env,
        adjustedValue,
        (operations) => validateEditResult(env, request.requestId, operations),
      );
    },
    "Return only a flat object keyed by the supplied operation/field IDs and optional scope/adjustment keys. No nested objects or arrays. Do not copy field-name descriptions into the response.",
    budget.signal,
    {
      budget,
      schema: toJsonSchema(schema),
      maxTokens: 512,
      stage: "edit_intent",
      maxRepairsPerIssue: 3,
      repairFeedback: (error) => {
        const feedback = repairFeedback(error);
        const {
          allowed_components: _components,
          allowed_operations: _operations,
          connections: _connections,
          ...details
        } = feedback.details;

        return {
          ...feedback,
          details: {
            ...details,
            response_keys: Object.keys(properties),
            expected_contract: toJsonSchema(schema),
            root: "flat object; operation/field keys are booleans",
          },
        };
      },
      onEvent: (event, data) => budget.trace?.(`edit_intent.${event}`, data),
    },
  );
}
