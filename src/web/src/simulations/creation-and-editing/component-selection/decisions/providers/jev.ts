import type { DecisionConfig } from "../config";
import type { DecisionProvider } from "../contracts";
import { DecisionError } from "../errors";
import type { HttpTransport } from "../transport/http";
import { readAnswers, readModel, record } from "./validation";
export function createJevProvider(
  config: Extract<DecisionConfig, { provider: "jev" }>,
  transport: HttpTransport,
): DecisionProvider {
  return async (request, signal) => {
    const started = Date.now();
    const data = record(
      await transport(
        {
          url: `${config.baseUrl}/systemone`,
          headers: { Authorization: `Bearer ${config.token}` },
          body: { ...request, model: config.model },
        },
        signal,
      ),
    );
    const usage = record(data.usage);
    if (
      ![usage.input_tokens, usage.output_tokens].every(
        (n) => Number.isSafeInteger(n) && (n as number) >= 0,
      )
    )
      throw new DecisionError("invalid_response", "Invalid Jev usage");
    return {
      provider: "jev",
      model: readModel(data.model),
      answers: readAnswers(data.answers, request, true),
      durationMs: Date.now() - started,
      usage: {
        input_tokens: usage.input_tokens as number,
        output_tokens: usage.output_tokens as number,
      },
    };
  };
}
