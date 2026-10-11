import type { JsonSchema } from "../apertus/structuredSchema";
import type { Message } from "../apertus/transport";
import { PlannerError } from "../planner/errors";
import type { LlmConfig } from "./config";

/** Translate only the provider grammar. Application validators retain all constraints. */
function providerSchema(
  schema: JsonSchema,
  provider: LlmConfig["provider"],
): JsonSchema {
  const result = { ...schema };
  // A type-only wrapper around object alternatives has no properties of its own.
  // Each alternative supplies its closed object schema.
  if (schema.anyOf && schema.type === "object" && !schema.properties)
    delete result.type;
  if (!schema.type && Array.isArray(schema.enum)) {
    const types = [
      ...new Set(
        schema.enum.map((value) => (value === null ? "null" : typeof value)),
      ),
    ];
    result.type = types.length === 1 ? types[0] : types;
  }
  if (provider === "anthropic") {
    const constraints: Record<string, unknown> = {};
    for (const key of [
      "minimum",
      "maximum",
      "minLength",
      "maxLength",
      "minItems",
      "maxItems",
      "multipleOf",
    ]) {
      if (result[key] !== undefined) constraints[key] = result[key];
      delete result[key];
    }
    if (Object.keys(constraints).length)
      result.description = `${result.description ?? ""} Application constraints: ${JSON.stringify(constraints)}`;
  }
  if (schema.properties && typeof schema.properties === "object") {
    const required = (schema.required as string[] | undefined) ?? [];
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, field]) => {
        const translated = providerSchema(field as JsonSchema, provider);
        return [
          key,
          provider === "openai" && !required.includes(key)
            ? { anyOf: [translated, { type: "null" }] }
            : translated,
        ];
      }),
    );
    result.additionalProperties = false;
    if (provider === "openai") result.required = Object.keys(schema.properties);
  }
  if (schema.items)
    result.items = providerSchema(schema.items as JsonSchema, provider);
  if (Array.isArray(schema.anyOf))
    result.anyOf = schema.anyOf.map((item) => providerSchema(item, provider));
  return result;
}

// OpenAI represents omitted optional fields as null. Strip only these sentinels,
// preserving explicitly nullable fields and all unexpected keys for validation.
function restoreOptional(value: unknown, schema: JsonSchema): unknown {
  if (Array.isArray(schema.anyOf)) {
    const branch = schema.anyOf.find((candidate) =>
      matchesBranch(value, candidate),
    );
    if (branch) return restoreOptional(value, branch);
  }
  if (Array.isArray(value) && schema.items)
    return value.map((item) =>
      restoreOptional(item, schema.items as JsonSchema),
    );
  if (value && typeof value === "object" && schema.properties) {
    const properties = schema.properties as Record<string, JsonSchema>;
    const required = (schema.required as string[] | undefined) ?? [];
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key, field]) =>
            !(
              key in properties &&
              !required.includes(key) &&
              field === null &&
              !matchesBranch(null, properties[key])
            ),
        )
        .map(([key, field]) => [
          key,
          properties[key] ? restoreOptional(field, properties[key]) : field,
        ]),
    );
  }
  return value;
}

function matchesBranch(value: unknown, schema: JsonSchema): boolean {
  if (Array.isArray(schema.enum)) return schema.enum.includes(value);
  if (Array.isArray(schema.anyOf))
    return schema.anyOf.some((branch) => matchesBranch(value, branch));
  if (value === null)
    return (
      schema.type === "null" ||
      (Array.isArray(schema.type) && schema.type.includes("null"))
    );
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    const record = value as Record<string, unknown>;
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    return Object.entries(properties).every(
      ([key, field]) =>
        !(key in record) ||
        (record[key] === null &&
          !(schema.required as string[] | undefined)?.includes(key)) ||
        matchesBranch(record[key], field),
    );
  }
  if (schema.type === "array") return Array.isArray(value);
  if (schema.type === "integer") return Number.isInteger(value);
  return !schema.type || schema.type === typeof value;
}

export function createProviderRequest(
  config: LlmConfig,
  messages: Message[],
  tokens: number,
  schema?: JsonSchema,
) {
  const wrapped = !!schema && schema.type !== "object";
  const wireSchema =
    schema && config.provider !== "apertus"
      ? providerSchema(
          wrapped
            ? {
                type: "object",
                properties: { result: schema },
                required: ["result"],
                additionalProperties: false,
              }
            : schema,
          config.provider,
        )
      : schema;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let path: string;
  let body: Record<string, unknown>;
  if (config.provider === "openai") {
    headers.Authorization = `Bearer ${config.token}`;
    path = "/responses";
    body = {
      model: config.model,
      input: messages,
      max_output_tokens: tokens,
      store: false,
      stream: false,
      ...(config.reasoningEffort
        ? { reasoning: { effort: config.reasoningEffort } }
        : {}),
      ...(wireSchema
        ? {
            text: {
              format: {
                type: "json_schema",
                name: "authoring_stage",
                strict: true,
                schema: wireSchema,
              },
            },
          }
        : {}),
    };
  } else if (config.provider === "anthropic") {
    headers["x-api-key"] = config.token ?? "";
    headers["anthropic-version"] = "2023-06-01";
    path = "/messages";
    body = {
      model: config.model,
      max_tokens: tokens,
      stream: false,
      system: messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n"),
      messages: messages.filter((message) => message.role !== "system"),
      ...(wireSchema
        ? {
            output_config: {
              format: { type: "json_schema", schema: wireSchema },
            },
          }
        : {}),
    };
  } else {
    if (config.token) headers.Authorization = `Bearer ${config.token}`;
    path = "/chat/completions";
    body = {
      model: config.model,
      temperature: 0,
      max_tokens: tokens,
      stream: false,
      messages,
      ...(config.connection === "local" &&
      (config.localRuntime === "mlx" || config.localRuntime === "llamacpp")
        ? { chat_template_kwargs: { enable_thinking: false } }
        : {}),
      ...(config.localRuntime === "llamacpp"
        ? { reasoning_effort: "none" }
        : {}),
      ...(wireSchema
        ? {
            response_format:
              config.localRuntime === "llamacpp"
                ? {
                    type: "json_schema",
                    schema: wireSchema,
                  }
                : {
                    type: "json_schema",
                    json_schema: {
                      name: "authoring_stage",
                      strict: true,
                      schema: wireSchema,
                    },
                  },
          }
        : {}),
    };
  }
  return {
    url: `${config.baseUrl}${path}`,
    headers,
    body,
    restore(content: string) {
      if (!schema || config.provider === "apertus") return content;
      let value = JSON.parse(content);
      if (wrapped) {
        if (
          !value ||
          typeof value !== "object" ||
          Object.keys(value).length !== 1 ||
          !("result" in value)
        )
          throw new Error("Expected a single result envelope");
        value = value.result;
      }
      return JSON.stringify(
        config.provider === "openai" ? restoreOptional(value, schema) : value,
      );
    },
  };
}

const tokenCount = (value: unknown) =>
  Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
const sum = (...values: (number | null)[]) =>
  values.every((value) => value !== null)
    ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
    : null;

/** Normalize native provider envelopes; refusal and HTTP failures never trigger JSON repairs. */
export function readProviderResponse(config: LlmConfig, raw: unknown) {
  if (!raw || typeof raw !== "object")
    throw new Error("Expected a provider response object");
  const data = raw as ProviderEnvelope;
  let content: unknown;
  let finishReason: string | null;
  let usage: {
    promptTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  if (config.provider === "openai") {
    if (data.error || data.status === "failed")
      throw new PlannerError("OpenAI could not complete the request.", 502);
    const parts = Array.isArray(data.output)
      ? data.output.flatMap((item) =>
          item.type === "message" && Array.isArray(item.content)
            ? item.content
            : [],
        )
      : [];
    if (parts.some((part) => part.type === "refusal"))
      throw new PlannerError("OpenAI declined this request.", 422);
    content = parts
      .filter((part) => part.type === "output_text")
      .map((part) => part.text)
      .join("");
    finishReason =
      data.status === "incomplete"
        ? data.incomplete_details?.reason === "max_output_tokens"
          ? "length"
          : "incomplete"
        : (data.status ?? null);
    usage = {
      promptTokens: tokenCount(data.usage?.input_tokens),
      outputTokens: tokenCount(data.usage?.output_tokens),
      totalTokens: tokenCount(data.usage?.total_tokens),
    };
  } else if (config.provider === "anthropic") {
    if (data.stop_reason === "refusal")
      throw new PlannerError("Anthropic declined this request.", 422);
    content = Array.isArray(data.content)
      ? data.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("")
      : undefined;
    finishReason =
      data.stop_reason === "max_tokens" ? "length" : (data.stop_reason ?? null);
    const promptTokens = sum(
      tokenCount(data.usage?.input_tokens),
      tokenCount(data.usage?.cache_creation_input_tokens ?? 0),
      tokenCount(data.usage?.cache_read_input_tokens ?? 0),
    );
    const outputTokens = tokenCount(data.usage?.output_tokens);
    usage = {
      promptTokens,
      outputTokens,
      totalTokens: sum(promptTokens, outputTokens),
    };
  } else {
    const choice = data.choices?.[0];
    if (choice?.message?.refusal)
      throw new PlannerError("Apertus declined this request.", 422);
    content = choice?.message?.content;
    finishReason = choice?.finish_reason ?? null;
    usage = {
      promptTokens: tokenCount(data.usage?.prompt_tokens),
      outputTokens: tokenCount(data.usage?.completion_tokens),
      totalTokens: tokenCount(data.usage?.total_tokens),
    };
  }
  if (finishReason === "incomplete" || finishReason === "content_filter")
    throw new PlannerError(
      `${config.label} could not complete this request.`,
      422,
    );
  return {
    content,
    finishReason,
    usage,
    model: typeof data.model === "string" ? data.model : config.model,
  };
}

interface ProviderEnvelope {
  model?: string;
  error?: unknown;
  status?: string;
  incomplete_details?: { reason?: string };
  output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  content?: { type?: string; text?: string }[];
  stop_reason?: string;
  choices?: {
    finish_reason?: string;
    message?: { content?: unknown; refusal?: unknown };
  }[];
  usage?: Record<string, unknown>;
}

export function connectionError(config: LlmConfig) {
  if (config.connection === "local" && config.localRuntime === "llamacpp")
    return "Cannot reach local llama.cpp. Check the Apertus service and model readiness.";
  if (config.connection === "local")
    return config.localRuntime === "ollama"
      ? "Cannot reach local Ollama. Start it with ollama serve."
      : "Cannot reach local Apertus. Start it with make -C src/inference run.";
  return `Cannot reach ${config.provider === "apertus" ? "hosted Apertus" : config.label}. Check its endpoint and credentials.`;
}
