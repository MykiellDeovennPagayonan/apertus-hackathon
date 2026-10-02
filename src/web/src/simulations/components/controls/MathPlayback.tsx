import { mathComplete, supportsMathLoop } from "../../runtime/mathModel";
import { dispatchCommand } from "../../runtime/session";
import type { MathBoard } from "../traits/MathBoards";
import { ActionButton } from "./ActionButton";
import { PlaybackControls } from "./PlaybackControls";
import { ToggleControl } from "./ToggleControl";
export function MathPlayback({ board }: { board: MathBoard }) {
  const send = (type: string, value?: unknown) =>
    dispatchCommand(board.demo, { type, value });
  return (
    <div className="math-actions">
      <ActionButton
        disabled={mathComplete(board)}
        onCommand={() => send("NEXT_STEP")}
      >
        Next step →
      </ActionButton>
      {supportsMathLoop(board.demo) && (
        <ToggleControl
          value={board.sequence.looping}
          onLabel="Stop repeating"
          offLabel="Repeat automatically"
          onChange={(value) => send("SET_LOOPING", value)}
        />
      )}
      {(!mathComplete(board) || board.sequence.looping) && (
        <PlaybackControls
          playing={board.sequence.playing}
          onPlaying={(v) => send("SET_PLAYING", v)}
        />
      )}
      <ActionButton onCommand={() => send("REPLAY")}>Replay</ActionButton>
      <ActionButton onCommand={() => send("RESET")}>Reset</ActionButton>
    </div>
  );
}
