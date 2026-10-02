import { dispatchCommand } from "../../runtime/session";
import type { ArithmeticBoard } from "../traits/MathBoards";
import { IntegerStepper } from "./IntegerStepper";
import { MathPlayback } from "./MathPlayback";
import { OptionSelect } from "./OptionSelect";
import { GrownUpControls } from "./YoungLearnerControls";
export function ArithmeticControls({ board }: { board: ArithmeticBoard }) {
  const task = (a: number, b: number, operation = board.operation) =>
    dispatchCommand(board.demo, {
      type: "SET_ARITHMETIC_TASK",
      value: { a, b, operation },
    });
  return (
    <GrownUpControls>
      <OptionSelect
        label="Operation"
        value={board.operation}
        options={[
          { id: "add", label: "Addition (+)" },
          { id: "subtract", label: "Subtraction (−)" },
        ]}
        onChange={(op) =>
          task(
            board.a,
            op === "subtract"
              ? Math.min(board.a, board.b)
              : Math.min(board.b, 20 - board.a),
            op as "add" | "subtract",
          )
        }
      />
      <IntegerStepper
        label="First number"
        min={board.operation === "subtract" ? board.b : 0}
        max={board.operation === "add" ? 20 - board.b : 20}
        value={board.a}
        onChange={(n) => task(n, board.b)}
      />
      <IntegerStepper
        label={
          board.operation === "add" ? "Add this many" : "Take away this many"
        }
        min={0}
        max={board.operation === "add" ? 20 - board.a : board.a}
        value={board.b}
        onChange={(n) => task(board.a, n)}
      />
      <MathPlayback board={board} />
    </GrownUpControls>
  );
}
