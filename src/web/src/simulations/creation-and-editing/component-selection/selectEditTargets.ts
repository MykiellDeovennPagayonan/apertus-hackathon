import {
  choice,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { EditPlan } from "../intent-interpreter/contracts";
import { interpretEdit } from "../intent-interpreter/interpretEdit";
import type { EditCandidates } from "./editCandidates";
export async function selectEditTargets(
  request: GenerationRequest,
  budget: GenerationBudget,
  env: EditCandidates,
  recovery?: { message: string; rejectedCandidates: string[] },
) {
  budget.trace?.("stage", { task: "edit_target" });
  const { candidates, document, selectionCatalog } = env;
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
  return await requestStructured<{
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
          recovery,
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
      const selected = interpretEdit(value, candidates);
      if (
        recovery &&
        selected.candidates.length &&
        selected.candidates.length === recovery.rejectedCandidates.length &&
        selected.candidates.every((id) =>
          recovery.rejectedCandidates.includes(id),
        )
      )
        throw new Error(
          "This target set already failed validation. Select different supported targets from the full catalog or ask a specific clarification question.",
        );
      return selected;
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
}
