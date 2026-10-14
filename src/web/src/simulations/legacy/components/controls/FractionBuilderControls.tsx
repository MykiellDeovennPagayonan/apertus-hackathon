import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import type { UIAction } from "../../runtime/types";
import type { FractionComparisonBoard } from "../traits/MathBoards";
import { ActionButton } from "../../../registry/controls/ActionButton";
import { FractionInputControl } from "./FractionInputControl";
export function FractionBuilderControls({
  board,
  onCommand,
}: {
  board: FractionComparisonBoard;
  onCommand: (command: UIAction) => ActionResult;
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
              onCommand({
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
                  onCommand({
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
      <ActionButton onCommand={() => onCommand({ type: "RESET" })}>
        Reset
      </ActionButton>
    </>
  );
}
