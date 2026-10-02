import { dispatchCommand } from "../../runtime/session";
import { tickOptions } from "../systems/FractionNumberLineSystem";
import type { FractionValue, NumberLineBoard } from "../traits/MathBoards";
import { ActionButton } from "./ActionButton";
import { FractionInputControl } from "./FractionInputControl";
import { IntegerStepper } from "./IntegerStepper";
import { MathPlayback } from "./MathPlayback";
import { OptionSelect } from "./OptionSelect";
export function FractionNumberLineControls({
  board,
}: {
  board: NumberLineBoard;
}) {
  const task = (a: FractionValue, b: FractionValue, mode = board.mode) =>
    dispatchCommand(board.demo, {
      type: "SET_NUMBER_LINE_TASK",
      value: { a, b, mode },
    });
  return (
    <>
      <OptionSelect
        label="Activity"
        value={board.mode}
        options={[
          { id: "place", label: "Place a fraction" },
          { id: "add", label: "Add fractions" },
          { id: "subtract", label: "Subtract fractions" },
        ]}
        onChange={(mode) =>
          task(board.a, board.b, mode as NumberLineBoard["mode"])
        }
      />
      <FractionInputControl
        label={board.mode === "place" ? "Target" : "First fraction"}
        value={board.a}
        onChange={(a) => task(a, board.b)}
      />
      {board.mode !== "place" && (
        <FractionInputControl
          label="Second fraction"
          value={board.b}
          onChange={(b) => task(board.a, b)}
        />
      )}
      <OptionSelect
        label="Divisions per whole"
        value={String(board.divisions)}
        options={tickOptions.map((d) => ({ id: String(d), label: String(d) }))}
        onChange={(v) =>
          dispatchCommand(board.demo, {
            type: "SET_TICK_DIVISIONS",
            value: Number(v),
          })
        }
      />
      {board.mode === "place" ? (
        <>
          <IntegerStepper
            label="Marker tick"
            min={0}
            max={3 * board.divisions}
            value={(board.placed.n * board.divisions) / board.placed.d}
            onChange={(tick) =>
              dispatchCommand(board.demo, {
                type: "PLACE_FRACTION",
                value: tick,
              })
            }
          />
          <ActionButton
            onCommand={() =>
              dispatchCommand(board.demo, { type: "CHECK_PLACEMENT" })
            }
          >
            Check placement
          </ActionButton>
          <ActionButton
            onCommand={() => dispatchCommand(board.demo, { type: "RESET" })}
          >
            Reset
          </ActionButton>
        </>
      ) : (
        <MathPlayback board={board} />
      )}
    </>
  );
}
