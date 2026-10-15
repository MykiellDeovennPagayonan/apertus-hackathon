import {
  debateEnvironment,
  debatePolicy,
} from "../../../legacy/components/systems/debate/environment";
import { validateDebateConfiguration } from "../../../legacy/components/systems/debate/protocol";
import {
  AgentError,
  type AgentRunConfiguration,
  type EnvironmentAdapter,
} from "./contracts";
import type { AgentExecutionPolicy } from "./runner";

interface AgentScenario {
  validate(configuration: AgentRunConfiguration): void;
  environment: EnvironmentAdapter;
  policy: AgentExecutionPolicy;
}
/** Server-admitted scenario extensions; the generic runner has no debate-specific branches. */
const scenarios: ReadonlyMap<string, AgentScenario> = new Map([
  [
    "debate",
    {
      validate: validateDebateConfiguration,
      environment: debateEnvironment,
      policy: debatePolicy,
    },
  ],
]);
export function resolveAgentScenario(
  configuration: AgentRunConfiguration,
): AgentScenario | undefined {
  if (!configuration.scenario) return undefined;
  const scenario = scenarios.get(configuration.scenario.kind);
  if (!scenario) throw new AgentError("Unsupported agent scenario.");
  scenario.validate(configuration);
  return scenario;
}
