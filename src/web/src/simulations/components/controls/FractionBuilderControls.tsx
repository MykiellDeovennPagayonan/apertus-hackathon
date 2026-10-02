import { dispatchCommand } from "../../runtime/session";
import type { FractionComparisonBoard } from "../traits/MathBoards";
import { ActionButton } from "./ActionButton";
import { FractionInputControl } from "./FractionInputControl";
export function FractionBuilderControls({
  board,
}: {
  board: FractionComparisonBoard;
}) {
  return (
    <>
      {board.bars.map((bar, i) => (
        <div key={bar.id}>
          <FractionInputControl
            label={`Bar ${i === 0 ? "A" : "B"}`}
            proper
            value={bar.value}
            onChange={(fraction) =>
              dispatchCommand(board.demo, {
                type: "SET_BAR_FRACTION",
                value: { bar: i, fraction },
              })
            }
          />
          <div className="math-actions">
            {[2, 3].map((factor) => (
              <ActionButton
                key={factor}
                disabled={bar.value.d * factor > 12}
                onCommand={() =>
                  dispatchCommand(board.demo, {
                    type: "SUBDIVIDE_FRACTION",
                    value: { bar: i, factor },
                  })
                }
              >
                Split each piece into {factor}
              </ActionButton>
            ))}
          </div>
        </div>
      ))}
      <p className="math-hint">
        Changing the denominator clears that bar. Splitting pieces preserves the
        shaded amount.
      </p>
      <ActionButton
        onCommand={() => dispatchCommand(board.demo, { type: "RESET" })}
      >
        Reset
      </ActionButton>
    </>
  );
}
