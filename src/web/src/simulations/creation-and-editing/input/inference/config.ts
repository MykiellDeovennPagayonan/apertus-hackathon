import { readConfig as readApertusConfig } from "./apertusConfig";
import { offlineEnabled } from "../../../../lib/deployment";

export interface LlmConfig {
  provider: "apertus" | "openai" | "anthropic";
  connection: "local" | "huggingface" | "openai" | "anthropic";
  label: string;
  localRuntime?: "mlx" | "ollama" | "llamacpp";
  baseUrl: string;
  model: string;
  token?: string;
  structuredOutput: "auto" | "strict-json";
  contextTokens: number | null;
  timeout: number;
  maxTokens: number;
  concurrency: number;
  reasoningEffort?: string;
}

/** Server configuration only; never import this module into a client component. */
export function readLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const provider = env.LLM_PROVIDER?.trim() || "apertus";
  if (offlineEnabled(env) && provider !== "apertus")
    throw new Error("OFFLINE requires local Apertus inference.");
  if (
    provider !== "apertus" &&
    provider !== "openai" &&
    provider !== "anthropic"
  )
    throw new Error("LLM_PROVIDER must be apertus, openai, or anthropic.");
  const model = env.LLM_MODEL?.trim();
  if (env.LLM_MODEL !== undefined && !model)
    throw new Error("LLM_MODEL must not be blank when set.");
  let config: LlmConfig;
  if (provider === "apertus") {
    const legacy = readApertusConfig({
      ...env,
      ...(model
        ? env.APERTUS_PROVIDER === "huggingface"
          ? { APERTUS_HF_MODEL: model }
          : { APERTUS_LOCAL_MODEL: model }
        : {}),
    });
    config = {
      ...legacy,
      provider,
      connection: legacy.provider === "local" ? "local" : "huggingface",
      localRuntime: legacy.localRuntime as LlmConfig["localRuntime"],
      structuredOutput:
        legacy.structuredOutput === "auto" ? "auto" : "strict-json",
      label: "Apertus",
    };
  } else {
    const key = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    const token = env[key]?.trim();
    if (!token)
      throw new Error(
        `${provider === "openai" ? "OpenAI" : "Anthropic"} requires ${key}.`,
      );
    if (provider === "anthropic" && !model)
      throw new Error("Anthropic requires LLM_MODEL to select a Claude model.");
    config = {
      provider,
      connection: provider,
      label: provider === "openai" ? "OpenAI" : "Anthropic",
      baseUrl:
        provider === "openai"
          ? "https://api.openai.com/v1"
          : "https://api.anthropic.com/v1",
      model: model || "gpt-5.6-luna",
      token,
      structuredOutput: "auto",
      contextTokens: null,
      timeout: 120000,
      maxTokens: 4096,
      concurrency: 1,
    };
    if (provider === "openai") {
      const effort =
        env.OPENAI_REASONING_EFFORT?.trim() ||
        (config.model === "gpt-5.6-luna" ? "none" : undefined);
      if (
        effort &&
        !["none", "minimal", "low", "medium", "high", "xhigh", "max"].includes(
          effort,
        )
      )
        throw new Error("Invalid OPENAI_REASONING_EFFORT.");
      config.reasoningEffort = effort;
    }
  }
  const integer = (key: string, fallback: number, max: number) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isSafeInteger(value) || value < 1 || value > max)
      throw new Error(`${key} must be an integer between 1 and ${max}.`);
    return value;
  };
  const structuredOutput = env.LLM_STRUCTURED_OUTPUT ?? config.structuredOutput;
  if (structuredOutput !== "auto" && structuredOutput !== "strict-json")
    throw new Error("LLM_STRUCTURED_OUTPUT must be auto or strict-json.");
  return {
    ...config,
    structuredOutput,
    timeout: integer("LLM_TIMEOUT_MS", config.timeout, 600000),
    maxTokens: integer("LLM_MAX_TOKENS", config.maxTokens, 128000),
    concurrency: integer("LLM_MAX_CONCURRENT_REQUESTS", config.concurrency, 16),
    contextTokens:
      env.LLM_CONTEXT_TOKENS === undefined
        ? config.contextTokens
        : integer("LLM_CONTEXT_TOKENS", 8192, 2000000),
  };
}
