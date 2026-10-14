import type { ActionResult } from "../../creation-and-editing/runtime-engine/commands";
import { ActionButton } from "./ActionButton";

/** Playback is an immediate command, regardless of the authored widget type. */
export function PlaybackControl({
  playing,
  animated,
  label,
  onChange,
}: {
  playing: boolean;
  animated: boolean;
  label: string;
  onChange: (playing: boolean) => ActionResult;
}) {
  return (
    <div className="recipe-playback">
      <span className="recipe-playback-label">{label}</span>
      <div className="recipe-playback-row">
        <ActionButton
          intent="primary"
          pressed={playing}
          onCommand={() => onChange(!playing)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="playback-icon">
            {playing ? (
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            ) : (
              <path d="m7 4 13 8-13 8z" />
            )}
          </svg>
          {playing ? "Pause" : "Play"}
        </ActionButton>
        <output className="recipe-playback-state" aria-live="polite">
          {playing ? (animated ? "Running" : "Motion paused") : "Paused"}
        </output>
      </div>
      {playing && !animated && (
        <p className="catalog-help">
          Reduced motion is on. Use Board navigation help to advance time.
        </p>
      )}
    </div>
  );
}
