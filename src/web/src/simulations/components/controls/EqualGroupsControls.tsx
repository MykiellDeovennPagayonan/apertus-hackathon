import { dispatchCommand } from "../../runtime/session";
import type { GroupingBoard } from "../traits/MathBoards";
import { IntegerStepper } from "./IntegerStepper";
import { MathPlayback } from "./MathPlayback";
import { OptionSelect } from "./OptionSelect";
import { GrownUpControls } from "./YoungLearnerControls";
export function EqualGroupsControls({ board }: { board: GroupingBoard }) {
  const task = (
    groups = board.groups,
    perGroup = board.perGroup,
    total = board.total,
    mode = board.mode,
  ) =>
    dispatchCommand(board.demo, {
      type: "SET_GROUPING_TASK",
      value: { groups, perGroup, total, mode },
    });
  return (
    <GrownUpControls>
      <OptionSelect
        label="Activity"
        value={board.mode}
        options={[
          { id: "build", label: "Build equal groups" },
          { id: "share", label: "Share equally" },
        ]}
        onChange={(mode) =>
          task(
            board.groups,
            board.perGroup,
            board.total,
            mode as "build" | "share",
          )
        }
      />
      <IntegerStepper
        label="Baskets"
        min={1}
        max={6}
        value={board.groups}
        onChange={(n) => task(n)}
      />
      {board.mode === "build" ? (
        <IntegerStepper
          label="Circles per basket"
          min={0}
          max={10}
          value={board.perGroup}
          onChange={(n) => task(board.groups, n)}
        />
      ) : (
        <IntegerStepper
          label="Circles to share"
          min={0}
          max={60}
          value={board.total}
          onChange={(n) => task(board.groups, board.perGroup, n)}
        />
      )}
      <MathPlayback board={board} />
    </GrownUpControls>
  );
}
