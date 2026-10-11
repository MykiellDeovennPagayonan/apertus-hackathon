import {
  AgentError,
  type EnvironmentAdapter,
} from "../../../runtime/agents/contracts";
import type { AgentExecutionPolicy } from "../../../runtime/agents/runner";
import {
  applyAgentProposal,
  observeAgent,
  validateObservationProposal,
} from "../AgentSystems";
import {
  debateOrder,
  debateRound,
  validateDebateConfiguration,
} from "./protocol";

export const debatePolicy: AgentExecutionPolicy = {
  selectActor: (run) => debateOrder(run.configuration)[run.events.length],
  completed: (run) => run.events.length === 18,
};
const instructions = {
  Opening:
    "State your assigned team's position and a distinct supporting argument. Earlier opening speeches are visible in sequential order.",
  Rebuttal:
    "Address an identifiable earlier opposing argument. Include at least one opposing speech ID in references. Explain the disagreement rather than merely naming it.",
  Closing:
    "Synthesize your team's case and acknowledge a meaningful tradeoff. Retain your assigned position.",
};
export const debateEnvironment: EnvironmentAdapter = {
  observe(run, actor) {
    validateDebateConfiguration(run.configuration);
    const observation = observeAgent(run, actor);
    const rules = run.configuration.scenario;
    if (!rules) throw new AgentError("Debate rules are missing.");
    const round = debateRound(run.events.length);
    return {
      ...observation,
      minWords: rules.minWords,
      outputTokens: rules.outputTokens,
      instruction: `Round: ${round}. Team: ${actor.team}. Scope: ${rules.scope}. ${instructions[round]} Use ${rules.minWords}–${run.configuration.maxWords} words. No live research is available; factual claims are unverified. Do not invent citations.`,
      ...(round === "Rebuttal"
        ? {
            requiredReferenceActors: run.configuration.agents
              .filter((agent) => agent.team !== actor.team)
              .map((agent) => agent.id),
          }
        : {}),
    };
  },
  apply(run, actor, proposal, eventId) {
    if (
      actor.id !== debatePolicy.selectActor(run) ||
      proposal.action !== "speak"
    )
      throw new AgentError("Only the scheduled speaker may submit a speech.");
    validateObservationProposal(
      debateEnvironment.observe(run, actor),
      proposal,
    );
    return applyAgentProposal(run, actor, proposal, eventId);
  },
};
