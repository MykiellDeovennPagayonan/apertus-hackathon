import { dispatchCommand } from "../../runtime/session";
import type { CountingBoard } from "../traits/MathBoards";
import { ActionButton } from "./ActionButton";
import { IntegerStepper } from "./IntegerStepper";
import { MathPlayback } from "./MathPlayback";
import { OptionSelect } from "./OptionSelect";
import { GrownUpControls } from "./YoungLearnerControls";
export function CountingControls({ board }: { board: CountingBoard }) {
  const task = (target: number, mode = board.mode) =>
    dispatchCommand(board.demo, {
      type: "SET_COUNTING_TASK",
      value: { target, mode },
    });
  return (
    <GrownUpControls>
      <OptionSelect
        label="Activity"
        value={board.mode}
        options={[
          { id: "count", label: "Count the circles" },
          { id: "place", label: "Fill the box" },
        ]}
        onChange={(mode) => task(board.target, mode as "count" | "place")}
      />
      <IntegerStepper
        label={board.mode === "count" ? "Number of circles" : "Target count"}
        min={0}
        max={20}
        value={board.target}
        onChange={(n) => task(n)}
      />
      <ActionButton
        onCommand={() => dispatchCommand(board.demo, { type: "CHECK_COUNT" })}
      >
        Check my count
      </ActionButton>
      <MathPlayback board={board} />
    </GrownUpControls>
  );
}
