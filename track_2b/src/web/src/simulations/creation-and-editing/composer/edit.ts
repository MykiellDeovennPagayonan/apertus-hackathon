import { publicDefinition } from "../../registry/index";
import {
  editableFields,
  fieldValue,
} from "../authoring-engine/configurationPatch";
import type { ToolRequest } from "../authoring-engine/operations";
import type { GenerationBudget } from "../budget";
import { editCandidates } from "../component-selection/editCandidates";
import { selectEditTargets } from "../component-selection/selectEditTargets";
import { PlannerError } from "../errors";
import type { GenerationRequest } from "../input/contracts";
import type { GenerationResult } from "../input/results";
import type { EditPlan } from "../intent-interpreter/contracts";
import type { ScopedCommand } from "../runtime-engine/DocumentRuntime";
import { EditValidationError, validateEditResult } from "../validator/edit";
import { editArguments } from "./editArguments";
import { editPlan } from "./editPlan";
export async function editSimulation(
  request: GenerationRequest,
  budget: GenerationBudget,
): Promise<GenerationResult | null> {
  if (!request.active?.recipe.document.nodes.length) return null;
  const env = editCandidates(request);
  const { active, properties } = env;
  const previousLimits = { calls: budget.maxCalls, repairs: budget.maxRepairs };
  budget.maxCalls = Math.max(budget.maxCalls, 12);
  budget.maxRepairs = Math.max(budget.maxRepairs, 10);
  budget.trace?.("edit_context", {
    candidates: env.candidates.length,
    catalogCharacters: JSON.stringify(env.selectionCatalog).length,
  });
  let target = await selectEditTargets(request, budget, env);
  let plan: EditPlan;
  let result: Awaited<ReturnType<typeof editArguments>>;
  for (let attempt = 0; ; attempt++) {
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
    try {
      plan = await editPlan(request, budget, env, target);
      if (plan.mode === "clarify" || plan.mode === "unsupported")
        return {
          protocolVersion: 1,
          status: plan.mode === "clarify" ? "clarification" : "unsupported",
          requestId: request.requestId,
          message: plan.message,
        };
      result = await editArguments(request, budget, env, plan);
      break;
    } catch (error) {
      budget.check();
      budget.signal.throwIfAborted();
      const rejection = error instanceof PlannerError ? error.cause : error;
      const invalidProposal =
        rejection instanceof EditValidationError &&
        /^(invalid_result|invalid_recipe):/.test(rejection.code);
      if (
        !invalidProposal ||
        attempt ||
        budget.calls >= budget.maxCalls ||
        budget.repairs >= budget.maxRepairs
      )
        throw error;
      const message =
        error instanceof Error
          ? error.message
          : "The selected operations cannot apply this change.";
      budget.trace?.("edit_target.reselection", {
        rejectedCandidates: target.candidates,
        message,
      });
      target = await selectEditTargets(request, budget, env, {
        message,
        rejectedCandidates: target.candidates,
      });
    }
  }
  const { operations, selected } = result;
  const apply = (operations: ToolRequest[]) =>
    validateEditResult(env, request.requestId, operations);
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
