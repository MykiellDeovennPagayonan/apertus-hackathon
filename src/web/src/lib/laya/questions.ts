import { operations } from "../../simulations/runtime/capabilities";
import type { DemoType } from "../../simulations/runtime/types";
import type { ExperimentContext } from "../planner/schema";
import type { ChoiceQuestion } from "./types";
export function intentQuestion(): ChoiceQuestion {
  return {
    type: "choice",
    instructions:
      "Classify the whole original request. Understand paraphrases and spelling mistakes. Select edit for one parameter change or control of the active experiment. A relative change to one object using another object's parameter as a reference is one edit. Number words, ordinal object references and relative factors are supported, not ambiguity. Negation or missing target/value is unclear; multiple changes and new creations are other.",
    criteria: {
      edit: "One parameter change or playback control of a uniquely identified existing object. Includes a relative factor referencing another object's known parameter; that reference is not a second edit.",
      other:
        "Create a NEW experiment, explain a concept without changing settings, or request multiple independent edits",
      unclear:
        "Negated request or missing target/value. A specified ordinal target and numeric or relative value are clear supported edit intent.",
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
