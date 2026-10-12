import { publicDefinition } from "../../simulations/components/catalog";
import { readoutLabel } from "../../simulations/components/views/recipe/observations";
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
  object,
  num,
  type ParameterSchema,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { toJsonSchema } from "../apertus/structuredSchema";
import { requestStructured } from "../apertus/transport";
import { parseArgumentJson } from "./argumentJson";
import type { GenerationBudget } from "./budget";
import { configurationPatch, editableFields, fieldValue } from "./editFields";
import type { GenerationRequest, GenerationResult } from "./schema";
import { buildTurnTools } from "./turnSchema";
import { parseRecipe } from "../../simulations/runtime/recipes/schema";
import { serializeRecipe } from "../../simulations/runtime/recipes/serializeRecipe";

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
        tool.tool === "configure" &&
        tool.schema.type === "object" &&
        tool.schema.properties.target.type === "enum"
          ? `configure:${tool.schema.properties.target.values[0]}`
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
      : candidate.tool === "set_lesson"
        ? properties(candidate.schema)
        : {};
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
    adjustment: NonNullable<EditPlan["selections"][number]["adjustments"]>[number],
  ) => {
    const target = properties(candidate.schema).target;
    const node = instances.find(
      (node) => target?.type === "enum" && node.id === target.values[0],
    )!;
    const current = fieldValue(currentConfiguration(node.id), adjustment.field);
    const schema = candidateFields(candidate)[adjustment.field];
    const details = {
      node_id: node.id,
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
        `unavailable_value:${node.id}:${adjustment.field}`,
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
        `invalid_value:${node.id}:${adjustment.field}`,
        error instanceof Error ? error.message : "Invalid value",
        { ...details, received: value },
      );
    }
    return value;
  };
  const intentSchema = object({
    mode: choice("edit", "runtime", "new", "unsupported", "clarify"),
    selections: {
      type: "array",
      minItems: 0,
      maxItems: 8,
      items: object(
        {
          candidate: choice(...candidates.map((candidate) => candidate.id)),
          scope: choice("selected", "all_matching"),
          fields: {
            type: "array",
            minItems: 0,
            maxItems: 12,
            items: { type: "string", maxLength: 100 },
          },
          adjustments: {
            type: "array",
            minItems: 0,
            maxItems: 12,
            items: object({
              field: { type: "string", maxLength: 100 },
              operation: choice("set", "scale", "offset"),
              operand: num(-Number.MAX_VALUE, Number.MAX_VALUE),
            }),
          },
        },
        ["adjustments"],
      ),
    },
    message: { type: "string", minLength: 0, maxLength: 400 },
  }, ["message"]);
  budget.trace?.("stage", { task: "edit_intent" });
  const context = {
    request: request.prompt,
    clarification: request.clarification,
    currentLesson: document.lesson,
    destination: request.destination ?? "lesson",
    connections: document.connections,
    nodes: instances.map((node) => {
      const binding = document.connections.find(
        (connection) => connection.kind === "value" && connection.to.node === node.id,
      );
      const source = instances.find((instance) => instance.id === binding?.from.node);
      const label = typeof node.configuration.label === "string" && node.configuration.label
        ? node.configuration.label
        : node.label;
      return {
      id: node.id,
      label: node.label,
      visibleName:
        node.definition === "displays/Readout"
          ? readoutLabel(label, source?.definition, binding?.from.port,
              source && binding ? publicDefinition(source).outputs[binding.from.port]?.unit : "")
          : label,
      definition: node.definition,
      title: publicDefinition(node).title,
      currentConfiguration: currentConfiguration(node.id),
      editableSettings: Object.keys(
        editableFields(publicDefinition(node).configuration),
      ),
      units: Object.fromEntries(
        Object.entries(
          editableFields(publicDefinition(node).configuration),
        ).flatMap(([path, schema]) =>
          "unit" in schema && schema.unit ? [[path, schema.unit]] : [],
        ),
      ),
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
  const candidateChoices = candidates.map((candidate) => ({
    id: candidate.id,
    mode: candidate.kind,
    operation: candidate.tool,
    allowedFields: Object.keys(candidateFields(candidate)),
    ...(candidate.node ? { node: candidate.node } : {}),
    ...(candidate.kind === "runtime"
      ? { command: candidate.command, description: candidate.description }
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
  }));
  const repairFeedback = (error: unknown) => {
    if (error instanceof EditValidationError)
      return { key: error.code, details: { code: error.code, ...error.details } };
    const message = error instanceof Error ? error.message : "Invalid JSON";
    const invalidJson =
      error instanceof SyntaxError || /JSON|Unexpected token|Unterminated/i.test(message);
    const path = invalidJson ? "$" : message.split(":")[0];
    const code = invalidJson
      ? "invalid_json"
      : /\.candidate$/.test(path)
        ? "unknown_operation"
        : /\.targets(?:\[\d+\])?$/.test(path)
          ? "unknown_target"
          : /expected (?:number|integer|boolean|one of)|invalid string/.test(message)
            ? "invalid_value"
            : /unknown field/.test(message)
              ? "unknown_field"
              : "invalid_schema";
    let expected: ParameterSchema | undefined = intentSchema;
    for (const part of path.replace(/\[(\d+)\]/g, ".$1").split(".").slice(1)) {
      expected = expected?.type === "array"
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
        repair: code === "unknown_field" ? {
          action: "remove_unknown_key",
          key: /unknown field (\S+)/.exec(message)?.[1],
          allowed_keys: Object.keys(properties(expected)),
          message_location: "response_root",
        } : undefined,
        allowed_components: ["unknown_operation", "unknown_target"].includes(code)
          ? componentChoices : undefined,
        allowed_operations: code === "unknown_operation" ? candidateChoices : undefined,
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
        receipt.issues.map((issue) => issue.message).join("; ") || receipt.summary,
        {
          issues: receipt.issues,
          allowed_components: componentChoices,
          connections: document.connections,
        },
      );
    }
    try {
      const recipe = parseRecipe(serializeRecipe(active.recipe, target.document));
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
  budget.maxCalls = Math.max(budget.maxCalls, 12);
  budget.maxRepairs = Math.max(budget.maxRepairs, 10);
  const plan = await requestStructured<EditPlan>(
    [
      {
        role: "system",
        content:
          "Selection objects contain ONLY candidate, scope, fields and optional adjustments. message belongs at the response root, NEVER inside selections. A removal uses scope selected and fields [].\n" +
          "Use visibleName and connections to identify which model output a visible display shows. Removing a display or control means selecting its remove:<node-id> candidate with fields [] and scope selected. Select one removal candidate per requested component; fixedArguments already identifies the target, so never put node IDs or measurement names in fields. Removing a swing-time display removes the readout connected to period, while preserving the pendulum. Each candidate supplies allowedFields: select fields only from that candidate's list. Measurement outputs are not editable configuration fields.\n" +
          "Interpret this natural-language follow-up against the supplied ACTIVE experiment and its real configuration. This is editing, not topic selection or lesson creation. Select ONLY requested changes. Physical conditions belong to model configuration; do not change controls, angles, wording or layout unless asked. Use exact candidate IDs and editableSettings. fields lists only the requested settings. An unqualified shared condition uses scope all_matching with one representative; a named instance uses selected. The application expands shared changes and preserves everything else.\nReturn only mode, selections, message. Each selection contains candidate, scope, fields and optional adjustments. For every requested numeric value supply adjustments: set with the numeric value (resolve scientific references using supplied units), scale with a multiplier for relative changes, offset for an addition. The app computes scale/offset from the actual CURRENT value; never use startup defaults. Half means scale 0.5; double means scale 2. A relative numeric edit MUST retain its adjustment, including when repairing output. Example for halving an existing spring stiffness: {\"mode\":\"edit\",\"selections\":[{\"candidate\":\"configure:spring-id\",\"scope\":\"all_matching\",\"fields\":[\"stiffness\"],\"adjustments\":[{\"field\":\"stiffness\",\"operation\":\"scale\",\"operand\":0.5}]}],\"message\":\"Halve stiffness\"}. For setting a mass to 3 kg use fields [\"mass\"] and adjustments [{\"field\":\"mass\",\"operation\":\"set\",\"operand\":3}]. Omit adjustments only for non-numeric or genuinely unresolved values.\nUse runtime only for explicit actions now (launch, play, pause, reset) and declared commands; fields is []. Other structural edit operations use fields [] except set_lesson, which names requested lesson fields. Use new only for an explicit replacement experiment. A scientific reference does not request a new topic. Unsupported means capability absent or fidelity violated. Clarify asks one specific question only if the current context cannot resolve the target or behavior. New/unsupported/clarify have selections []. If clarification is supplied, interpret the latest request as its answer in the original prompt context. Return valid JSON with concrete numbers, never arithmetic expressions, tool arguments or capability descriptions.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "edit_intent",
          ...context,
          candidates: candidateChoices,
          removalExamples: context.nodes.filter((node) =>
            publicDefinition(node.definition).category === "displays",
          ).slice(0, 2).map((node) => ({
            request: `remove the ${node.visibleName} display`,
            response: {
              mode: "edit",
              selections: [{ candidate: `remove:${node.id}`, scope: "selected", fields: [] }],
              message: `Remove ${node.visibleName}`,
            },
          })),
        }),
      },
    ],
    (content) => {
      const { value } = parseArgumentJson(content);
      validateValue(intentSchema, value);
      const plan = value as EditPlan;
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
              candidate.tool !== "configure" ||
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
        const candidate = candidates.find((candidate) => candidate.id === selection.candidate)!;
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
    "Resolve ONLY the original requested change against supplied IDs and fields. For numeric changes retain adjustments with set, scale or offset and a numeric operand; half is scale 0.5. Do not add another change or select a topic. Return the exact edit intent JSON shape from the original instructions.",
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
    const target = properties(schema).target;
    const node =
      target?.type === "enum"
        ? instances.find((node) => node.id === target.values[0])
        : undefined;
    const adjustments = selection.adjustments ?? [];
    const computed: Record<string, unknown> = {};
    for (const adjustment of adjustments)
      computed[adjustment.field] = adjustedValue(candidate, adjustment);
    const derived =
      candidate.tool === "remove"
        ? { targets: [candidate.node] }
        : node && adjustments.length === selection.fields.length && adjustments.length > 0
          ? { target: node.id, changes: computed }
          : schema.type === "object" && Object.keys(schema.properties).length === 0
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
  const argumentsSchema = {
    type: "object",
    additionalProperties: false,
    required: ["operations"],
    properties: {
      operations: {
        type: "array",
        minItems: inference.length,
        maxItems: inference.length,
        items: {
          anyOf: inference.map((candidate) =>
            toJsonSchema(
              object({
                candidate: choice(candidate.id),
                arguments: candidate.schema,
              }),
            ),
          ),
        },
      },
    },
  };
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
              'Supply ONLY concrete arguments for the accepted edit plan. Return {"operations":[{"candidate":"selected-id","arguments":{}}]}. Include every selected candidate exactly once. Compute relative edits once from each supplied CURRENT value: half means value / 2, double means value * 2. Preserve every field outside the accepted plan. Resolve equivalent natural-language descriptions to meaningful values within the schema. For runtime commands requiring sibling values, copy unchanged siblings from the current runtime state. Do not introduce topics, targets, fields, tools, components, layout changes or lesson text outside the plan. Return evaluated JSON numbers, never expressions such as 9.81 / 2. Use the supplied current configuration, not original defaults. Return values, not schemas.',
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
          if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            Object.keys(value).length !== 1 ||
            !("operations" in value) ||
            !Array.isArray(value.operations) ||
            value.operations.length !== inference.length
          )
            throw new Error(
              "Return one operations array matching the accepted plan",
            );
          const seen = new Set<string>();
          const responses = value.operations;
          const argumentsById = new Map<string, Record<string, unknown>>();
          for (const operation of responses) {
            const candidate = inference.find(
              (candidate) => candidate.id === operation?.candidate,
            );
            if (!candidate || seen.has(candidate.id))
              throw new Error("Use every accepted candidate exactly once");
            validateValue(
              object({
                candidate: choice(candidate.id),
                arguments: candidate.schema,
              }),
              operation,
            );
            seen.add(candidate.id);
            argumentsById.set(candidate.id, operation.arguments);
          }
          return materialize(argumentsById);
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
