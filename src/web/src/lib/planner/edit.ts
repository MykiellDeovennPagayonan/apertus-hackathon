import { publicDefinition } from "../../simulations/components/catalog";
import { readoutLabel } from "../../simulations/components/views/recipe/observations";
import { boardLayouts } from "../../simulations/runtime/authoring/board";
import {
  finalizeRecipe,
  patchSchema,
  type ToolRequest,
} from "../../simulations/runtime/authoring/operations";
import {
  DocumentRuntime,
  type ScopedCommand,
} from "../../simulations/runtime/authoring/runtime";
import { AuthoringTransaction } from "../../simulations/runtime/authoring/transaction";
import {
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { parseRecipe } from "../../simulations/runtime/recipes/schema";
import { serializeRecipe } from "../../simulations/runtime/recipes/serializeRecipe";
import { toJsonSchema } from "../apertus/structuredSchema";
import { requestStructured } from "../apertus/transport";
import { parseArgumentJson } from "./argumentJson";
import type { GenerationBudget } from "./budget";
import { configurationPatch, editableFields, fieldValue } from "./editFields";
import type { GenerationRequest, GenerationResult } from "./schema";
import { buildTurnTools } from "./turnSchema";

type EditPlan = {
  mode: "edit" | "runtime" | "new" | "unsupported" | "clarify";
  selections: {
    candidate: string;
    scope: "selected" | "all_matching";
    fields: string[];
    adjustments?: {
      field: string;
      operation: "set" | "scale" | "offset";
      operand: number;
    }[];
    mirror?: string;
  }[];
  message: string;
};
type EditIntent = Omit<EditPlan, "selections"> & {
  selections: Record<
    string,
    Omit<EditPlan["selections"][number], "candidate" | "adjustments" | "mirror">
  >;
  adjustments?: (NonNullable<
    EditPlan["selections"][number]["adjustments"]
  >[number] & { candidate: string })[];
};

class EditValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Interpret follow-ups against the active document; only explicit replacement enters creation. */
export async function planEdit(
  request: GenerationRequest,
  budget: GenerationBudget,
): Promise<GenerationResult | null> {
  const active = request.active;
  if (!active || !active.recipe.document.nodes.length) return null;
  const document = active.recipe.document;
  const instances = [...document.nodes, ...document.resources];
  const candidates = [
    ...[
      ...instances.flatMap((node) => {
        const configuration = publicDefinition(node).configuration;
        return configuration.type === "object" &&
          Object.keys(configuration.properties).length
          ? [
              {
                tool: "configure",
                schema: object({
                  target: choice(node.id),
                  changes: patchSchema(configuration),
                }),
              },
            ]
          : [];
      }),
      ...buildTurnTools(document, []).filter(
        (tool) => tool.tool !== "configure" && tool.tool !== "remove",
      ),
    ].map((tool, index) => ({
      id:
        (tool.tool === "configure" || tool.tool === "resize") &&
        tool.schema.type === "object" &&
        tool.schema.properties.target.type === "enum"
          ? `${tool.tool}:${tool.schema.properties.target.values[0]}`
          : `edit${index + 1}`,
      kind: "edit",
      tool: tool.tool,
      schema: tool.schema,
      node: "",
      command: "",
      description: "",
    })),
    ...document.nodes.map((node) => ({
      id: `remove:${node.id}`,
      kind: "edit",
      tool: "remove",
      schema: object({
        targets: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: choice(node.id),
        },
      }),
      node: node.id,
      command: "",
      description: "",
    })),
    ...(request.destination === "builder"
      ? []
      : instances.flatMap((node) =>
          Object.entries(publicDefinition(node).commands).map(
            ([command, contract], index) => ({
              id: `runtime:${node.id}:${command}`,
              kind: "runtime",
              tool: "command",
              schema: contract.arguments,
              node: node.id,
              command,
              description: contract.description,
            }),
          ),
        )),
  ];
  const properties = (schema?: ParameterSchema) =>
    schema?.type === "object" ? schema.properties : {};
  const candidateFields = (candidate: (typeof candidates)[number]) =>
    candidate.tool === "configure"
      ? editableFields(properties(candidate.schema).changes)
      : candidate.tool === "resize"
        ? Object.fromEntries(
            Object.entries(properties(candidate.schema)).filter(
              ([field]) => field !== "target",
            ),
          )
        : candidate.tool === "set_lesson"
          ? properties(candidate.schema)
          : {};
  const presentationItem = (candidate: (typeof candidates)[number]) => {
    const target = properties(candidate.schema).target;
    return document.presentation?.mode === "board"
      ? document.presentation.items.find(
          (item) => target?.type === "enum" && item.id === target.values[0],
        )
      : undefined;
  };
  const currentConfiguration = (id: string) => {
    const node = instances.find((node) => node.id === id)!;
    const state = active.runtimeContext[id];
    if (!state || typeof state !== "object" || Array.isArray(state))
      return node.configuration;
    const live =
      "config" in state && state.config && typeof state.config === "object"
        ? state.config
        : state;
    return Object.fromEntries(
      Object.entries(node.configuration).map(([field, value]) => [
        field,
        Object.hasOwn(live, field)
          ? (live as Record<string, unknown>)[field]
          : value,
      ]),
    );
  };
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
  const intentSchema = object(
    {
      mode: choice("edit", "runtime", "new", "unsupported", "clarify"),
      selections: object({}),
      adjustments: {
        type: "array",
        minItems: 0,
        maxItems: 96,
        items: object({
          candidate: choice(...candidates.map((candidate) => candidate.id)),
          field: { type: "string", maxLength: 100 },
          operation: choice("set", "scale", "offset"),
          operand: num(-Number.MAX_VALUE, Number.MAX_VALUE),
        }),
      },
      message: { type: "string", minLength: 0, maxLength: 400 },
    },
    ["adjustments", "message"],
  );
  budget.trace?.("stage", { task: "edit_intent" });
  const context = {
    request: request.prompt,
    clarification: request.clarification,
    currentLesson: document.lesson,
    destination: request.destination ?? "lesson",
    connections: document.connections,
    presentation:
      document.presentation?.mode === "board"
        ? document.presentation.items.map((item) => ({
            id: item.id,
            node: boardLayouts(document).find(
              (layout) => layout.id === item.layoutId,
            )?.node,
            bounds: item.rect,
            locked: item.locked,
          }))
        : [],
    nodes: instances.map((node) => {
      const binding = document.connections.find(
        (connection) =>
          connection.kind === "value" && connection.to.node === node.id,
      );
      const source = instances.find(
        (instance) => instance.id === binding?.from.node,
      );
      const label =
        typeof node.configuration.label === "string" && node.configuration.label
          ? node.configuration.label
          : node.label;
      return {
        id: node.id,
        label: node.label,
        visibleName:
          node.definition === "displays/Readout"
            ? readoutLabel(
                label,
                source?.definition,
                binding?.from.port,
                source && binding
                  ? publicDefinition(source).outputs[binding.from.port]?.unit
                  : "",
              )
            : label,
        definition: node.definition,
        category: publicDefinition(node).category,
        title: publicDefinition(node).title,
        currentConfiguration: currentConfiguration(node.id),
        runtime: active.runtimeContext[node.id],
        assumptions: publicDefinition(node).assumptions,
      };
    }),
  };
  const componentChoices = context.nodes.map((node) => ({
    node_id: node.id,
    visible_name: node.visibleName,
    definition: node.definition,
  }));
  const candidateChoices = candidates.map((candidate) => {
    const target =
      properties(candidate.schema).target ??
      properties(candidate.schema).source;
    const nodeId =
      candidate.tool === "resize"
        ? boardLayouts(document).find(
            (layout) => layout.id === presentationItem(candidate)?.layoutId,
          )?.node
        : target?.type === "enum"
          ? target.values[0]
          : candidate.node;
    const node = context.nodes.find((node) => node.id === nodeId);
    return {
      id: candidate.id,
      mode: candidate.kind,
      operation: candidate.tool,
      fieldContracts: candidateFields(candidate),
      ...(node
        ? {
            component: {
              visibleName: node.visibleName,
              category: node.category,
              definition: node.definition,
            },
            ...(candidate.tool === "configure"
              ? { currentConfiguration: node.currentConfiguration }
              : {}),
          }
        : {}),
      ...(candidate.tool === "resize"
        ? {
            presentation: context.presentation.find(
              (item) => target?.type === "enum" && item.id === target.values[0],
            ),
          }
        : {}),
      ...(node ? { node: node.id } : {}),
      ...(candidate.kind === "runtime"
        ? {
            command: candidate.command,
            description: candidate.description,
            currentState: active.runtimeContext[candidate.node],
          }
        : {}),
      fixedArguments:
        candidate.tool === "remove"
          ? { targets: [candidate.node] }
          : Object.fromEntries(
              Object.entries(properties(candidate.schema))
                .filter(([, schema]) => schema.type === "enum")
                .map(([key, schema]) => [
                  key,
                  schema.type === "enum" ? schema.values : [],
                ]),
            ),
    };
  });
  const repairFeedback = (error: unknown) => {
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
    let expected: ParameterSchema | undefined = intentSchema;
    for (const part of path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .slice(1)) {
      expected =
        expected?.type === "array"
          ? expected.items
          : expected?.type === "object"
            ? expected.properties[part]
            : undefined;
    }
    return {
      key: `${code}:${path}`,
      details: {
        code,
        path,
        response_keys: Object.keys(properties(intentSchema)),
        expected_contract: expected ? toJsonSchema(expected) : undefined,
        repair:
          code === "unknown_field"
            ? {
                action: "remove_unknown_key",
                key: /unknown field (\S+)/.exec(message)?.[1],
                allowed_keys: Object.keys(properties(expected)),
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
  const apply = (operations: ToolRequest[]) => {
    const target = new AuthoringTransaction(request.requestId, document);
    const receipt = target.execute({
      draftId: target.draftId,
      expectedRevision: target.revision,
      operationId: "edit",
      request: operations,
    });
    if (receipt.status !== "applied") {
      const issue = receipt.issues[0];
      throw new EditValidationError(
        `invalid_result:${issue?.path ?? issue?.message.split(":")[0] ?? "document"}`,
        receipt.issues.map((issue) => issue.message).join("; ") ||
          receipt.summary,
        {
          issues: receipt.issues,
          allowed_components: componentChoices,
          connections: document.connections,
        },
      );
    }
    try {
      const recipe = parseRecipe(
        serializeRecipe(active.recipe, target.document),
      );
      finalizeRecipe(recipe.document, recipe);
      return recipe;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid recipe";
      throw new EditValidationError(
        `invalid_recipe:${message.split(":")[0]}`,
        message,
        {
          allowed_components: componentChoices,
          connections: target.document.connections,
        },
      );
    }
  };
  const previousLimits = { calls: budget.maxCalls, repairs: budget.maxRepairs };
  const selectionCatalog = {
    components: context.nodes.map((node) => ({
      id: node.id,
      visibleName: node.visibleName,
      category: node.category,
      definition: node.definition,
      currentConfiguration: node.currentConfiguration,
      runtime: node.runtime,
      candidates: candidateChoices
        .filter((candidate) => candidate.node === node.id)
        .map((candidate) => ({
          ...candidate,
          component: undefined,
          currentConfiguration: undefined,
          currentState: undefined,
          node: undefined,
          fieldContracts: Object.keys(candidate.fieldContracts).length
            ? candidate.fieldContracts
            : undefined,
          fixedArguments: ["configure", "remove", "resize", "command"].includes(
            candidate.operation,
          )
            ? undefined
            : candidate.fixedArguments,
        })),
    })),
    candidates: candidateChoices.filter((candidate) => !candidate.node),
  };
  budget.trace?.("edit_context", {
    contextCharacters: JSON.stringify(context).length,
    candidateCharacters: JSON.stringify(candidateChoices).length,
    schemaCharacters: JSON.stringify(toJsonSchema(intentSchema)).length,
    catalogCharacters: JSON.stringify(selectionCatalog).length,
    candidates: candidateChoices.map((candidate) => ({
      id: candidate.id,
      operation: candidate.operation,
      characters: JSON.stringify(candidate).length,
      fieldCharacters: JSON.stringify(candidate.fieldContracts).length,
      fixedCharacters: JSON.stringify(candidate.fixedArguments).length,
    })),
  });
  budget.maxCalls = Math.max(budget.maxCalls, 12);
  budget.maxRepairs = Math.max(budget.maxRepairs, 10);
  const targetSchema = object(
    {
      mode: choice("edit", "runtime", "new", "unsupported", "clarify"),
      candidates: {
        type: "array",
        minItems: 0,
        maxItems: 8,
        items: choice(...candidates.map((candidate) => candidate.id)),
      },
      message: { type: "string", minLength: 0, maxLength: 400 },
    },
    ["message"],
  );
  const target = await requestStructured<{
    mode: EditPlan["mode"];
    candidates: string[];
    message?: string;
  }>(
    [
      {
        role: "system",
        content:
          "Choose ONLY the target operations for the follow-up against the active experiment. Return JSON with mode, candidates (an array of exact candidate ID strings), and message when clarification or a limitation is needed. Do not supply fields, values, adjustments or operation arguments. Use edit for persistent changes, runtime only for an immediate action, new only for an explicit replacement. Never mix edit and runtime candidates. For new/unsupported/clarify use candidates []. Resolve targets from their visible names and categories. Resizing a visual does not resize its neighboring controls or change model quantities. If a quantity names both a control and a display without distinguishing them, ask which one. Select only requested operations, not related capabilities.",
      },
      {
        role: "user",
        content: JSON.stringify({
          request: request.prompt,
          clarification: request.clarification,
          currentLesson: document.lesson,
          responseSchema: toJsonSchema(targetSchema),
          components: selectionCatalog.components.map((component) => ({
            ...component,
            runtime: undefined,
            candidates: component.candidates.map((candidate) => ({
              id: candidate.id,
              mode: candidate.mode,
              operation: candidate.operation,
              description: candidate.description,
              fields: Object.keys(candidate.fieldContracts ?? {}),
              fixedArguments: candidate.fixedArguments,
            })),
          })),
          candidates: selectionCatalog.candidates.map((candidate) => ({
            id: candidate.id,
            mode: candidate.mode,
            operation: candidate.operation,
            fixedArguments: candidate.fixedArguments,
          })),
        }),
      },
    ],
    (content) => {
      const { value } = parseArgumentJson(content);
      validateValue(targetSchema, value);
      const target = value as {
        mode: EditPlan["mode"];
        candidates: string[];
        message?: string;
      };
      const actionable = target.mode === "edit" || target.mode === "runtime";
      if (
        actionable !== Boolean(target.candidates.length) ||
        new Set(target.candidates).size !== target.candidates.length ||
        target.candidates.some(
          (id) =>
            candidates.find((candidate) => candidate.id === id)!.kind !==
            target.mode,
        )
      )
        throw new Error(
          "Select distinct candidates from the selected mode; new/unsupported/clarify have no candidates",
        );
      if (!actionable && target.mode !== "new" && !target.message?.trim())
        throw new Error(
          "Ask a specific clarification question or explain the unsupported request",
        );
      return target;
    },
    "Return only mode, candidates and message. Candidates are exact ID strings, not objects. Select only the requested targets and operations; do not calculate values.",
    budget.signal,
    {
      budget,
      stage: "edit_target",
      schema: toJsonSchema(targetSchema),
      maxTokens: 256,
      onEvent: (event, data) => budget.trace?.(`edit_target.${event}`, data),
    },
  );
  if (target.mode === "new") {
    budget.maxCalls = previousLimits.calls;
    budget.maxRepairs = previousLimits.repairs;
    return null;
  }
  if (target.mode === "clarify" || target.mode === "unsupported")
    return {
      protocolVersion: 1,
      status: target.mode === "clarify" ? "clarification" : "unsupported",
      requestId: request.requestId,
      message: target.message!,
    };
  const targetIds = new Set(target.candidates);
  properties(intentSchema).mode = choice(target.mode, "clarify", "unsupported");
  properties(intentSchema).selections = object(
    Object.fromEntries(
      target.candidates.map((id) => {
        const fields = Object.keys(
          candidateFields(candidates.find((candidate) => candidate.id === id)!),
        );
        return [
          id,
          object({
            scope: choice("selected", "all_matching"),
            fields: {
              type: "array",
              minItems: 0,
              maxItems: fields.length ? 12 : 0,
              items: fields.length
                ? choice(...fields)
                : { type: "string", maxLength: 100 },
            },
          }),
        ];
      }),
    ),
    target.candidates,
  );
  const adjustmentSchema = properties(intentSchema).adjustments;
  if (
    adjustmentSchema.type === "array" &&
    adjustmentSchema.items.type === "object"
  )
    adjustmentSchema.items.properties.candidate = choice(...target.candidates);
  const plan = await requestStructured<EditPlan>(
    [
      {
        role: "system",
        content:
          "Interpret the follow-up against the ACTIVE experiment. The exact root JSON keys are mode, selections, adjustments, message. The last two keys may be omitted when unused. selections is an OBJECT keyed by supplied candidate IDs, never an array. Each value contains ONLY scope and fields. fields is an array of the supplied field-name STRINGS, never objects. Numeric adjustments belong in the separate ROOT adjustments array; each contains candidate, field, operation and numeric operand. Never nest adjustments inside selections or fields. Do not copy candidate descriptions into the response.\n" +
          "Use edit for persistent configuration or structural changes; runtime is only an explicitly requested immediate action. Never mix edit and runtime candidates. Unsupported/clarify have selections {}. Clarify asks one specific question when the supplied context cannot resolve the request. If clarification exists, interpret the latest prompt as its answer.\n" +
          "For configure, select ONLY requested leaf fields from fieldContracts; preserve every other setting. scope all_matching applies a shared condition to instances of the same definition; selected changes only the named instance. Numeric fields may use adjustments with field, operation set/scale/offset, and a JSON-number operand. Relative edits use scale or offset against CURRENT values. Enum/string/boolean/array/object fields have NO numeric adjustments; their values are supplied in the argument stage. Do not select both configuration and a runtime setter for one change.\n" +
          "For remove, fields is [] and scope is selected. Use visibleName, category and connections to identify the component. Preserve its model and accepted values when removing a display or control. If a quantity names both a control and a display without distinguishing them, clarify which one.\n" +
          "Choose operations by their component identity and fieldContracts. Model quantities use configure; displayed size uses resize ONLY when size is requested. For resize, select width and/or height on ONLY the requested visual component; neighboring controls are separate components. Numeric adjustments may express explicit size changes; otherwise the argument stage supplies dimensions from current bounds. Preserve proportions unless one dimension is requested. Other structural operations use fields [], except set_lesson names requested lesson fields. Preserve all unrequested settings, components and text.",
      },
      {
        role: "user",
        content: JSON.stringify({
          responseSchema: toJsonSchema(intentSchema),
          request: context.request,
          clarification: context.clarification,
          currentLesson: context.currentLesson,
          destination: context.destination,
          connections: context.connections,
          shortlistedTargets: {
            mode: target.mode,
            candidates: target.candidates,
          },
          components: selectionCatalog.components
            .filter((component) =>
              component.candidates.some((candidate) =>
                targetIds.has(candidate.id),
              ),
            )
            .map((component) => ({
              ...component,
              candidates: component.candidates.filter((candidate) =>
                targetIds.has(candidate.id),
              ),
            })),
          candidates: selectionCatalog.candidates.filter((candidate) =>
            targetIds.has(candidate.id),
          ),
          removalExamples: context.nodes
            .filter(
              (node) =>
                publicDefinition(node.definition).category === "displays",
            )
            .slice(0, 2)
            .map((node) => ({
              request: `remove the ${node.visibleName} display`,
              response: {
                mode: "edit",
                selections: {
                  [`remove:${node.id}`]: { scope: "selected", fields: [] },
                },
                message: `Remove ${node.visibleName}`,
              },
            })),
        }),
      },
    ],
    (content) => {
      const { value } = parseArgumentJson(content);
      validateValue(intentSchema, value);
      const { adjustments = [], ...intent } = value as EditIntent;
      if (
        adjustments.some(
          (adjustment) =>
            !Object.hasOwn(intent.selections, adjustment.candidate),
        )
      )
        throw new EditValidationError(
          "unselected_adjustment",
          "Adjustments must refer to selected candidates",
          {},
        );
      const plan: EditPlan = {
        ...intent,
        selections: Object.entries(intent.selections).map(
          ([candidate, selection]) => ({
            ...selection,
            candidate,
            adjustments: adjustments
              .filter((adjustment) => adjustment.candidate === candidate)
              .map(({ candidate: _candidate, ...adjustment }) => adjustment),
          }),
        ),
      };
      plan.message ??= "";
      const actionable = plan.mode === "edit" || plan.mode === "runtime";
      if (actionable !== Boolean(plan.selections.length))
        throw new EditValidationError(
          "missing_selection",
          "Edits need selections; new, unsupported and clarify must have none",
          {
            mode: plan.mode,
            allowed_components: componentChoices,
            allowed_operations: candidateChoices,
          },
        );
      const seen = new Set<string>();
      for (const selected of plan.selections) {
        const candidate = candidates.find(
          (candidate) => candidate.id === selected.candidate,
        )!;
        if (candidate.kind !== plan.mode || seen.has(candidate.id))
          throw new EditValidationError(
            "invalid_selection",
            "Choose distinct candidates from the selected edit mode",
            {
              mode: plan.mode,
              received: selected.candidate,
              allowed_operations: candidateChoices,
            },
          );
        seen.add(candidate.id);
        const fields = candidateFields(candidate);
        const fieldHelp = {
          candidate: candidate.id,
          operation: candidate.tool,
          component: componentChoices.find((node) => {
            const target = properties(candidate.schema).target;
            return (
              node.node_id === candidate.node ||
              (target?.type === "enum" && node.node_id === target.values[0])
            );
          }),
          received_fields: selected.fields,
          allowed_fields: Object.keys(fields),
          field_contracts: fields,
        };
        if (Object.keys(fields).length && !selected.fields.length)
          throw new EditValidationError(
            `missing_fields:${candidate.id}`,
            "Specify the requested fields for configuration or lesson edits",
            fieldHelp,
          );
        if (
          new Set(selected.fields).size !== selected.fields.length ||
          selected.fields.some((field) => !Object.hasOwn(fields, field))
        )
          throw new EditValidationError(
            `invalid_fields:${candidate.id}`,
            "Choose actual editable fields on the selected component",
            fieldHelp,
          );
        if (
          selected.fields.some((field) =>
            selected.fields.some(
              (other) => other !== field && field.startsWith(`${other}.`),
            ),
          )
        )
          throw new EditValidationError(
            `overlapping_fields:${candidate.id}`,
            "Choose a field or its nested children, not both",
            fieldHelp,
          );
        const adjustments = selected.adjustments ?? [];
        if (
          new Set(adjustments.map((adjustment) => adjustment.field)).size !==
            adjustments.length ||
          adjustments.some(
            (adjustment) =>
              !["configure", "resize"].includes(candidate.tool) ||
              !selected.fields.includes(adjustment.field) ||
              !["number", "integer"].includes(fields[adjustment.field]?.type),
          )
        )
          throw new EditValidationError(
            `invalid_adjustment:${candidate.id}`,
            "Relative arithmetic requires distinct selected numeric configuration fields",
            {
              ...fieldHelp,
              allowed_adjustment_operations: ["set", "scale", "offset"],
              received_adjustments: adjustments,
            },
          );
      }
      if (!actionable && plan.mode !== "new" && !plan.message.trim())
        throw new Error("Give a specific question or capability limit");
      const expanded: EditPlan["selections"] = [];
      for (const selection of plan.selections) {
        const candidate = candidates.find(
          (candidate) => candidate.id === selection.candidate,
        )!;
        if (
          selection.scope === "all_matching" &&
          candidate.tool !== "configure"
        )
          throw new EditValidationError(
            `invalid_scope:${candidate.id}`,
            "all_matching is only for a shared configuration setting",
            { candidate: candidate.id, allowed_scope: ["selected"] },
          );
        const target = properties(candidate.schema).target;
        const source =
          target?.type === "enum"
            ? instances.find((node) => node.id === target.values[0])
            : undefined;
        const matching =
          selection.scope === "all_matching"
            ? candidates.filter((entry) => {
                const target = properties(entry.schema).target;
                const node =
                  target?.type === "enum"
                    ? instances.find((node) => node.id === target.values[0])
                    : undefined;
                return (
                  entry.tool === "configure" &&
                  node?.definition === source?.definition
                );
              })
            : [candidate];
        for (const entry of matching) {
          if (expanded.some((selection) => selection.candidate === entry.id))
            continue;
          expanded.push({
            ...selection,
            candidate: entry.id,
            ...(entry.id !== candidate.id ? { mirror: candidate.id } : {}),
          });
        }
      }
      if (expanded.length > 8)
        throw new Error(
          "An edit can affect at most eight components; select a smaller group",
        );
      const expandedCandidates = expanded.map((selection) => {
        const candidate = candidates.find(
          (candidate) => candidate.id === selection.candidate,
        )!;
        for (const adjustment of selection.adjustments ?? [])
          adjustedValue(candidate, adjustment);
        return candidate;
      });
      if (
        expandedCandidates.length &&
        expandedCandidates.every((candidate) => candidate.tool === "remove")
      )
        apply(
          expandedCandidates.map((candidate) => ({
            tool: "remove",
            arguments: { targets: [candidate.node] },
          })),
        );
      return { ...plan, selections: expanded };
    },
    "Resolve ONLY the original requested change. selections is an OBJECT keyed by candidate IDs; each value contains scope and fields. fields contains only allowed field-name strings, never objects. Numeric adjustments go in a separate ROOT array. Use a numeric operand implementing the original request. Preserve all unrequested settings. Close a fields array before its selection object, then the selections object, then the root object.",
    budget.signal,
    {
      budget,
      schema: toJsonSchema(intentSchema),
      maxTokens: 512,
      stage: "edit_intent",
      maxRepairsPerIssue: 3,
      repairFeedback,
      onEvent: (event, data) => budget.trace?.(`edit_intent.${event}`, data),
    },
  );
  if (plan.mode === "new") {
    budget.maxCalls = previousLimits.calls;
    budget.maxRepairs = previousLimits.repairs;
    return null;
  }
  if (plan.mode === "clarify" || plan.mode === "unsupported")
    return {
      protocolVersion: 1,
      status: plan.mode === "clarify" ? "clarification" : "unsupported",
      requestId: request.requestId,
      message: plan.message,
    };
  const selected = plan.selections.map((selection) => {
    const candidate = candidates.find(
      (candidate) => candidate.id === selection.candidate,
    )!;
    let schema = candidate.schema;
    if (candidate.tool === "configure")
      schema = object({
        ...properties(schema),
        changes: object(
          Object.fromEntries(
            selection.fields.map((field) => [
              field,
              editableFields(properties(schema).changes)[field],
            ]),
          ),
        ),
      });
    if (candidate.tool === "set_lesson")
      schema = object(
        Object.fromEntries(
          selection.fields.map((field) => [field, properties(schema)[field]]),
        ),
      );
    if (candidate.tool === "resize")
      schema = object({
        target: properties(schema).target,
        ...Object.fromEntries(
          selection.fields.map((field) => [field, properties(schema)[field]]),
        ),
      });
    const target = properties(schema).target;
    const node =
      target?.type === "enum"
        ? instances.find((node) => node.id === target.values[0])
        : undefined;
    const adjustments = selection.adjustments ?? [];
    const computed: Record<string, unknown> = {};
    for (const adjustment of adjustments)
      computed[adjustment.field] = adjustedValue(candidate, adjustment);
    const size = presentationItem(candidate);
    const complete =
      adjustments.length === selection.fields.length && adjustments.length > 0;
    const derived =
      candidate.tool === "remove"
        ? { targets: [candidate.node] }
        : candidate.tool === "resize" && size && complete
          ? {
              target: size.id,
              width: computed.width ?? size.rect.width,
              height: computed.height ?? size.rect.height,
            }
          : node && complete
            ? { target: node.id, changes: computed }
            : schema.type === "object" &&
                Object.keys(schema.properties).length === 0
              ? {}
              : null;
    return {
      ...candidate,
      schema,
      computed,
      derived,
      instance: node,
      mirror: selection.mirror,
    };
  });
  const inference = selected.filter(
    (candidate) => !candidate.derived && !candidate.mirror,
  );
  const argumentsContract = object(
    Object.fromEntries(
      inference.map((candidate) => [candidate.id, candidate.schema]),
    ),
  );
  const argumentsSchema = toJsonSchema(argumentsContract);
  const verifyRuntime = (commands: ScopedCommand[]) => {
    const runtime = new DocumentRuntime(document);
    const snapshot = runtime.getSnapshot();
    for (const node of document.nodes) {
      const state = active.runtimeContext[node.id];
      if (state && typeof state === "object" && !Array.isArray(state))
        snapshot.state[node.id] = {
          ...snapshot.state[node.id],
          ...structuredClone(state),
        };
    }
    runtime.adoptSnapshot(snapshot);
    const result = runtime.dispatch(commands);
    if (!result.accepted)
      throw new Error(
        result.error ||
          "The command cannot be performed on the current experiment",
      );
  };
  budget.trace?.("stage", { task: "edit_arguments" });
  const compile = (
    candidate: (typeof selected)[number],
    arguments_: Record<string, unknown>,
  ): ToolRequest | ScopedCommand => {
    validateValue(candidate.schema, arguments_);
    if (candidate.kind === "runtime")
      return {
        node: candidate.node,
        command: candidate.command,
        arguments: arguments_,
      } as ScopedCommand;
    if (candidate.tool === "configure")
      return {
        tool: "configure",
        arguments: {
          target: arguments_.target as string,
          changes: configurationPatch(candidate.instance!.configuration, {
            ...(arguments_.changes as Record<string, unknown>),
            ...candidate.computed,
          }),
        },
      };
    if (candidate.tool === "resize") {
      const size = presentationItem(candidate)!;
      return {
        tool: "resize",
        arguments: {
          target: size.id,
          width: (candidate.computed.width ??
            arguments_.width ??
            size.rect.width) as number,
          height: (candidate.computed.height ??
            arguments_.height ??
            size.rect.height) as number,
        },
      };
    }
    return {
      tool: candidate.tool,
      arguments:
        candidate.tool === "set_lesson"
          ? { ...document.lesson, ...arguments_ }
          : arguments_,
    } as ToolRequest;
  };
  const materialize = (argumentsById: Map<string, Record<string, unknown>>) =>
    selected.map((candidate) => {
      const args =
        candidate.derived ??
        argumentsById.get(candidate.mirror ?? candidate.id)!;
      return compile(
        candidate,
        candidate.mirror && !candidate.derived
          ? { ...args, target: candidate.instance!.id }
          : args,
      );
    });
  const operations = inference.length
    ? await requestStructured<(ToolRequest | ScopedCommand)[]>(
        [
          {
            role: "system",
            content:
              "For a resize operation, use current presentation bounds as the starting point and apply the requested size change. A larger view needs increased dimensions; copying its current dimensions is not an edit. Preserve proportions unless the request changes only one dimension, and never change physical model values.\n" +
              "Supply ONLY concrete arguments for the accepted edit plan. Return one OBJECT keyed by candidate ID, with each value being its argument object. Do not return an operations array or candidate/arguments envelopes. Include every supplied candidate exactly once. Compute relative edits once from supplied CURRENT values. Preserve every field outside the accepted plan. For runtime commands requiring siblings, copy unchanged siblings from current runtime state. Do not introduce targets, fields, tools, components, layout changes or lesson text outside the plan. Return evaluated JSON numbers, not expressions. Use current configuration, not original defaults. Return values, not schemas.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "edit_arguments",
              ...context,
              acceptedEdit: plan,
              operations: inference.map((candidate) => ({
                candidate: candidate.id,
                operation: candidate.tool,
                node: candidate.instance?.id ?? candidate.node,
                command: candidate.command,
                argumentSchema: toJsonSchema(candidate.schema),
              })),
              responseSchema: argumentsSchema,
            }),
          },
        ],
        (content) => {
          const { value } = parseArgumentJson(content);
          validateValue(argumentsContract, value);
          return materialize(
            new Map(
              Object.entries(value as Record<string, Record<string, unknown>>),
            ),
          );
        },
        "Return only the accepted operation arguments. Use exact target IDs and valid values; no change has been applied.",
        budget.signal,
        {
          budget,
          schema: argumentsSchema,
          maxTokens: 1024,
          stage: "edit_arguments",
          maxRepairsPerIssue: 3,
          repairFeedback: (error) => {
            const feedback = repairFeedback(error);
            return {
              ...feedback,
              details: {
                ...feedback.details,
                response_keys: ["operations"],
                expected_contract: argumentsSchema,
                accepted_plan: plan,
                allowed_arguments: inference.map((candidate) => ({
                  candidate: candidate.id,
                  schema: toJsonSchema(candidate.schema),
                })),
              },
            };
          },
          verify: (operations) => {
            if (plan.mode === "runtime")
              verifyRuntime(operations as ScopedCommand[]);
            else apply(operations as ToolRequest[]);
          },
          onEvent: (event, data) =>
            budget.trace?.(`edit_arguments.${event}`, data),
        },
      )
    : materialize(new Map());
  budget.trace?.("validation.start", { purpose: "edit" });
  if (plan.mode === "runtime")
    return {
      protocolVersion: 1,
      status: "runtime_action",
      requestId: request.requestId,
      expectedSessionId: active.sessionId,
      expectedInteractionRevision: active.interactionRevision,
      commands: operations as ScopedCommand[],
      message: plan.message || "Applied the requested action.",
    };
  const changes = selected.flatMap((candidate, index) => {
    if (candidate.tool !== "configure") return [];
    const configured = operations[index] as Extract<
      ToolRequest,
      { tool: "configure" }
    >;
    return Object.keys(
      properties(properties(candidate.schema).changes),
    ).flatMap((path) => {
      const value = fieldValue(configured.arguments.changes, path);
      const schema = editableFields(
        publicDefinition(candidate.instance!).configuration,
      )[path];
      if (!["number", "string", "boolean"].includes(typeof value)) return [];
      const unit = "unit" in schema ? schema.unit : "";
      return [`${path} to ${String(value)}${unit ? ` ${unit}` : ""}`];
    });
  });
  const configuredCount = operations.filter(
    (operation) => "tool" in operation && operation.tool === "configure",
  ).length;
  const summary = changes.length
    ? `Updated ${[...new Set(changes)].join(", ")}${configuredCount > 1 ? ` across ${configuredCount} components` : ""}.`
    : plan.message;
  return {
    protocolVersion: 1,
    status: "updated",
    requestId: request.requestId,
    expectedSessionId: active.sessionId,
    expectedAuthoredRevision: active.authoredRevision,
    recipe: apply(operations as ToolRequest[]),
    expectedInteractionRevision: active.interactionRevision,
    learnerExplanation: summary || "Updated the requested settings.",
  };
}
