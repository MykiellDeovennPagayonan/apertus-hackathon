import { learningPolicies } from "../../simulations/components/resources/LearningPolicies";
import type { DemoType } from "../../simulations/runtime/types";
import type { ExperimentContext } from "../planner/schema";
/** In-context examples, not a request router. Models must still interpret the original request. */
export function educationalExamples(
  demo: DemoType,
  context: ExperimentContext,
) {
  const edit = (commands: unknown[], message: string) => ({
    schemaVersion: 1,
    operation: "edit",
    commands,
    message,
  });
  const command = (action: string, value: unknown, target = "session") => ({
    target,
    action,
    arguments: { value },
  });
  if (demo === "equal-groups")
    return `Example request: "What about leftovers?"\nAnswer: ${JSON.stringify(edit([command("SET_GROUPING_TASK", learningPolicies.leftovers), command("SET_LOOPING", false)], "Share 14 counters among 3 baskets, leaving 2 counters over."))}\nThis request changes the grouping task; it does not mean pause. If a focused proposal is SET_PLAYING or any action other than SET_GROUPING_TASK, return conflict.`;
  if (demo === "projectile")
    return `Example request: "Compare 30 and 60 degrees."\nAnswer: ${JSON.stringify(edit([command("SET_ANGLE", 30, context.instances[0].id), command("COMPARE_ANGLE", 60)], "Compare 30° and 60° at the current speed and gravity."))}\nComparing two specified angles is a compound edit and requires conflict in the single-action focused contract. A uniquely specified second ball can be edited with SET_ANGLE on its exact ID.`;
  if (demo !== "gas") return "";
  const inputs = context.instances[0].parameters;
  const before = context.recentChange?.before,
    after = context.recentChange?.after;
  const description =
    before && after
      ? `The recent edit changed amount from ${before.amount} to ${after.amount} mmol, temperature from ${before.temperature} to ${after.temperature} K, volume from ${before.volume} to ${after.volume} L, and pressure from ${before.pressureKPa} to ${after.pressureKPa} kPa. Identify the changed input; describe equal before/after inputs as held fixed. P=nRT/V.`
      : "There is no recorded input change since reset. Explain the current ideal-gas state without inventing an earlier edit.";
  return `Example request: "Heat it up."\nAnswer: ${JSON.stringify(edit([command("SET_TEMPERATURE", Number(inputs.temperature) + learningPolicies.gasSteps.temperature)], `Set temperature to ${Number(inputs.temperature) + learningPolicies.gasSteps.temperature} K, holding volume and amount fixed.`))}\nExample request: "Add more gas."\nAnswer: ${JSON.stringify(edit([command("SET_AMOUNT", Number(inputs.amount) + learningPolicies.gasSteps.amount)], `Set amount to ${Number(inputs.amount) + learningPolicies.gasSteps.amount} mmol, holding temperature and volume fixed.`))}\nCheck bounds before using these relative examples; out-of-range changes are unsupported, never clamped. For "Why did the pressure increase?", return operation:explain, schemaVersion:1 and a message only, NO edit or commands. ${description} A focused single-action interpreter must return conflict for an explanation request. Do not confuse heating, adding gas or explaining with playback controls.`;
}
