import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import { ActionButton } from "../../../registry/controls/ActionButton";
import { ToggleControl } from "./ToggleControl";
export function PlaybackControls({
  playing,
  speed,
  speeds,
  onPlaying,
  onSpeed,
  slowMo,
  onSlowMo,
}: {
  playing: boolean;
  speed?: number;
  speeds?: number[];
  onPlaying: (value: boolean) => ActionResult;
  onSpeed?: (speed: number) => ActionResult;
  slowMo?: boolean;
  onSlowMo?: (value: boolean) => ActionResult;
}) {
  return (
    <>
      <ToggleControl
        value={playing}
        onLabel="Pause"
        offLabel="Play"
        onChange={onPlaying}
      />
      {speeds?.map((v) => (
        <ActionButton
          key={v}
          className={speed === v ? "is-active" : ""}
          onCommand={() =>
            onSpeed
              ? onSpeed(v)
              : { accepted: false, error: "Unavailable speed command" }
          }
        >
          {v}×
        </ActionButton>
      ))}
      {onSlowMo && (
        <ToggleControl
          value={slowMo ?? false}
          onLabel="Normal speed"
          offLabel="Slow-mo"
          onChange={onSlowMo}
        />
      )}
    </>
  );
}
