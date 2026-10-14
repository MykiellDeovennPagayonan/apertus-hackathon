import {
  choice,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { requestStage } from "../input/inference/stage";
import { toJsonSchema } from "../input/inference/structuredSchema";
import type { TeachingIntent } from "../intent-interpreter/contracts";
import { retrieveCapabilities } from "./recipeCapabilities";
import { selectCapability } from "./selectAssemblies";
export async function select(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
) {
  budget.trace?.("selection.start", {});
  let ranked = retrieveCapabilities(request.prompt, intent);
  if (!ranked.length) {
    budget.broaderSearches++;
    ranked = retrieveCapabilities(request.prompt, intent, true);
    budget.trace?.("retrieval.broader", {
      reason: "No useful initial candidate",
      cards: ranked.map((r) => r.card.recipeSlug),
    });
  }
  budget.trace?.(
    "retrieval",
    ranked.map(({ card, score }) => ({ card, score })),
  );
  if (!ranked.length) return null;
  if (ranked.length === 1 || ranked[0].score >= ranked[1].score + 8) {
    budget.trace?.("selection.decision", {
      status: "skipped",
      reason: "Unambiguous grounded capability",
    });
    return ranked[0].card;
  }
  const cards = ranked.map((r) => r.card);
  if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
    const selected = await selectCapability(
      request.prompt,
      intent,
      cards,
      budget,
      () => budget.decision,
    );
    if (selected.status === "selected") return selected.capability;
  } else
    budget.trace?.("selection.decision", {
      status: "skipped",
      reason: "Decision selection disabled",
    });
  const schema = selectionSchema(cards.map((c) => c.recipeSlug));
  const selected = await requestStage(
    "select_capability",
    request,
    budget,
    toJsonSchema(schema),
    {
      candidates: cards,
      policy:
        "Choose substantial learning overlap, or unclear. Do not construct a lesson on a token match.",
    },
    (value) => {
      validateValue(schema, value);
      return (value as { selected: string }).selected;
    },
    intent,
    undefined,
    96,
  );
  return cards.find((c) => c.recipeSlug === selected) ?? null;
}

const selectionSchema = (slugs: string[]) =>
  object({ selected: choice(...slugs, "unclear") });
