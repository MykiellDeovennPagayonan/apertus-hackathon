import { emptyAuthoredDocument } from "./authoring-engine/document";
import { GenerationBudget, type TraceSink } from "./budget";
import { createSimulation as composeCreation } from "./composer/create";
import { editSimulation as composeEdit } from "./composer/edit";
import { PlannerError } from "./errors";
import {
  type GenerationRequest,
  parseGenerationRequest,
} from "./input/contracts";
import { type GenerationResult, parseGenerationResult } from "./input/results";
import type { ConstructionSink } from "./simulation/construction/contracts";
import { ConstructionPublisher } from "./simulation/construction/publisher";

let activeRequests = 0;
async function planPromptInternal(
  input: GenerationRequest,
  budget: GenerationBudget,
): Promise<GenerationResult> {
  const request = parseGenerationRequest(input);
  const mode = process.env.PLANNER_MODE ?? "hybrid";
  if (!["hybrid", "apertus"].includes(mode))
    throw new PlannerError("PLANNER_MODE must be hybrid or apertus.", 503);
  const limit = Number(process.env.PLANNER_MAX_CONCURRENT_REQUESTS ?? 1);
  if (!Number.isInteger(limit) || limit < 1 || limit > 16)
    throw new PlannerError("Invalid planner concurrency.", 503);
  budget.check();
  if (activeRequests >= limit)
    throw new PlannerError("Planner is busy. Please try again shortly.", 429);
  activeRequests++;
  try {
    const edit =
      request.purpose === "create" ? null : await composeEdit(request, budget);
    if (edit) return parseGenerationResult(edit, request);
    return await composeCreation(request, budget);
  } catch (error) {
    budget.check();
    throw error instanceof PlannerError
      ? error
      : new PlannerError(
          error instanceof Error
            ? error.message
            : "Unable to construct a valid lesson.",
          502,
        );
  } finally {
    activeRequests--;
  }
}
export async function planPrompt(
  input: GenerationRequest,
  signal?: AbortSignal,
  trace?: TraceSink,
  sink?: ConstructionSink,
): Promise<GenerationResult> {
  const request = parseGenerationRequest(input);
  const budget = new GenerationBudget(signal, trace);
  const initial = request.active?.recipe.document ?? emptyAuthoredDocument();
  const publisher =
    request.destination === "builder" &&
    request.construction === "live" &&
    sink &&
    (request.purpose === "create" ||
      !request.active?.recipe.document.nodes.length)
      ? new ConstructionPublisher(
          request.requestId,
          initial,
          sink,
          budget.signal,
        )
      : undefined;
  budget.construction = publisher;
  try {
    const result = await planPromptInternal(request, budget);
    if (
      publisher &&
      (result.status === "created" || result.status === "updated")
    ) {
      if (
        result.recipe.document.nodes.some(
          (node) => !initial.nodes.some((existing) => existing.id === node.id),
        )
      )
        result.recipe.document = publisher.finalize(result.recipe.document);
      parseGenerationResult(result, request);
      await publisher.publish(
        result.recipe.document,
        publisher.latestRevision,
        "checking",
      );
    }
    budget.check();
    return parseGenerationResult(result, request);
  } catch (error) {
    budget.check();
    throw error;
  }
}

export function createSimulation(
  input: GenerationRequest,
  signal?: AbortSignal,
  trace?: TraceSink,
  sink?: ConstructionSink,
) {
  return planPrompt({ ...input, purpose: "create" }, signal, trace, sink);
}
export function editSimulation(
  input: GenerationRequest,
  signal?: AbortSignal,
  trace?: TraceSink,
) {
  return planPrompt({ ...input, purpose: "edit" }, signal, trace);
}
