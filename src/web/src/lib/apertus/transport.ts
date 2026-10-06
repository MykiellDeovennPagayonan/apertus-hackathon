import type { GenerationBudget } from "../planner/budget";
import { PlannerError } from "../planner/errors";
import { readConfig } from "./config";
import type { JsonSchema } from "./structuredSchema";
export interface Message {
  role: string;
  content: string;
}
export interface StructuredOptions {
  budget?: GenerationBudget;
  onEvent?: (event: string, data: unknown) => void;
  schema?: JsonSchema;
  maxTokens?: number;
  stage?: string;
}
let active = 0;
const capabilities = new Map<string, boolean>();
export function clearStructuredCapabilities() {
  capabilities.clear();
}

/** One bounded response per call; repairs rebuild original context and carry only the exact issue. */
export async function requestStructured<T>(
  messages: Message[],
  parse: (content: string) => T,
  repairInstructions: string,
  signal?: AbortSignal,
  options: StructuredOptions = {},
): Promise<T> {
  let config: ReturnType<typeof readConfig>;
  try {
    config = readConfig();
  } catch (error) {
    throw new PlannerError(
      error instanceof Error ? error.message : "Invalid Apertus configuration",
      503,
    );
  }
  if (active >= config.concurrency)
    throw new PlannerError("Apertus is busy. Please try again shortly.", 429);
  active++;
  const timeout = AbortSignal.timeout(config.timeout);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const original = structuredClone(messages);
  const maxTokens = Math.min(config.maxTokens, options.maxTokens ?? 768);
  const call = async (
    current: Message[],
    schema?: JsonSchema,
    tokens = maxTokens,
    repair = false,
  ) => {
    if (combined.aborted)
      throw new PlannerError("Apertus request cancelled.", 499);
    options.budget?.consumeCall(repair);
    if (JSON.stringify(current).length > 28000)
      throw new PlannerError("Inference context exceeds stage bounds.", 502);
    const started = Date.now();
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      cache: "no-store",
      signal: combined,
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: tokens,
        stream: false,
        messages: current,
        ...(schema
          ? {
              response_format: {
                type: "json_schema",
                json_schema: { name: "authoring_stage", strict: true, schema },
              },
            }
          : {}),
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new PlannerError(
        `Apertus inference returned HTTP ${response.status}.`,
        502,
      );
    }
    // Provider output is bounded independently of its declared token limit.
    const body = response.body?.getReader();
    if (!body)
      throw new PlannerError("Apertus returned no response body.", 502);
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { done, value } = await body.read();
        if (done) break;
        size += value.byteLength;
        if (size > 128000) {
          await body.cancel();
          throw new PlannerError("Inference response exceeds bounds.", 502);
        }
        chunks.push(value);
      }
    } finally {
      body.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    const choice = data?.choices?.[0];
    const content = choice?.message?.content;
    const tokenCount = (value: unknown) =>
      Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
    const usage = {
      promptTokens: tokenCount(data.usage?.prompt_tokens),
      outputTokens: tokenCount(data.usage?.completion_tokens),
      totalTokens: tokenCount(data.usage?.total_tokens),
    };
    options.onEvent?.("inference", {
      stage: options.stage,
      model: data.model ?? config.model,
      elapsedMs: Date.now() - started,
      finishReason: choice?.finish_reason ?? null,
      maxTokens: tokens,
      contextCapacity: config.contextTokens,
      usage,
      constrained: !!schema,
    });
    if (
      config.contextTokens &&
      typeof usage.promptTokens === "number" &&
      usage.promptTokens + tokens > config.contextTokens
    )
      throw new PlannerError(
        "Inference input plus output reserve exceeds the configured context capacity.",
        502,
      );
    if (choice?.finish_reason === "length")
      throw new Error(
        "Output was truncated; return only the requested small arguments",
      );
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 16000
    )
      throw new Error("Expected one bounded JSON response");
    return content;
  };
  try {
    const key = `${config.baseUrl}/${config.model}`;
    if (config.structuredOutput === "auto" && !capabilities.has(key)) {
      const probeSchema = {
        type: "object",
        additionalProperties: false,
        properties: {
          marker: { enum: ["schema-enforced"] },
          value: {
            anyOf: [
              { type: "integer", minimum: 1, maximum: 1 },
              { enum: [null] },
            ],
          },
          optional: { type: "boolean" },
        },
        required: ["marker", "value"],
      };
      let supported = false;
      try {
        // Deliberately conflicts with schema; HTTP 200 or ordinary valid JSON is not sufficient proof.
        const probe = JSON.parse(
          await call(
            [
              {
                role: "user",
                content:
                  'Return exactly {"marker":"schema-ignored","value":99,"extra":true}.',
              },
            ],
            probeSchema,
            96,
          ),
        );
        supported =
          probe.marker === "schema-enforced" &&
          (probe.value === 1 || probe.value === null) &&
          Object.keys(probe).every((k) =>
            ["marker", "value", "optional"].includes(k),
          ) &&
          (probe.optional === undefined || typeof probe.optional === "boolean");
      } catch (error) {
        if (combined.aborted) throw error;
      }
      capabilities.set(key, supported);
      options.onEvent?.("constraintProbe", {
        supported,
        subset: "object,enum,optional,anyOf",
        model: config.model,
      });
    }
    const schema =
      capabilities.get(key) && options.schema ? options.schema : undefined;
    let issue: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const current = issue
          ? original.map((message) =>
              message.role === "system"
                ? {
                    ...message,
                    content: `${message.content}\nRepair the SAME stage. No operation was executed. Exact validation issue: ${issue?.slice(0, 600)}. ${repairInstructions}`,
                  }
                : message,
            )
          : original;
        const content = await call(current, schema, maxTokens, attempt > 0);
        try {
          const result = parse(content);
          options.onEvent?.("response", {
            stage: options.stage,
            attempt,
            result,
          });
          return result;
        } catch (error) {
          issue = error instanceof Error ? error.message : "Schema mismatch";
          options.onEvent?.("schemaFailure", {
            stage: options.stage,
            attempt,
            reason: issue,
            content: content.slice(0, 2000),
          });
        }
      } catch (error) {
        if (error instanceof PlannerError || combined.aborted) throw error;
        issue =
          error instanceof Error ? error.message : "Invalid JSON response";
        options.onEvent?.("schemaFailure", {
          stage: options.stage,
          attempt,
          reason: issue,
        });
      }
      if (attempt === 1 || (options.budget && options.budget.repairs >= 2))
        throw new PlannerError(
          `Apertus returned invalid stage arguments: ${issue}`,
          502,
        );
    }
    throw new PlannerError("No valid Apertus result.", 502);
  } catch (error) {
    if (signal?.aborted) {
      options.budget?.check();
      throw new PlannerError("Apertus request cancelled.", 499);
    }
    if (timeout.aborted)
      throw new PlannerError("Apertus timed out. Please try again.", 504);
    if (error instanceof PlannerError) throw error;
    throw new PlannerError(
      config.provider === "local"
        ? "Cannot reach local Apertus. Start it with make -C src/inference run."
        : "Cannot reach hosted Apertus. Check its endpoint and credentials.",
      502,
    );
  } finally {
    active--;
  }
}
