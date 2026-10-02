import { MathAppearance } from "../resources/MathAppearance";
import type { MathBoard } from "../traits/MathBoards";
export function clearSequence(board: MathBoard) {
  board.sequence = {
    looping: board.sequence.looping,
    phase: "intro",
    cursor: 0,
    elapsed: 0,
    playing: false,
    run: board.sequence.run + 1,
  };
  board.feedback = "";
}
export function advanceClock(
  board: MathBoard,
  delta: number,
  next: () => void,
  interval: number = MathAppearance.stepSeconds,
) {
  if (!board.sequence.playing || !Number.isFinite(delta) || delta <= 0)
    return false;
  board.sequence.elapsed += Math.min(delta, 0.1);
  if (board.sequence.elapsed + 1e-9 >= interval) {
    board.sequence.elapsed = 0;
    next();
  }
  return true;
}
export function integer(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}
export function payload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("This action needs a task or object.");
  return value as Record<string, unknown>;
}

/** A repeating lesson uses the same domain steps as manual playback. The runtime
 * supplies time; this helper owns the intro/answer holds and bounded pacing. */
export function advanceLoop(
  board: MathBoard,
  delta: number,
  complete: () => boolean,
  next: () => void,
  replay: () => void,
) {
  if (!board.sequence.playing || !Number.isFinite(delta) || delta <= 0)
    return false;
  if (board.sequence.phase === "steps") {
    if (!complete())
      advanceClock(board, delta, next, MathAppearance.loopStepSeconds);
    if (complete()) {
      board.sequence.phase = "answer";
      board.sequence.elapsed = 0;
    }
    // Domain completion ends one pass, not the repeating lesson.
    board.sequence.playing = true;
  } else {
    board.sequence.elapsed += Math.min(delta, 0.1);
    const duration =
      board.sequence.phase === "intro"
        ? MathAppearance.loopIntroSeconds
        : MathAppearance.loopAnswerSeconds;
    if (board.sequence.elapsed + 1e-9 >= duration) {
      if (board.sequence.phase === "answer") {
        replay();
        board.sequence.looping = true;
        board.sequence.playing = true;
      } else board.sequence.phase = complete() ? "answer" : "steps";
      board.sequence.elapsed = 0;
    }
  }
  return true;
}
