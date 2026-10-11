export type DecisionProviderId = "laya" | "jev";
export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
}
export interface DecisionRequest {
  state: unknown;
  questions: Record<string, ChoiceQuestion>;
}
export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence?: number;
}
export interface DecisionResponse {
  answers: Record<string, ChoiceAnswer>;
  model: string;
  provider: DecisionProviderId;
  durationMs: number;
  usage?: { input_tokens: number; output_tokens: number };
  timing?: { inference_ms?: number; server_ms?: number };
}
export type DecisionProvider = (
  request: DecisionRequest,
  signal: AbortSignal,
) => Promise<DecisionResponse>;
