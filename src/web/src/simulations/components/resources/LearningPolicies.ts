import gasPressureRecipe from "../../pre-made/gas/gas-pressure.recipe.json";
import { requireValue } from "../../runtime/authoring/requireValue";

/** Versioned defaults shared by planning, runtime, controls and acceptance tests. */
export const learningPolicies = {
  version: 1,
  division: {
    task: { mode: "share", total: 12, groups: 3, perGroup: 0 },
    looping: false,
  },
  leftovers: { mode: "share", total: 14, groups: 3, perGroup: 0 },
  ball: { angle: 45, speed: 20, gravityPreset: "Earth" },
  gas: {
    ...requireValue(
      gasPressureRecipe.document.nodes.find((node) => node.id === "model")
        ?.configuration.inputs,
    ),
  },
  gasSteps: { temperature: 50, amount: 0.5 },
} as const;
export const educationalEditPolicy = `Registered educational policies v1: For gas, "Heat it up" increases current temperature by ${learningPolicies.gasSteps.temperature} K; "Add more gas" increases current amount by ${learningPolicies.gasSteps.amount} mmol. Keep every other independent input fixed. Confirm the resulting numeric value and unit. At the supported limit explain that no further step is available; never clamp. For projectile comparison "Compare 30 and 60 degrees", use SET_ANGLE 30 on the first projectile and COMPARE_ANGLE 60 on session, preserving speed and gravity. A subsequent edit of only the second ball targets its exact instance. For equal sharing, "What about leftovers?" requests task ${JSON.stringify(learningPolicies.leftovers)} with looping false. These are the only defaultable vague edits. Explain questions using actual outputs and the recent accepted change in context; return explain without commands.`;
