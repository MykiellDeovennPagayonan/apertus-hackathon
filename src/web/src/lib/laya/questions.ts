import { operations } from "../../simulations/runtime/capabilities";
import type { DemoType } from "../../simulations/runtime/types";
import type { ExperimentContext } from "../planner/schema";
import type { ChoiceQuestion } from "./types";
export function intentQuestion(): ChoiceQuestion {
  return {
    type: "choice",
    instructions:
      "Classify the whole original request. Understand paraphrases and spelling mistakes. Select edit only for a single edit or control of the active experiment. Negation or ambiguity is unclear; multiple changes and new creations are other.",
    criteria: {
      edit: "One change or playback control of the existing experiment",
      other: "Creation, explanation, multiple changes, or a broader request",
      unclear: "Negated request or unclear intent",
    },
  };
}

export function exposedActions(
  demo: DemoType,
  context: ExperimentContext,
  target: string,
) {
  return Object.entries(operations[demo]).filter(([action, op]) =>
    target === "session"
      ? op.target === "session"
      : op.target === "instance" &&
        context.instances.some(
          (i) => i.id === target && i.actions.includes(action),
        ),
  );
}

export function targetQuestion(
  demo: DemoType,
  context: ExperimentContext,
): ChoiceQuestion {
  const criteria: Record<string, string> = {};
  if (exposedActions(demo, context, "session").length)
    criteria.session =
      "Whole simulation or global settings, playback, gravity, reset, or other session-wide operations";
  for (const [index, instance] of context.instances.entries()) {
    if (exposedActions(demo, context, instance.id).length)
      criteria[instance.id] =
        `Existing object ${index + 1}: ${instance.label}. Select only if this object is uniquely requested.`;
  }
  return {
    type: "choice",
    instructions:
      "Select the actual target for the accepted edit intent. First/primary refers to existing object 1, second to object 2. Choose unclear if no unique target, a nonexistent object, or incompatible multiple targets are requested. Session means a global operation.",
    criteria: { ...criteria, unclear: "No unique supported target" },
  };
}

export function actionQuestion(
  demo: DemoType,
  context: ExperimentContext,
  target: string,
): ChoiceQuestion {
  return {
    type: "choice",
    instructions:
      "Select the ONE requested operation from this target's exposed operations. Use the original request and accepted parent decisions. Select unclear for missing capabilities, negation, ambiguity, or multiple instructions.",
    criteria: {
      ...Object.fromEntries(
        exposedActions(demo, context, target).map(([action, op]) => [
          action,
          `${action.replaceAll("_", " ")}. ${op.description} Argument schema: ${JSON.stringify(op.arguments)}`,
        ]),
      ),
      unclear: "No single supported operation",
    },
  };
}
