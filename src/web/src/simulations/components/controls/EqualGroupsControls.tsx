import { dispatchBatch, dispatchCommand } from "../../runtime/session";
import { learningPolicies } from "../resources/LearningPolicies";
import type { GroupingBoard } from "../traits/MathBoards";
import { IntegerStepper } from "./IntegerStepper";
import "../views/learning.css";
export function EqualGroupsControls({ board }: { board: GroupingBoard }) {
  const task = (total: number, groups: number) =>
    dispatchCommand(board.demo, {
      type: "SET_GROUPING_TASK",
      value: { mode: "share", total, groups, perGroup: 0 },
    });
  const done = board.sequence.cursor >= board.total - board.remainder;
  return (
    <div>
      <IntegerStepper
        label="Counters"
        min={0}
        max={60}
        value={board.total}
        onChange={(n) => task(n, board.groups)}
      />
      <IntegerStepper
        label="Baskets"
        min={1}
        max={6}
        value={board.groups}
        onChange={(n) => task(board.total, n)}
      />
      <div className="learning-actions">
        <button
          type="button"
          onClick={() => dispatchCommand(board.demo, { type: "RESET" })}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() =>
            dispatchBatch(board.demo, [
              { type: "SET_GROUPING_TASK", value: learningPolicies.leftovers },
              { type: "SET_LOOPING", value: false },
            ])
          }
        >
          Try one with leftovers
        </button>
      </div>
      <output>
        {done
          ? "Sharing complete"
          : board.sequence.playing
            ? "Sharing one counter at a time"
            : "Ready to share"}
      </output>
    </div>
  );
}

export function SharingAction({ board }: { board: GroupingBoard }) {
  const done = board.sequence.cursor >= board.total - board.remainder;
  return (
    <div className="learning-actions">
      {" "}
      <button
        type="button"
        onClick={() =>
          done
            ? dispatchBatch(board.demo, [
                { type: "REPLAY" },
                { type: "SET_PLAYING", value: true },
              ])
            : dispatchCommand(board.demo, {
                type: "SET_PLAYING",
                value: !board.sequence.playing,
              })
        }
      >
        {board.sequence.playing ? "Pause sharing" : done ? "Replay" : "Share"}
      </button>
    </div>
  );
}
