import { mathComplete } from "../../runtime/mathModel";
import { dispatchBatch, dispatchCommand } from "../../runtime/session";
import type { MathBoard } from "../traits/MathBoards";
import { ActionButton } from "../../../registry/controls/ActionButton";
import { EqualGroupsControls } from "./EqualGroupsControls";
import { NumberField } from "../../../registry/controls/NumberField";
import { OptionSelect } from "./OptionSelect";

export function MathPrimaryControls({ board }: { board: MathBoard }) {
  const send = (type: string, value?: unknown) =>
    dispatchCommand(board.demo, { type, value });
  if (board.demo === "equal-groups")
    return <EqualGroupsControls board={board} />;
  if (board.demo === "fraction-builder")
    return (
      <>
        <div className="experiment-fields fraction-primary">
          {board.bars.map((bar, i) => (
            <div key={bar.id} className="fraction-primary__bar">
              <NumberField
                label={`Bar ${i === 0 ? "A" : "B"} pieces`}
                value={bar.value.d}
                min={1}
                max={12}
                onChange={(d) =>
                  send("SET_BAR_FRACTION", { bar: i, fraction: { n: 0, d } })
                }
              />
            </div>
          ))}
        </div>
        <p className="experiment-note">
          Choose the number of equal slices, then tap the bar to shade them.
        </p>
        <ActionButton
          className="experiment-reset"
          onCommand={() => send("RESET")}
        >
          Reset
        </ActionButton>
      </>
    );
  return (
    <div className="experiment-fields">
      {(board.demo === "counting" || board.demo === "arithmetic") && (
        <OptionSelect
          label="Mode"
          value={board.sequence.looping ? "watch" : "try"}
          options={[
            { id: "watch", label: "Watch" },
            { id: "try", label: "Try it yourself" },
          ]}
          onChange={(mode) =>
            dispatchBatch(board.demo, [
              { type: "SET_LOOPING", value: mode === "watch" },
              { type: "SET_PLAYING", value: mode === "watch" },
            ])
          }
        />
      )}
      {board.demo === "fraction-number-line" && (
        <OptionSelect
          label="Activity"
          value={board.mode}
          options={[
            { id: "place", label: "Place a fraction" },
            { id: "add", label: "Add fractions" },
            { id: "subtract", label: "Subtract fractions" },
          ]}
          onChange={(mode) =>
            send("SET_NUMBER_LINE_TASK", { a: board.a, b: board.b, mode })
          }
        />
      )}
      {board.demo === "fraction-number-line" && board.mode === "place" ? (
        <ActionButton onCommand={() => send("CHECK_PLACEMENT")}>
          Check placement
        </ActionButton>
      ) : board.demo === "fraction-number-line" ? (
        <ActionButton
          onCommand={() => send(mathComplete(board) ? "REPLAY" : "NEXT_STEP")}
        >
          {mathComplete(board) ? "Start again" : "Next step →"}
        </ActionButton>
      ) : board.sequence.looping ? (
        <ActionButton
          onCommand={() => send("SET_PLAYING", !board.sequence.playing)}
        >
          {board.sequence.playing ? "Pause" : "Resume"}
        </ActionButton>
      ) : null}
      {board.demo === "counting" && !board.sequence.looping && (
        <ActionButton onCommand={() => send("CHECK_COUNT")}>
          Check my count
        </ActionButton>
      )}
      <ActionButton
        className="experiment-reset"
        onCommand={() => send("RESET")}
      >
        Reset
      </ActionButton>
    </div>
  );
}
