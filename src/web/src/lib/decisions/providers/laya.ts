import type { DecisionConfig } from "../config";
import type { DecisionProvider } from "../contracts";
import type { HttpTransport } from "../transport/http";
import { readAnswers, readModel, record } from "./validation";
export function createLayaProvider(
  config: Extract<DecisionConfig, { provider: "laya" }>,
  transport: HttpTransport,
): DecisionProvider {
  return async (request, signal) => {
    const started = Date.now();
    const data = record(
      await transport(
        { url: `${config.baseUrl}/api/decide`, body: request },
        signal,
      ),
    );
    const timing =
      data.timing && typeof data.timing === "object" ? record(data.timing) : {};
    const duration = (key: string) =>
      typeof timing[key] === "number" &&
      Number.isFinite(timing[key]) &&
      (timing[key] as number) >= 0
        ? (timing[key] as number)
        : undefined;
    return {
      provider: "laya",
      model: readModel(data.model),
      answers: readAnswers(record(data.result).answers, request, false),
      durationMs: Date.now() - started,
      timing: {
        inference_ms: duration("inference_ms"),
        server_ms: duration("server_ms"),
      },
    };
  };
}
