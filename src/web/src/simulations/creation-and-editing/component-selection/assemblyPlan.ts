import {
  choice,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { TeachingIntent } from "../intent-interpreter/contracts";
import type { assemblyCandidates } from "./assemblyCandidates";
import type { CapabilityCard } from "./recipeCapabilities";
import { selectCapability } from "./selectAssemblies";

export type AssemblyPlan = {
  activities: string[];
  title: string;
  instruction: string;
  omitted: string[];
};
export async function selectAssemblyPlan(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
  {
    ranked,
    cards,
    requiredCapabilities,
  }: ReturnType<typeof assemblyCandidates>,
) {
  let recommendation: string | undefined;
  if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
    const capabilities: CapabilityCard[] = cards.map((card, index) => ({
      id: card.candidate,
      version: ranked[index].recipe.version,
      recipeSlug: card.candidate,
      summary: `${card.title}: ${card.description}`,
      supports: ranked[index].models.flatMap((node) => {
        const definition = publicDefinition(node);
        return definition.teaching?.concepts ?? [definition.title];
      }),
      limitations: card.limitations,
      interactionNames: card.interactions,
      observationNames: card.observations,
      names: [card.title],
    }));
    const selected = await selectCapability(
      request.prompt,
      intent,
      capabilities,
      budget,
      () => budget.decision,
    );
    if (selected.status === "selected")
      recommendation = selected.capability.recipeSlug;
    // Uncertainty is a retrieval hint, not evidence that a supported experiment is impossible.
  }
  const count = intent.instanceCount ?? (intent.suggestedStructure === "comparison" ? 2 : 1);
  const activities: string[] = [];
  let remaining = count;
  while (remaining > 0) {
    const candidates = cards.filter(card => card.instanceCount <= remaining);
    const schema = object({ candidate: choice(...candidates.map(card => card.candidate), "unavailable") });
    budget.trace?.("stage", { task: "select_capability" });
    const answer = await requestStructured<{candidate: string}>([
      { role: "system", content: 'Choose ONE offered activity that supports the original request. Return only {"candidate":"activity1"} using a supplied ID, or {"candidate":"unavailable"} if none supports it. The application assembles instances and validates bindings. Do not return settings, layouts, schemas or an experiment plan.' },
      { role: "user", content: JSON.stringify({
        request: request.prompt, remainingInstances: remaining, recommendation, requiredCapabilities,
        candidates: candidates.map(card => {
          const recipe = ranked[cards.findIndex(peer => peer.candidate === card.candidate)].recipe;
          return { id: card.candidate, label: card.title, meaning: card.description.slice(0, 180), instances: card.instanceCount,
            inputs: recipe.document.nodes.filter(node => publicDefinition(node).category === "controls").map(node => String(node.configuration.label ?? node.label)),
            outputs: card.observations.filter(name => !["configuration", "appearance"].includes(name)).slice(0, 8),
          };
        }),
      }) },
    ], content => { const {value} = parseArgumentJson(content); validateValue(schema, value); return value as {candidate: string}; },
    'Return only {"candidate":"one-supplied-id"}. No plan, schema or extra keys.', budget.signal, {
      budget, stage: "assembly_plan", schema: toJsonSchema(schema), maxTokens: 64,
      verify: answer => {
        if (answer.candidate === "unavailable") return;
        const card = candidates.find(card => card.candidate === answer.candidate)!;
        if (card.instanceCount !== remaining) return;
        const available = new Set([...activities, answer.candidate].flatMap(id => [...ranked[cards.findIndex(card => card.candidate === id)].capabilities]));
        const missing = requiredCapabilities.filter(capability => !available.has(capability));
        if (missing.length) throw new Error(`Selected activities lack requested capabilities: ${missing.join(", ")}. Choose a supported activity.`);
      },
      onEvent: (event, data) => budget.trace?.(`assembly_plan.${event}`, data),
    });
    if (answer.candidate === "unavailable")
      return { activities: [], title: intent.goal.slice(0, 100), instruction: intent.question ?? intent.goal, omitted: ["The offered activities cannot support this request."] };
    activities.push(answer.candidate);
    remaining -= candidates.find(card => card.candidate === answer.candidate)!.instanceCount;
  }
  const question = intent.question ?? intent.goal;
  const title = Array.from(question).length <= 100 ? question : Array.from(cards.find(card => card.candidate === activities[0])?.title ?? intent.goal).slice(0, 100).join("");
  const result: AssemblyPlan = { activities, title, instruction: question, omitted: [] };
  budget.trace?.("assembly_plan.selection", result);
  return result;
}
