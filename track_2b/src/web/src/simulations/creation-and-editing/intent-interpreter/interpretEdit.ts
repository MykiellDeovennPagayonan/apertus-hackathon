import type { EditCandidates } from "../component-selection/editCandidates";
import type { EditPlan } from "./contracts";
export function interpretEdit(
  value: unknown,
  candidates: EditCandidates["candidates"],
) {
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
}
