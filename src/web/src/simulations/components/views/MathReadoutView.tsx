import { fractionText, lcm, mixedText } from "../systems/fractionMath";
import type { MathBoard } from "../traits/MathBoards";
export function mathReadout(board: MathBoard): {
  equation: string;
  detail: string;
} {
  switch (board.demo) {
    case "counting": {
      const count = board.tokens.filter((t) =>
        board.mode === "count" ? t.ordinal !== null : t.zone === 1,
      ).length;
      return {
        equation: `${count}`,
        detail: `${count} ${count === 1 ? "circle" : "circles"} ${board.mode === "count" ? "counted" : "in the box"}${board.mode === "place" ? ` · put ${board.target} in the box` : ` out of ${board.target}`}`,
      };
    }
    case "arithmetic":
      return {
        equation: `${board.a} ${board.operation === "add" ? "+" : "−"} ${board.b} = ${board.sequence.cursor >= board.b ? board.result : "?"}`,
        detail: `${board.tokens.filter((t) => t.zone === 0).length} circles ${board.operation === "add" ? "together" : "left"}.`,
      };
    case "equal-groups": {
      const done = board.sequence.cursor >= board.total - board.remainder;
      return {
        equation:
          board.mode === "build"
            ? `${board.groups} × ${board.perGroup} = ${done ? board.total : "?"}`
            : `${board.total} ÷ ${board.groups} = ${done ? `${board.quotient}${board.remainder ? ` remainder ${board.remainder}` : ""}` : "?"}`,
        detail: done
          ? `${board.quotient} in every basket${board.remainder ? ` · ${board.remainder} left over` : ""}`
          : board.sequence.playing
            ? "Sharing in progress — each basket gets a turn."
            : "Press Share to give each basket an equal number.",
      };
    }
    case "fraction-builder":
      return {
        equation: `${fractionText(board.bars[0].value)} ${board.relation} ${fractionText(board.bars[1].value)}`,
        detail:
          board.relation === "="
            ? "The same shaded amount of equal-sized wholes."
            : "Compare the shaded amount in each equal-sized whole.",
      };
    case "fraction-number-line": {
      const d = lcm(board.a.d, board.b.d),
        done = board.sequence.cursor >= board.jumps.length - 1;
      return {
        equation:
          board.mode === "place"
            ? `Place ${fractionText(board.a)}`
            : `${fractionText(board.a)} ${board.mode === "add" ? "+" : "−"} ${fractionText(board.b)} = ${done ? fractionText(board.result) : "?"}`,
        detail:
          board.mode === "place"
            ? `Marker: ${fractionText(board.placed)} · ${mixedText(board.placed)}`
            : `Common denominator: ${(board.a.n * d) / board.a.d}/${d} ${board.mode === "add" ? "+" : "−"} ${(board.b.n * d) / board.b.d}/${d}${done ? ` · answer ${mixedText(board.result)}` : ""}`,
      };
    }
  }
}
export function MathReadoutView({
  board,
  label,
}: {
  board: MathBoard;
  label?: string;
}) {
  const output = mathReadout(board);
  return (
    <div
      className={`math-readout math-readout--${board.demo}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {(label || board.demo === "counting") && (
        <span className="math-count-label">{label || "Circles counted"}</span>
      )}
      <div className="math-equation">{output.equation}</div>
      <p>{output.detail}</p>
      {board.feedback && !["arithmetic", "counting"].includes(board.demo) && (
        <p className="math-feedback">{board.feedback}</p>
      )}
    </div>
  );
}
