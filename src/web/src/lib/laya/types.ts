export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
}
export interface DecisionRequest {
  state: unknown;
  questions: Record<string, ChoiceQuestion>;
}
export interface DecisionResponse {
  answers: Record<string, unknown>;
  model: string;
  timing?: { inference_ms?: number; server_ms?: number };
}
export type DecisionProvider = (
  request: DecisionRequest,
) => Promise<DecisionResponse>;
export interface DecisionTrace {
  question: string;
  accepted: boolean;
  answer: unknown;
  choice?: string;
  probability?: number;
  model: string;
  timing?: DecisionResponse["timing"];
}

export interface PlannerSelection {
  action: string;
  target: string;
}
