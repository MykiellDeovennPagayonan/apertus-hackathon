import { dispatchBatch, dispatchCommand } from "../../runtime/session";
import { learningPolicies } from "../resources/LearningPolicies";
import type { GroupingBoard } from "../traits/MathBoards";
import { NumberField } from "./NumberField";
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
      <div className="experiment-fields equal-groups-fields">
        <NumberField
          label="Counters"
          min={0}
          max={60}
          value={board.total}
          onChange={(n) => task(n, board.groups)}
        />
        <NumberField
          label="Baskets"
          min={1}
          max={6}
          value={board.groups}
          onChange={(n) => task(board.total, n)}
        />
      </div>
      <div className="learning-actions equal-groups-actions">
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
          className="experiment-primary-action"
        >
          {board.sequence.playing ? "Pause" : done ? "Share again" : "Share"}
        </button>
      </div>
      <button
        type="button"
        className="experiment-example-action"
        onClick={() =>
          dispatchBatch(board.demo, [
            { type: "SET_GROUPING_TASK", value: learningPolicies.leftovers },
            { type: "SET_LOOPING", value: false },
          ])
        }
      >
        Try an example with leftovers
      </button>
      <output>
        {done
          ? "Sharing complete"
          : board.sequence.playing
            ? "Sharing one counter at a time"
            : "Ready to share"}
      </output>
      <button
        type="button"
        className="experiment-reset"
        onClick={() => dispatchCommand(board.demo, { type: "RESET" })}
      >
        Reset
      </button>
    </div>
  );
}
