import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import type { ArithmeticBoard, CountingBoard } from "../traits/MathBoards";
import { NumberField } from "../../../registry/controls/NumberField";

/** Task editing is one atomic model command; incomplete number entry stays local. */
export function TaskControl({
  board,
  onSubmit,
}: {
  board: ArithmeticBoard | CountingBoard;
  onSubmit: (args: Record<string, unknown>) => ActionResult;
}) {
  if (board.demo === "counting")
    return (
      <div className="task-control">
        <NumberField
          label="Number of circles"
          value={board.target}
          min={0}
          max={20}
          onChange={(target) =>
            onSubmit({ value: { mode: board.mode, target } })
          }
        />
        <p className="task-control-hint">
          Changing the number starts a new count.
        </p>
      </div>
    );
  const submit = (a: number, b: number, operation = board.operation) =>
    onSubmit({ value: { a, b, operation } });
  return (
    <div className="task-control">
      <fieldset className="task-operation" aria-label="Operation">
        {(["add", "subtract"] as const).map((operation) => (
          <button
            key={operation}
            type="button"
            aria-pressed={board.operation === operation}
            onClick={() =>
              submit(
                board.a,
                Math.min(
                  board.b,
                  operation === "subtract" ? board.a : 20 - board.a,
                ),
                operation,
              )
            }
          >
            {operation === "add" ? "+ Add" : "− Subtract"}
          </button>
        ))}
      </fieldset>
      <div className="task-numbers">
        <NumberField
          label="First number"
          value={board.a}
          min={board.operation === "subtract" ? board.b : 0}
          max={board.operation === "add" ? 20 - board.b : 20}
          onChange={(a) => submit(a, board.b)}
        />
        <NumberField
          label={board.operation === "add" ? "Add" : "Take away"}
          value={board.b}
          min={0}
          max={board.operation === "add" ? 20 - board.a : board.a}
          onChange={(b) => submit(board.a, b)}
        />
      </div>
      <p className="task-control-hint">
        Change a number to start a fresh calculation.
      </p>
    </div>
  );
}
