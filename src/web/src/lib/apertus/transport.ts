import { PlannerError } from "../planner/errors";
import { readConfig } from "./config";

export interface Message {
  role: string;
  content: string;
}
let active = 0;

/** Both focused interpretation and broad planning share capacity and repair limits. */
export async function requestStructured<T>(
  messages: Message[],
  parse: (content: string) => T,
  repairInstructions: string,
  signal?: AbortSignal,
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
  if (signal?.aborted)
    throw new PlannerError("Apertus request cancelled.", 499);
  if (active >= config.concurrency)
    throw new PlannerError("Apertus is busy. Please try again shortly.", 429);
  active++;
  const timeout = AbortSignal.timeout(config.timeout);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
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
          max_tokens: config.maxTokens,
          stream: false,
          messages,
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new PlannerError(
          `Apertus inference returned HTTP ${response.status}. Check the configured provider.`,
          502,
        );
      }
      const data = await response.json(),
        choice = data?.choices?.[0];
      if (choice?.finish_reason === "length")
        throw new PlannerError(
          "Apertus reached its output limit. Increase APERTUS_MAX_TOKENS and retry.",
          502,
        );
      const content = choice?.message?.content;
      if (typeof content !== "string" || !content.trim())
        throw new PlannerError(
          "Apertus returned no final answer. Increase APERTUS_MAX_TOKENS and retry.",
          502,
        );
      try {
        return parse(content);
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "schema mismatch";
        if (attempt === 1)
          throw new PlannerError(
            `Apertus returned an invalid result after one repair: ${reason}`,
            502,
          );
        messages.push(
          { role: "assistant", content: content.slice(0, 16000) },
          {
            role: "user",
            content: `Repair the JSON once. Validation error: ${reason}. No change was executed. ${repairInstructions}`,
          },
        );
      }
    }
    throw new PlannerError("No valid Apertus result", 502);
  } catch (error) {
    if (signal?.aborted)
      throw new PlannerError("Apertus request cancelled.", 499);
    if (timeout.aborted)
      throw new PlannerError("Apertus timed out. Please try again.", 504);
    if (error instanceof PlannerError) throw error;
    throw new PlannerError(
      config.provider === "local"
        ? "Cannot reach local Apertus. Start it with make -C src/inference run from the project root."
        : "Cannot reach hosted Apertus. Check its endpoint and credentials.",
      502,
    );
  } finally {
    active--;
  }
}
