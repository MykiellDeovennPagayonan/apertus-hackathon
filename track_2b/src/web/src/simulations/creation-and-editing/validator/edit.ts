import { object } from "../../registry/contracts/parameterSchema";
import { finalizeRecipe } from "../authoring-engine/finalizeRecipe";
import type { ToolRequest } from "../authoring-engine/operations";
import { serializeRecipe } from "../authoring-engine/serializeRecipe";
import { AuthoringTransaction } from "../authoring-engine/transaction";
import type { EditCandidates } from "../component-selection/editCandidates";
import type { EditIntent, EditPlan } from "../intent-interpreter/contracts";
import {
  DocumentRuntime,
  type ScopedCommand,
} from "../runtime-engine/DocumentRuntime";
import { parseRecipe } from "./parseRecipe";
export class EditValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown>,
  ) {
    super(message);
  }
}
export function validateEditResult(
  env: EditCandidates,
  requestId: string,
  operations: ToolRequest[],
) {
  const { active, document, componentChoices } = env;
  const target = new AuthoringTransaction(requestId, document);
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
}
export function validateRuntimeEdit(
  env: EditCandidates,
  commands: ScopedCommand[],
) {
  const { active, document } = env;
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
}
export function validateEditPlan(
  value: unknown,
  env: EditCandidates,
  adjustedValue: (
    candidate: EditCandidates["candidates"][number],
    adjustment: NonNullable<
      EditPlan["selections"][number]["adjustments"]
    >[number],
  ) => number,
  apply: (operations: ToolRequest[]) => unknown,
): EditPlan {
  const {
    instances,
    candidates,
    candidateFields,
    properties,
    componentChoices,
    candidateChoices,
  } = env;
  const { adjustments = [], ...intent } = value as EditIntent;
  if (
    adjustments.some(
      (adjustment) => !Object.hasOwn(intent.selections, adjustment.candidate),
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
    if (selection.scope === "all_matching" && candidate.tool !== "configure")
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
}
