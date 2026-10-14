import { createHash } from "node:crypto";
import {
  agentContext,
  parseAgentProposal,
  validateObservationProposal,
} from "../../simulations/legacy/components/systems/AgentSystems";
import {
  AgentError,
  type AgentModel,
  AgentModelError,
  type ModelIdentity,
} from "../../simulations/creation-and-editing/runtime-engine/agents/contracts";
import type { JsonSchema } from "../../simulations/creation-and-editing/input/inference/structuredSchema";
import { requestStructured } from "../../simulations/creation-and-editing/input/inference/transport";
import { readLlmConfig } from "../../simulations/creation-and-editing/input/inference/config";

export function configuredModelIdentity(): ModelIdentity {
  const config = readLlmConfig();
  const { token: _token, ...settings } = config;
  return {
    settingsFingerprint: createHash("sha256")
      .update(JSON.stringify(settings))
      .digest("hex"),
    provider: config.provider,
    model: config.model,
    connection: config.connection,
  };
}
export function createAgentModel(identity: ModelIdentity): AgentModel {
  const config = readLlmConfig();
  if (
    config.provider !== identity.provider ||
    config.model !== identity.model ||
    config.connection !== identity.connection ||
    (identity.settingsFingerprint !== undefined &&
      identity.settingsFingerprint !==
        configuredModelIdentity().settingsFingerprint)
  )
    throw new AgentError("The configured model changed. Start a new run.", 409);
  return {
    async generate(observation, signal) {
      const started = Date.now();
      let inputTokens: number | null = null,
        outputTokens: number | null = null;
      let inputComplete = true,
        outputComplete = true;
      let actualModel = identity;
      let startedCalls = 0,
        reportedCalls = 0;
      const metadata = () => ({
        model: actualModel,
        elapsedMs: Date.now() - started,
        inputTokens,
        outputTokens,
        inputTokensComplete: inputComplete && startedCalls === reportedCalls,
        outputTokensComplete: outputComplete && startedCalls === reportedCalls,
      });
      const common = {
        references: {
          type: "array",
          items: { type: "string", maxLength: 160 },
          maxItems: 8,
        },
        memory: { type: "string", maxLength: 800 },
        plan: {
          type: "array",
          items: { type: "string", maxLength: 200 },
          maxItems: 4,
        },
      };
      const choices = observation.allowed.map((action) => ({
        type: "object",
        additionalProperties: false,
        properties: {
          ...common,
          action: { enum: [action] },
          ...(action === "speak"
            ? { text: { type: "string", minLength: 1, maxLength: 4000 } }
            : {
                key: { type: "string", maxLength: 40 },
                value: { type: "number", minimum: -1000000, maximum: 1000000 },
              }),
        },
        required: [
          "action",
          "references",
          "memory",
          "plan",
          ...(action === "speak" ? ["text"] : ["key", "value"]),
        ],
      }));
      const schema = (
        choices.length === 1 ? choices[0] : { anyOf: choices }
      ) as JsonSchema;
      try {
        const proposal = await requestStructured(
          agentContext(observation),
          (content) => parseAgentProposal(JSON.parse(content)),
          "Return only the same supported action, with valid visible references and bounded text.",
          signal,
          {
            config: { ...config, timeout: Math.min(config.timeout, 110000) },
            schema,
            maxTokens: observation.outputTokens ?? 1024,
            stage: "agent.decision",
            onInferenceStarted() {
              startedCalls++;
            },
            verify(result) {
              validateObservationProposal(observation, result);
              if (
                result.action === "setMetric" &&
                !Object.hasOwn(observation.metrics, result.key)
              )
                throw new Error("Use an existing metric key.");
            },
            onEvent(event, raw) {
              if (event !== "inference" || !raw || typeof raw !== "object")
                return;
              reportedCalls++;
              const data = raw as {
                usage?: { promptTokens?: number; outputTokens?: number };
                model?: string;
              };
              if (typeof data.usage?.promptTokens === "number")
                inputTokens = (inputTokens ?? 0) + data.usage.promptTokens;
              else inputComplete = false;
              if (typeof data.usage?.outputTokens === "number")
                outputTokens = (outputTokens ?? 0) + data.usage.outputTokens;
              else outputComplete = false;
              if (data.model) actualModel = { ...identity, model: data.model };
            },
          },
        );
        return {
          proposal,
          metadata: metadata(),
        };
      } catch (error) {
        throw new AgentModelError(
          error instanceof Error ? error.message : "Model unavailable.",
          error && typeof error === "object" && "status" in error
            ? Number(error.status)
            : 502,
          metadata(),
        );
      }
    },
  };
}
