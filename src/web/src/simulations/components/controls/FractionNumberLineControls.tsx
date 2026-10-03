import { dispatchCommand } from "../../runtime/session";
import { tickOptions } from "../systems/FractionNumberLineSystem";
import type { FractionValue, NumberLineBoard } from "../traits/MathBoards";
import { FractionInputControl } from "./FractionInputControl";
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
    </>
  );
}
