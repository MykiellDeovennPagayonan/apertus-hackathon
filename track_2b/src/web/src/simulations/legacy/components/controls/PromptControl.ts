import { isMathDemo } from "../../runtime/mathModel";
import { dispatchCommand } from "../../runtime/session";
import type { CommandResult, DemoType } from "../../runtime/types";
import { bridgeCommands } from "./BridgeCommands";
import { parseMathCommand } from "./MathCommands";
import { projectileCommands } from "./ProjectileCommands";
import { matchRules } from "./promptMatchers";
import { townCommands } from "./TownCommands";

const SAFE_MESSAGE =
  "This prototype supports a few predefined transformations. Try “compare with 30°”, “use Moon gravity”, “move the weight left”, or “make it nighttime”.";

export function parseFollowUp(demo: DemoType, prompt: string): CommandResult {
  if (isMathDemo(demo)) return parseMathCommand(demo, prompt);
  const rules =
    demo === "projectile"
      ? projectileCommands
      : demo === "bridge"
        ? bridgeCommands
        : townCommands;

  const rule = matchRules(prompt, rules);
  if (!rule) return { handled: false, confirmation: SAFE_MESSAGE };

  // Numeric commands (angle / compare) pull the first number out of the prompt.
  const action = { ...rule.action };
  if (action.type === "SET_ANGLE" || action.type === "COMPARE_ANGLE") {
    const n = prompt.match(/\d{1,3}/);
    if (n) action.value = Math.min(90, Math.max(0, Number(n[0])));
    else if (action.type === "SET_ANGLE")
      return { handled: false, confirmation: SAFE_MESSAGE };
  }

  const result = dispatchCommand(demo, action);
  if (!result.accepted) return { handled: false, confirmation: result.error };

  return { handled: true, action, confirmation: rule.confirmation };
}
export const PromptControl = parseFollowUp;
