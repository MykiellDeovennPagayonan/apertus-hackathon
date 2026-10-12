import { publicDefinition } from "../../simulations/components/catalog";
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
import { PlannerError } from "./errors";
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
        (tool) => tool.tool !== "configure",
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
    nodes: instances.map((node) => ({
      id: node.id,
      label: node.label,
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
    })),
  };
  const plan = await requestStructured<EditPlan>(
    [
      {
        role: "system",
        content:
          "Interpret this natural-language follow-up against the supplied ACTIVE experiment and its real configuration. This is editing, not topic selection or lesson creation. Select ONLY requested changes. Physical conditions belong to model configuration; do not change controls, angles, wording or layout unless asked. Use exact candidate IDs and editableSettings. fields lists only the requested settings. An unqualified shared condition uses scope all_matching with one representative; a named instance uses selected. The application expands shared changes and preserves everything else.\nReturn only mode, selections, message. Each selection contains candidate, scope, fields and optional adjustments. For every requested numeric value supply adjustments: set with the numeric value (resolve scientific references using supplied units), scale with a multiplier for relative changes, offset for an addition. The app computes scale/offset from the actual CURRENT value; never use startup defaults. Half means scale 0.5; double means scale 2. A relative numeric edit MUST retain its adjustment, including when repairing output. Example for halving an existing spring stiffness: {\"mode\":\"edit\",\"selections\":[{\"candidate\":\"configure:spring-id\",\"scope\":\"all_matching\",\"fields\":[\"stiffness\"],\"adjustments\":[{\"field\":\"stiffness\",\"operation\":\"scale\",\"operand\":0.5}]}],\"message\":\"Halve stiffness\"}. For setting a mass to 3 kg use fields [\"mass\"] and adjustments [{\"field\":\"mass\",\"operation\":\"set\",\"operand\":3}]. Omit adjustments only for non-numeric or genuinely unresolved values.\nUse runtime only for explicit actions now (launch, play, pause, reset) and declared commands; fields is []. Other structural edit operations use fields [] except set_lesson, which names requested lesson fields. Use new only for an explicit replacement experiment. A scientific reference does not request a new topic. Unsupported means capability absent or fidelity violated. Clarify asks one specific question only if the current context cannot resolve the target or behavior. New/unsupported/clarify have selections []. If clarification is supplied, interpret the latest request as its answer in the original prompt context. Return valid JSON with concrete numbers, never arithmetic expressions, tool arguments or capability descriptions.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "edit_intent",
          ...context,
          candidates: candidates.map((candidate) => ({
            id: candidate.id,
            mode: candidate.kind,
            operation: candidate.tool,
            ...(candidate.kind === "runtime"
              ? {
                  node: candidate.node,
                  command: candidate.command,
                  description: candidate.description,
                }
              : {}),
            fixedArguments: Object.fromEntries(
              Object.entries(properties(candidate.schema))
                .filter(([, schema]) => schema.type === "enum")
                .map(([key, schema]) => [
                  key,
                  schema.type === "enum" ? schema.values : [],
                ]),
            ),
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
        throw new Error(
          "Edits need selections; new, unsupported and clarify must have none",
        );
      const seen = new Set<string>();
      for (const selected of plan.selections) {
        const candidate = candidates.find(
          (candidate) => candidate.id === selected.candidate,
        )!;
        if (candidate.kind !== plan.mode || seen.has(candidate.id))
          throw new Error(
            "Choose distinct candidates from the selected edit mode",
          );
        seen.add(candidate.id);
        const fields =
          candidate.tool === "configure"
            ? editableFields(properties(candidate.schema).changes)
            : candidate.tool === "set_lesson"
              ? properties(candidate.schema)
              : {};
        if (Object.keys(fields).length && !selected.fields.length)
          throw new Error(
            "Specify the requested fields for configuration or lesson edits",
          );
        if (
          new Set(selected.fields).size !== selected.fields.length ||
          selected.fields.some((field) => !Object.hasOwn(fields, field))
        )
          throw new Error(
            "Choose actual editable fields on the selected component",
          );
        if (
          selected.fields.some((field) =>
            selected.fields.some(
              (other) => other !== field && field.startsWith(`${other}.`),
            ),
          )
        )
          throw new Error("Choose a field or its nested children, not both");
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
          throw new Error(
            "Relative arithmetic requires distinct selected numeric configuration fields",
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
          throw new Error(
            "all_matching is only for a shared configuration setting",
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
      return { ...plan, selections: expanded };
    },
    "Resolve ONLY the original requested change against supplied IDs and fields. For numeric changes retain adjustments with set, scale or offset and a numeric operand; half is scale 0.5. Do not add another change or select a topic. Return the exact edit intent JSON shape from the original instructions.",
    budget.signal,
    {
      budget,
      schema: toJsonSchema(intentSchema),
      maxTokens: 512,
      stage: "edit_intent",
      onEvent: (event, data) => budget.trace?.(`edit_intent.${event}`, data),
    },
  );
  if (plan.mode === "new") return null;
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
    for (const adjustment of adjustments) {
      const value = fieldValue(
        currentConfiguration(node!.id),
        adjustment.field,
      );
      if (
        adjustment.operation !== "set" &&
        (typeof value !== "number" || !Number.isFinite(value))
      )
        throw new PlannerError(
          "The current value for this relative edit is unavailable. Specify an absolute value.",
          422,
        );
      computed[adjustment.field] =
        adjustment.operation === "set"
          ? adjustment.operand
          : adjustment.operation === "scale"
            ? (value as number) * adjustment.operand
            : (value as number) + adjustment.operand;
    }
    const derived =
      node &&
      adjustments.length === selection.fields.length &&
      adjustments.length > 0
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
  const draft = new AuthoringTransaction(request.requestId, document);
  const apply = (operations: ToolRequest[]) => {
    const target = draft.fork();
    const receipt = target.execute({
      draftId: target.draftId,
      expectedRevision: target.revision,
      operationId: "edit",
      request: operations,
    });
    if (receipt.status !== "applied")
      throw new Error(
        receipt.issues.map((issue) => issue.message).join("; ") ||
          receipt.summary,
      );
    const recipe = parseRecipe(serializeRecipe(active.recipe, target.document));
    finalizeRecipe(recipe.document, recipe);
    return recipe;
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
