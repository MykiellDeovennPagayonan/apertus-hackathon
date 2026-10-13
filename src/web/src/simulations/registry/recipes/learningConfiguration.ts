export function learningConfiguration(
  board: import("../../legacy/components/traits/MathBoards").MathBoard,
): Record<string, unknown> {
  if (board.demo === "fraction-builder")
    return { bars: board.bars.map((b) => b.value) };
  if (board.demo === "counting")
    return {
      task: { mode: board.mode, target: board.target },
      looping: board.sequence.looping,
    };
  if (board.demo === "arithmetic")
    return {
      task: { operation: board.operation, a: board.a, b: board.b },
      looping: board.sequence.looping,
    };
  if (board.demo === "equal-groups")
    return {
      task: {
        mode: board.mode,
        groups: board.groups,
        perGroup: board.perGroup,
        total: board.total,
      },
      looping: board.sequence.looping,
    };
  return { task: { mode: board.mode, a: board.a, b: board.b } };
}
