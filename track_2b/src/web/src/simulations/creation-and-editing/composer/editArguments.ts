import {
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import {
  configurationPatch,
  editableFields,
} from "../authoring-engine/configurationPatch";
import type { ToolRequest } from "../authoring-engine/operations";
import type { GenerationBudget } from "../budget";
import type { EditCandidates } from "../component-selection/editCandidates";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { EditPlan } from "../intent-interpreter/contracts";
import type { ScopedCommand } from "../runtime-engine/DocumentRuntime";
import { validateEditResult, validateRuntimeEdit } from "../validator/edit";
import { editPlanHelpers } from "./editPlan";
export async function editArguments(
  request: GenerationRequest,
  budget: GenerationBudget,
  env: EditCandidates,
  plan: EditPlan,
) {
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
  const { adjustedValue, repairFeedback } = editPlanHelpers(env);
  const apply = (operations: ToolRequest[]) =>
    validateEditResult(env, request.requestId, operations);
  const verifyRuntime = (commands: ScopedCommand[]) =>
    validateRuntimeEdit(env, commands);
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
          ? { target: size.id, ...computed }
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
  const argumentFields = inference
    .flatMap((candidate) => {
      if (candidate.schema.type !== "object")
        throw new Error("Operation arguments must be an object");
      const schema =
        candidate.tool === "configure"
          ? properties(candidate.schema).changes
          : candidate.schema;
      if (schema.type !== "object")
        throw new Error("Configuration changes must be an object");
      return Object.entries(schema.properties)
        .filter(([field]) => candidate.tool !== "resize" || field !== "target")
        .map(([field, contract]) => ({
          candidate,
          field,
          contract,
          optional: schema.optional?.includes(field) ?? false,
        }));
    })
    .map((entry, index) => ({ ...entry, key: `arg${index + 1}` }));
  const argumentsContract = object(
    Object.fromEntries(
      argumentFields.map((entry) => [entry.key, entry.contract]),
    ),
    argumentFields.filter((entry) => entry.optional).map((entry) => entry.key),
  );
  const selectedNodeIds = new Set(
    selected.flatMap((candidate) => {
      if (candidate.tool === "arrange")
        return context.presentation.flatMap((item) =>
          item.node ? [item.node] : [],
        );
      const node = candidate.instance?.id ?? candidate.node;
      return node ? [node] : [];
    }),
  );
  const focusedContext = {
    request: request.prompt,
    clarification: request.clarification,
    destination: context.destination,
    currentLesson: selected.some((candidate) => candidate.tool === "set_lesson")
      ? document.lesson
      : undefined,
    nodes: context.nodes
      .filter((node) => selectedNodeIds.has(node.id))
      .map(({ assumptions: _assumptions, ...node }) => ({
        ...node,
        currentConfiguration: Object.fromEntries(
          Object.entries(node.currentConfiguration).filter(([field]) =>
            selected.some(
              (candidate) =>
                candidate.instance?.id === node.id &&
                plan.selections
                  .find((selection) => selection.candidate === candidate.id)
                  ?.fields.some((path) => path.split(".")[0] === field),
            ),
          ),
        ),
        runtime: selected.some(
          (candidate) =>
            candidate.kind === "runtime" && candidate.node === node.id,
        )
          ? node.runtime
          : undefined,
      })),
    connections: context.connections.filter(
      (wire) =>
        selectedNodeIds.has(wire.from.node) ||
        selectedNodeIds.has(wire.to.node),
    ),
    presentation: selected.some((candidate) => candidate.tool === "arrange")
      ? context.presentation
      : selected.flatMap((candidate) => {
          const item = presentationItem(candidate);
          return item
            ? [{ id: item.id, bounds: item.rect, locked: item.locked }]
            : [];
        }),
  };
  const argumentsSchema = toJsonSchema(argumentsContract);
  budget.trace?.("stage", { task: "edit_arguments" });
  const compile = (
    candidate: (typeof selected)[number],
    arguments_: Record<string, unknown>,
  ): ToolRequest | ScopedCommand => {
    if (candidate.tool === "configure")
      arguments_ = { ...arguments_, target: candidate.instance!.id };
    if (candidate.tool === "resize")
      arguments_ = { ...arguments_, target: presentationItem(candidate)!.id };
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
          changes: configurationPatch(
            currentConfiguration(candidate.instance!.id),
            {
              ...(arguments_.changes as Record<string, unknown>),
              ...candidate.computed,
            },
          ),
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
              "Supply ONLY concrete arguments for the accepted edit plan. Return ONE FLAT object keyed only by the supplied argument IDs, with each value matching that argument's schema. The application owns targets and operation envelopes. Do not return nested changes/operations envelopes, field names as keys, or candidate IDs as keys. Include every required argument exactly once. Compute relative edits once from supplied CURRENT values. Preserve every field outside the accepted plan. For runtime commands requiring siblings, copy unchanged siblings from current runtime state. Do not introduce targets, fields, tools, components, layout changes or lesson text outside the plan. Return evaluated JSON numbers, not expressions. Use current configuration, not original defaults. Return values, not schemas.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "edit_arguments",
              ...focusedContext,
              acceptedEdit: plan,
              arguments: argumentFields.map(
                ({ key, candidate, field, contract, optional }) => ({
                  id: key,
                  operation: candidate.id,
                  tool: candidate.tool,
                  node: candidate.instance?.id ?? candidate.node,
                  command: candidate.command,
                  field,
                  optional,
                  schema: toJsonSchema(contract),
                  currentBounds: presentationItem(candidate)?.rect,
                }),
              ),
              responseSchema: argumentsSchema,
            }),
          },
        ],
        (content) => {
          const { value } = parseArgumentJson(content);
          validateValue(argumentsContract, value);
          const wire = value as Record<string, unknown>;
          return materialize(
            new Map(
              inference.map((candidate) => {
                const args = Object.fromEntries(
                  argumentFields
                    .filter(
                      (entry) =>
                        entry.candidate.id === candidate.id &&
                        Object.hasOwn(wire, entry.key),
                    )
                    .map((entry) => [entry.field, wire[entry.key]]),
                );
                return [
                  candidate.id,
                  candidate.tool === "configure" ? { changes: args } : args,
                ];
              }),
            ),
          );
        },
        "Return only the flat argument-ID object with concrete valid values. The application supplies the selected targets; no change has been applied.",
        budget.signal,
        {
          budget,
          schema: argumentsSchema,
          maxTokens: 1024,
          stage: "edit_arguments",
          memoryContext: {
            revision: "edit-arguments-v1",
            tools: [
              ...new Set(argumentFields.map((entry) => entry.candidate.tool)),
            ],
            fields: Object.fromEntries(
              argumentFields.map(({ key, candidate, field }) => [
                key,
                `${candidate.instance?.definition ?? candidate.tool}:${candidate.instance?.version ?? ""}:${candidate.tool}:${field}`,
              ]),
            ),
          },
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
                response_keys: argumentFields.map((entry) => entry.key),
                expected_contract: argumentsSchema,
                accepted_plan: plan,
                allowed_arguments: argumentFields.map(
                  ({ key, field, contract }) => ({
                    id: key,
                    field,
                    schema: toJsonSchema(contract),
                  }),
                ),
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
  return { operations, selected };
}
