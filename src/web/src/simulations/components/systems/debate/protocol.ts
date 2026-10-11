import {
  AgentError,
  type AgentRunConfiguration,
} from "../../../runtime/agents/contracts";
import { num, object } from "../../../runtime/parameterSchema";

export const debateSessionSchema = object({
  topic: { type: "string", minLength: 10, maxLength: 1200 },
  scope: { type: "string", minLength: 1, maxLength: 800 },
  maxWords: num(80, 150, "words", true),
  minWords: num(20, 150, "words", true),
  outputTokens: num(512, 2048, "tokens", true),
});
export const debateDefaults = {
  topic:
    "Should schools replace most homework with projects completed during school hours?",
  scope:
    "Secondary schools; replace most routine take-home assignments, while preserving optional reading and necessary individual practice.",
  minWords: 80,
  maxWords: 150,
  outputTokens: 1024,
};
export const debateRounds = ["Opening", "Rebuttal", "Closing"] as const;
export function debateRound(count: number) {
  return debateRounds[Math.min(Math.floor(count / 6), 2)];
}

/** Team and seat derive from frozen, independently authored profiles; the model never selects a turn. */
export function debateOrder(configuration: AgentRunConfiguration): string[] {
  const proposition = configuration.agents.filter(
    (agent) => agent.team === "Proposition",
  );
  const opposition = configuration.agents.filter(
    (agent) => agent.team === "Opposition",
  );
  const opening = proposition.flatMap((agent, i) => [
    agent.id,
    opposition[i].id,
  ]);
  const rebuttal = opposition.flatMap((agent, i) => [
    agent.id,
    proposition[i].id,
  ]);
  return [...opening, ...rebuttal, ...opening];
}
export function validateDebateConfiguration(config: AgentRunConfiguration) {
  const rules = config.scenario;
  if (
    !rules ||
    rules.kind !== "debate" ||
    rules.version !== 1 ||
    rules.visibility !== "sequential-public" ||
    Object.keys(rules).some(
      (key) =>
        ![
          "kind",
          "version",
          "scope",
          "minWords",
          "outputTokens",
          "visibility",
        ].includes(key),
    )
  )
    throw new AgentError(
      "Unsupported debate rule version or visibility policy.",
    );
  if (
    config.agents.length !== 6 ||
    config.agents.filter((agent) => agent?.team === "Proposition").length !==
      3 ||
    config.agents.filter((agent) => agent?.team === "Opposition").length !== 3
  )
    throw new AgentError(
      "A debate needs three Proposition and three Opposition agents.",
    );
  if (
    config.maxSteps !== 18 ||
    config.capabilities?.length !== 1 ||
    config.capabilities[0] !== "speak"
  )
    throw new AgentError(
      "Debates require eighteen speeches and only the speech action.",
    );
  if (
    typeof rules.scope !== "string" ||
    !rules.scope.trim() ||
    rules.scope.length > 800 ||
    !Number.isInteger(rules.minWords) ||
    rules.minWords < 20 ||
    rules.minWords > config.maxWords ||
    config.maxWords < 80 ||
    config.maxWords > 150 ||
    !Number.isInteger(rules.outputTokens) ||
    rules.outputTokens < 512 ||
    rules.outputTokens > 2048
  )
    throw new AgentError(
      "Choose a scope, a valid speech range (maximum 80–150 words), and 512–2048 output tokens.",
    );
}
