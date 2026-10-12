/** Public progress contains stage identifiers only, never planner diagnostics. */
export const generationStages = {
  understanding: "Understanding your request…",
  choosing: "Choosing suitable activities…",
  building: "Building your lesson…",
  planning_changes: "Planning your changes…",
  applying: "Preparing your changes…",
  adjusting: "Making adjustments…",
  checking: "Checking your lesson…",
  checking_changes: "Checking your changes…",
  committing_changes: "Applying your changes…",
  opening: "Opening your lesson…",
} as const;
export type GenerationStage = keyof typeof generationStages;
export function isGenerationStage(value: unknown): value is GenerationStage {
  return typeof value === "string" && Object.hasOwn(generationStages, value);
}
export function progressFromTrace(
  event: string,
  data: unknown,
): GenerationStage | null {
  const task =
    data && typeof data === "object" && "task" in data ? data.task : null;
  if (event === "stage") {
    if (task === "edit_intent") return "planning_changes";
    if (task === "edit_arguments") return "applying";
    if (task === "teaching_intent") return "understanding";
    if (task === "followup_mode") return "planning_changes";
    if (task === "select_capability") return "choosing";
    if (task === "configure_selected_recipe") return "building";
    if (typeof task === "string" && /authoring|runtime_command/.test(task))
      return "applying";
  }
  if (event === "selection.start" || event === "bucket") return "choosing";
  if (event === "turn.start") return "building";
  if (event === "validation.start")
    return data &&
      typeof data === "object" &&
      "purpose" in data &&
      data.purpose === "edit"
      ? "checking_changes"
      : "checking";
  if (/\.(schemaFailure|semanticFailure)$/.test(event)) return "adjusting";
  return null;
}
