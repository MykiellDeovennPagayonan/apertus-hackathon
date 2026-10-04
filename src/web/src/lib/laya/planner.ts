import { operations } from "../../simulations/runtime/capabilities";
import type { DemoType } from "../../simulations/runtime/types";
import type { ExperimentContext } from "../planner/schema";
import { acceptChoice } from "./decisions";
import {
  actionQuestion,
  exposedActions,
  intentQuestion,
  targetQuestion,
} from "./questions";
import type {
  ChoiceQuestion,
  DecisionProvider,
  DecisionTrace,
  PlannerSelection,
} from "./types";

export async function selectWithLaya(
  prompt: string,
  demo: DemoType | null,
  context: ExperimentContext | null,
  provider: DecisionProvider,
  gate: number,
  onTrace?: (trace: DecisionTrace) => void,
): Promise<PlannerSelection | null> {
  if (!demo || !context) return null;
  const previous: Record<string, string> = {};
  const ask = async (id: string, question: ChoiceQuestion) => {
    if (Object.keys(question.criteria).length < 2) return undefined;
    const response = await provider({
      state: {
        scene: {
          demo,
          instances: context.instances.map((i, index) => ({
            id: i.id,
            label: i.label,
            ordinal: index + 1,
            parameters: i.parameters,
            actions: i.actions,
          })),
        },
        previous_decisions: { ...previous },
        request: prompt,
      },
      questions: { [id]: question },
    });
    const decision = acceptChoice(response.answers[id], question, gate);
    onTrace?.({
      question: id,
      accepted: decision !== null,
      answer: response.answers[id],
      ...(decision ?? {}),
      model: response.model,
      timing: response.timing,
    });
    if (decision) previous[id] = decision.choice;
    return decision?.choice;
  };
  if ((await ask("intent", intentQuestion())) !== "edit") return null;
  const target = await ask("target", targetQuestion(demo, context));
  if (!target || !exposedActions(demo, context, target).length) return null;
  const action = await ask("action", actionQuestion(demo, context, target));
  if (!action || action === "unclear") return null;
  const op = operations[demo][action];
  if (!op) return null;
  return { action, target };
}
