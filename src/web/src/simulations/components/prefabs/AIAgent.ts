import { validateValue } from "../../runtime/parameterSchema";
import {
  type AgentConfiguration,
  agentDefaults,
  agentProfileSchema,
} from "../traits/AIAgent";

/** Expand immutable configuration into an independently owned agent instance. */
export function AIAgent(
  id: string,
  parameters: Record<string, unknown> = {},
): AgentConfiguration {
  const profile = structuredClone({ ...agentDefaults, ...parameters });
  validateValue(agentProfileSchema, profile, "AI agent");
  return { ...profile, id } as AgentConfiguration;
}
