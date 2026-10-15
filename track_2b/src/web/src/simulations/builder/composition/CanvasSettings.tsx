import type { CanvasComponent } from "../../creation-and-editing/runtime-engine/composition/types";
import { requireRecord } from "../../legacy/runtime/records";
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
      <fieldset className="canvas-appearance-settings">
        <legend>Canvas appearance</legend>
        <p>
          Keep the canvas visually open, or add framing where the lesson needs
          it.
        </p>
        <label className="composition-toggle">
          <input
            type="checkbox"
            checked={canvas.settings.backgroundColor !== undefined}
            onChange={(e) =>
              update((c) => {
                c.settings.backgroundColor = e.target.checked
                  ? "#fffdf7"
                  : undefined;
              })
            }
          />
          Add background
        </label>
        {canvas.settings.backgroundColor !== undefined && (
          <label className="canvas-color-setting">
            Background color
            <input
              type="color"
              value={canvas.settings.backgroundColor}
              onChange={(e) =>
                update((c) => {
                  c.settings.backgroundColor = e.target.value;
                }, `${canvas.id}/backgroundColor`)
              }
            />
          </label>
        )}
        <label className="composition-toggle">
          <input
            type="checkbox"
            checked={canvas.settings.borderColor !== undefined}
            onChange={(e) =>
              update((c) => {
                c.settings.borderColor = e.target.checked
                  ? "#d5cdbb"
                  : undefined;
              })
            }
          />
          Add border
        </label>
        {canvas.settings.borderColor !== undefined && (
          <label className="canvas-color-setting">
            Border color
            <input
              type="color"
              value={canvas.settings.borderColor}
              onChange={(e) =>
                update((c) => {
                  c.settings.borderColor = e.target.value;
                }, `${canvas.id}/borderColor`)
              }
            />
          </label>
        )}
        <label className="composition-toggle">
          <input
            type="checkbox"
            checked={canvas.settings.showNavigation === true}
            onChange={(e) =>
              update((c) => {
                c.settings.showNavigation = e.target.checked;
              })
            }
          />
          Show zoom and reset controls
        </label>
        <label className="composition-toggle">
          <input
            type="checkbox"
            checked={canvas.settings.showAbout === true}
            onChange={(e) =>
              update((c) => {
                c.settings.showAbout = e.target.checked;
              })
            }
          />
          Show “About this scene”
        </label>
      </fieldset>
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
