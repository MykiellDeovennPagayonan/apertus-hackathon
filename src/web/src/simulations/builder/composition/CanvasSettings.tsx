import { requireRecord } from "../records";
import type { CanvasComponent } from "./workspace";
export function CanvasSettings({
  canvas,
  update,
  onDelete,
  onDuplicate,
}: {
  canvas: CanvasComponent;
  update: (change: (c: CanvasComponent) => void, group?: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const numeric = (
    label: string,
    value: number,
    set: (c: CanvasComponent, v: number) => void,
    min: number,
    max: number,
    step: number,
  ) => (
    <label>
      {label}
      <div className="composition-number">
        <input
          aria-label={`${label} slider`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : min}
          onChange={(e) =>
            update(
              (c) => set(c, Number(e.target.value)),
              `${canvas.id}/${label}`,
            )
          }
        />
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) =>
            update(
              (c) =>
                set(
                  c,
                  e.target.value === "" ? Number.NaN : Number(e.target.value),
                ),
              `${canvas.id}/${label}`,
            )
          }
        />
      </div>
    </label>
  );
  return (
    <>
      <label>
        Name
        <input
          value={canvas.label}
          maxLength={100}
          onChange={(e) =>
            update((c) => {
              c.label = e.target.value;
            }, `${canvas.id}/label`)
          }
        />
      </label>
      <label className="composition-toggle">
        <input
          type="checkbox"
          checked={canvas.settings.grid}
          onChange={(e) =>
            update((c) => {
              c.settings.grid = e.target.checked;
            })
          }
        />
        Show grid
      </label>
      {canvas.kind === "cartesian" ? (
        <details>
          <summary>Axes and dragging</summary>
          {(["xMin", "xMax", "yMin", "yMax"] as const).map((key) => (
            <label key={key}>
              {
                {
                  xMin: "X minimum",
                  xMax: "X maximum",
                  yMin: "Y minimum",
                  yMax: "Y maximum",
                }[key]
              }
              <input
                type="number"
                min={-100}
                max={100}
                value={
                  Number.isFinite(canvas.settings[key])
                    ? canvas.settings[key]
                    : ""
                }
                onChange={(e) =>
                  update((c) => {
                    c.settings[key] =
                      e.target.value === ""
                        ? Number.NaN
                        : Number(e.target.value);
                  }, `${canvas.id}/${key}`)
                }
              />
            </label>
          ))}
          {numeric(
            "Drag snap (0 disables)",
            canvas.settings.snap,
            (c, v) => {
              c.settings.snap = v;
            },
            0,
            5,
            0.1,
          )}
        </details>
      ) : canvas.kind === "town" ? (
        <>
          {numeric(
            "Starting time (hours)",
            requireRecord(canvas.clock).start,
            (c, v) => {
              requireRecord(c.clock).start = v;
            },
            0,
            24,
            0.25,
          )}
          <details>
            <summary>Playback and dragging</summary>
            {numeric(
              "Real seconds per simulated hour",
              requireRecord(canvas.clock).secondsPerHour,
              (c, v) => {
                requireRecord(c.clock).secondsPerHour = v;
              },
              1,
              60,
              1,
            )}
            {numeric(
              "Drag snap (0 disables)",
              canvas.settings.snap,
              (c, v) => {
                c.settings.snap = v;
              },
              0,
              5,
              0.1,
            )}
            <label className="composition-toggle">
              <input
                type="checkbox"
                checked={requireRecord(canvas.clock).playing}
                onChange={(e) =>
                  update((c) => {
                    requireRecord(c.clock).playing = e.target.checked;
                  })
                }
              />
              Start playing
            </label>
          </details>
        </>
      ) : (
        <details>
          <summary>Viewport and author dragging</summary>
          {(["xMin", "xMax", "yMin", "yMax"] as const).map((key) => (
            <label key={key}>
              {
                { xMin: "Left", xMax: "Right", yMin: "Top", yMax: "Bottom" }[
                  key
                ]
              }
              <input
                type="number"
                min={-100}
                max={100}
                value={canvas.settings[key]}
                onChange={(e) =>
                  update((c) => {
                    c.settings[key] = Number(e.target.value);
                  }, `${canvas.id}/${key}`)
                }
              />
            </label>
          ))}
          {numeric(
            "Drag snap (0 disables)",
            canvas.settings.snap,
            (c, v) => {
              c.settings.snap = v;
            },
            0,
            5,
            0.1,
          )}
          <p>Viewport units describe display placement only.</p>
        </details>
      )}
      <p>
        Only objects connected to this canvas appear here. Canvas settings are
        independent of other canvases.
      </p>
      <div className="composition-object-actions">
        <button type="button" onClick={onDuplicate}>
          Duplicate empty canvas
        </button>
        <button type="button" onClick={onDelete}>
          Remove canvas
        </button>
      </div>
    </>
  );
}
