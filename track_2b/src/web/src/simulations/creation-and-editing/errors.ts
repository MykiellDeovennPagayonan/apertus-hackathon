export class PlannerError extends Error {
  constructor(
    message: string,
    public status: number,
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}
