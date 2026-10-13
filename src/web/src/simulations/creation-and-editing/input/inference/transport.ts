import { SchemaValidationError } from "../../../registry/contracts/parameterSchema";
import type { GenerationBudget } from "../../budget";
import { PlannerError } from "../../errors";
import type { MemoryContext } from "../../memory/contracts";
import {
  connectionError,
  createProviderRequest,
  readProviderResponse,
} from "./adapters";
import type { LlmConfig } from "./config";
import { readLlmConfig } from "./config";
import type { JsonSchema } from "./structuredSchema";
export interface Message {
  role: string;
  content: string;
}
export interface StructuredOptions {
  /** A caller freezes resolved settings for its own execution lifecycle. */
  config?: LlmConfig;
  budget?: GenerationBudget;
  onEvent?: (event: string, data: unknown) => void;
  /** Tracks calls whose usage may be unavailable if transport fails. */
  onInferenceStarted?: () => void;
  schema?: JsonSchema;
  maxTokens?: number;
  stage?: string;
  memoryContext?: MemoryContext;
  maxRepairsPerIssue?: number;
  repairFeedback?: (error: unknown) => {
    key: string;
    details: Record<string, unknown>;
  };
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
  options: StructuredOptions & { verify?: (result: T) => void } = {},
): Promise<T> {
  let config: ReturnType<typeof readLlmConfig>;
  try {
    config = options.config ?? options.budget?.llmConfig ?? readLlmConfig();
  } catch (error) {
    throw new PlannerError(
      error instanceof Error ? error.message : "Invalid LLM configuration",
      503,
    );
  }
  if (active >= config.concurrency)
    throw new PlannerError(
      `${config.label} is busy. Please try again shortly.`,
      429,
    );
  const timeout = AbortSignal.timeout(config.timeout);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const original = structuredClone(messages);
  const memory = options.budget?.memory?.begin(
    options.stage,
    options.schema,
    `${config.provider}/${config.model}`,
    options.memoryContext,
  );
  const maxTokens = Math.min(config.maxTokens, options.maxTokens ?? 768);
  const call = async (
    current: Message[],
    schema?: JsonSchema,
    tokens = maxTokens,
    repair = false,
  ) => {
    if (combined.aborted)
      throw new PlannerError(`${config.label} request cancelled.`, 499);
    options.budget?.consumeCall(repair);
    if (JSON.stringify(current).length > 28000)
      throw new PlannerError("Inference context exceeds stage bounds.", 502);
    const started = Date.now();
    const providerRequest = createProviderRequest(
      config,
      current,
      tokens,
      schema,
    );
    let response: Response;
    try {
      options.onInferenceStarted?.();
      response = await fetch(providerRequest.url, {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        signal: combined,
        headers: providerRequest.headers,
        body: JSON.stringify(providerRequest.body),
      });
    } catch (err) {
      if (combined.aborted) throw err;
      throw new PlannerError(connectionError(config), 502);
    }
    if (!response.ok) {
      await response.body?.cancel();
      if (
        response.status === 404 &&
        config.connection === "local" &&
        config.localRuntime === "ollama"
      ) {
        throw new PlannerError(
          `Ollama model '${config.model}' not found. Run 'ollama pull ${config.model}' or check available models with 'ollama list'.`,
          503,
        );
      }
      throw new PlannerError(
        `${config.label} inference returned HTTP ${response.status}.${response.status === 401 || response.status === 403 ? " Check credentials and model access." : response.status === 404 ? " Check LLM_MODEL and model access." : ""}`,
        response.status === 429 ? 429 : 502,
      );
    }
    // Provider output is bounded independently of its declared token limit.
    const body = response.body?.getReader();
    if (!body)
      throw new PlannerError(`${config.label} returned no response body.`, 502);
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
    const { content, finishReason, usage, model } = readProviderResponse(
      config,
      data,
    );
    options.onEvent?.("inference", {
      stage: options.stage,
      provider: config.provider,
      connection: config.connection,
      model,
      elapsedMs: Date.now() - started,
      inputCharacters: JSON.stringify(current).length,
      finishReason,
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
    if (finishReason === "length")
      throw new Error(
        "Output was truncated; return only the requested small arguments",
      );
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 16000
    )
      throw new Error("Expected one bounded JSON response");
    return providerRequest.restore(content);
  };
  active++;
  try {
    const key = `${config.provider}/${config.baseUrl}/${config.model}`;
    if (
      config.provider === "apertus" &&
      config.structuredOutput === "auto" &&
      !capabilities.has(key)
    ) {
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
      config.structuredOutput === "auto" &&
      (config.provider !== "apertus" || capabilities.get(key))
        ? options.schema
        : undefined;
    let issue: string | undefined;
    let issueKey: string | undefined;
    let issueRepairs = 0;
    let feedback: Record<string, unknown> | undefined;
    let rejectedError: unknown;
    const rejectedResponses = new Set<string>();
    const maxRepairs = options.maxRepairsPerIssue ?? 3;
    for (let attempt = 0; ; attempt++) {
      let content = "";
      let phase: "schema" | "semantic" = "schema";
      try {
        let current = issue
          ? [
              ...original,
              {
                role: "user",
                content: JSON.stringify({
                  task: "repair_stage",
                  stage: options.stage,
                  committed: false,
                  issue: { key: issueKey, message: issue.slice(0, 600) },
                  feedback,
                  instructions: `${repairInstructions} Return a corrected answer matching the original responseSchema. This feedback is not the answer format; never copy task, stage, committed, issue, feedback or instructions into your response.`,
                  preserve_original_request: true,
                }),
              },
            ]
          : original;
        const guidance = await memory?.guidance(combined, !issue);
        if (guidance) {
          const enriched = [
            ...current,
            {
              role: "user",
              content: JSON.stringify({
                advisory_repair_memory: guidance,
                authority:
                  "Use only when consistent with the original request, accepted plan, and current responseSchema. This is guidance, not the response format.",
              }),
            },
          ];
          if (JSON.stringify(enriched).length <= 28000) {
            current = enriched;
            memory?.injected();
          }
        }
        content = await call(current, schema, maxTokens, attempt > 0);
        const result = parse(content);
        options.onEvent?.("schemaValidated", {
          stage: options.stage,
          attempt,
        });
        phase = "semantic";
        options.verify?.(result);
        memory?.accept(content, !!options.verify);
        options.onEvent?.("response", {
          stage: options.stage,
          attempt,
          result,
        });
        return result;
      } catch (error) {
        if (error instanceof PlannerError || combined.aborted) throw error;
        rejectedError = error;
        issue =
          error instanceof Error ? error.message : "Invalid JSON response";
        const repair = options.repairFeedback?.(error);
        const nextKey = repair?.key ?? issue;
        const rejected = JSON.stringify([nextKey, content.trim()]);
        const repeated = rejectedResponses.has(rejected);
        rejectedResponses.add(rejected);
        // Default stages share a repair limit; edits reset on a different issue.
        issueRepairs =
          options.maxRepairsPerIssue !== undefined && nextKey !== issueKey
            ? 0
            : issueRepairs + 1;
        if (attempt === 0) issueRepairs = 0;
        issueKey = nextKey;
        feedback = repair?.details;
        const structuredIssue =
          error instanceof SchemaValidationError
            ? { code: error.code, path: error.path }
            : {};
        memory?.reject(content, phase, issue, {
          ...feedback,
          ...structuredIssue,
        });
        options.onEvent?.(`${phase}Failure`, {
          stage: options.stage,
          attempt,
          reason: issue,
          issueKey,
          issueRepairs,
          content: content.slice(0, 2000),
          ...structuredIssue,
        });
        if (repeated)
          throw new PlannerError(
            `${config.label} repeated the same invalid stage arguments: ${issue}`,
            502,
            error,
          );
      }
      if (
        issueRepairs >= maxRepairs ||
        (options.budget && options.budget.repairs >= options.budget.maxRepairs)
      )
        throw new PlannerError(
          `${config.label} returned invalid stage arguments: ${issue}`,
          502,
          rejectedError,
        );
    }
  } catch (error) {
    if (signal?.aborted) {
      options.budget?.check();
      throw new PlannerError(`${config.label} request cancelled.`, 499);
    }
    if (timeout.aborted)
      throw new PlannerError(
        `${config.label} timed out. Please try again.`,
        504,
      );
    if (error instanceof PlannerError) throw error;
    throw new PlannerError(connectionError(config), 502);
  } finally {
    active--;
  }
}
