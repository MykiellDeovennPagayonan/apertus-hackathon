export type DecisionErrorKind =
  | "configuration"
  | "http"
  | "transport"
  | "timeout"
  | "invalid_response"
  | "size_limit";
export class DecisionError extends Error {
  constructor(
    public readonly kind: DecisionErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DecisionError";
  }
}
