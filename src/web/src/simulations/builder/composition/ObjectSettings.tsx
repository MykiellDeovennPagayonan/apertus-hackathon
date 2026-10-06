import { useState } from "react";
import { numericField } from "../../components/contracts/numericField";
import { componentDefinition } from "../../components/registry";
import {
  type CompositionScene,
  entrance,
  properties,
  propertyValue,
  type SceneObject,
  setProperty,
} from "../../runtime/composition/index";
export function ObjectSettings({
  object: o,
  scene,
  onChange,
  onDelete,
  onDuplicate,
}: {
  object: SceneObject;
  scene: CompositionScene;
  onChange: (o: SceneObject, group?: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [inputError, setInputError] = useState("");
  const patch = (change: object, group?: string) =>
    onChange({ ...o, ...change } as SceneObject, group);
  const number = (label: string, key: string, value: number, step = 0.1) => {
    const { min, max } = numericField(componentDefinition(o.kind).schema, key);
    return (
      <label key={key}>
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
              patch({ [key]: Number(e.target.value) }, `${o.id}/${key}`)
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
              patch(
                {
                  [key]:
                    e.target.value === "" ? Number.NaN : Number(e.target.value),
                },
                `${o.id}/${key}`,
              )
            }
          />
        </div>
      </label>
    );
  };
  const toggle = (label: string, key: string, value: boolean) => (
    <label key={key} className="composition-toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => patch({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  const pointInput = (
    label: string,
    key: "a" | "b" | "center",
    p: { x: number; y: number },
  ) => (
    <fieldset>
      <legend>{label}</legend>
      {(["x", "y"] as const).map((axis) => (
        <label key={axis}>
          {`${label} ${axis}`}
          <input
            type="number"
            step="0.1"
            min={
              numericField(componentDefinition(o.kind).schema, key, axis).min
            }
            max={
              numericField(componentDefinition(o.kind).schema, key, axis).max
            }
            value={Number.isFinite(p[axis]) ? p[axis] : ""}
            onChange={(e) =>
              patch(
                {
                  [key]: {
                    ...p,
                    [axis]:
                      e.target.value === ""
                        ? Number.NaN
                        : Number(e.target.value),
                  },
                },
                `${o.id}/${key}/${axis}`,
              )
            }
          />
        </label>
      ))}
    </fieldset>
  );
  return (
    <>
      {inputError && <p role="alert">{inputError}</p>}
      <label>
        Name
        <input
          value={o.label}
          maxLength={100}
          onChange={(e) => patch({ label: e.target.value }, `${o.id}/label`)}
        />
      </label>
      <label>
        Color
        <input
          type="color"
          value={o.color}
          onChange={(e) => patch({ color: e.target.value }, `${o.id}/color`)}
        />
      </label>
      {(o.kind === "gas" || o.kind === "fraction-bar") && (
        <>
          <p>
            {o.kind === "gas"
              ? "One gas sample. Pressure is calculated by the ideal-gas model; moving or resizing the illustration does not change volume."
              : "Each bar represents one equal whole. Display width does not change its fraction. Changing partition count may change quantity; subdivision preserves it."}
          </p>
          {Object.entries(properties(o)).map(([key, p]) => (
            <label key={key} htmlFor={`property-${o.id}-${key}`}>
              {p.label}
              {p.unit ? ` (${p.unit})` : ""}
              {p.toggle ? (
                <input
                  id={`property-${o.id}-${key}`}
                  type="checkbox"
                  checked={Boolean(propertyValue(o, key))}
                  onChange={(e) => {
                    const next = structuredClone(o);
                    setProperty(next, key, e.target.checked);
                    onChange(next);
                  }}
                />
              ) : (
                <input
                  id={`property-${o.id}-${key}`}
                  aria-label={p.label}
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={Number(propertyValue(o, key))}
                  onChange={(e) => {
                    try {
                      const next = structuredClone(o);
                      setProperty(
                        next,
                        key,
                        e.target.value === ""
                          ? Number.NaN
                          : Number(e.target.value),
                      );
                      onChange(next, `${o.id}/${key}`);
                      setInputError("");
                    } catch (error) {
                      setInputError(
                        error instanceof Error
                          ? error.message
                          : "Invalid value",
                      );
                    }
                  }}
                />
              )}
            </label>
          ))}
          {o.kind === "gas" ? (
            toggle("Show representative particles", "particles", o.particles)
          ) : (
            <>
              {toggle(
                "Learners can shade pieces",
                "interactive",
                o.interactive,
              )}
              <fieldset>
                <legend>Starting shaded pieces</legend>
                {o.shaded.map((shaded, i) => (
                  <label key={`${o.id}/piece-${i}`}>
                    <input
                      type="checkbox"
                      checked={shaded}
                      onChange={(e) =>
                        patch({
                          shaded: o.shaded.map((v, j) =>
                            j === i ? e.target.checked : v,
                          ),
                        })
                      }
                    />
                    Piece {i + 1}
                  </label>
                ))}
              </fieldset>
            </>
          )}
          <details>
            <summary>Display position and size</summary>
            {(["x", "y", "width", "height"] as const).map((key) => (
              <label key={key}>
                Display {key}
                <input
                  aria-label={`Display ${key}`}
                  type="number"
                  min={
                    numericField(
                      componentDefinition(o.kind).schema,
                      "display",
                      key,
                    ).min
                  }
                  max={
                    numericField(
                      componentDefinition(o.kind).schema,
                      "display",
                      key,
                    ).max
                  }
                  step={1}
                  value={o.display[key]}
                  onChange={(e) =>
                    patch(
                      {
                        display: {
                          ...o.display,
                          [key]: Number(e.target.value),
                        },
                      },
                      `${o.id}/display/${key}`,
                    )
                  }
                />
              </label>
            ))}
          </details>
        </>
      )}
      {o.kind === "line" && (
        <>
          <p>
            A line extends infinitely through its two handles. Drag either
            handle to set its geometry.
          </p>
          {o.a.x === o.b.x ? (
            <p>
              Vertical line: x = {o.a.x}. Slope and y intercept are undefined.
            </p>
          ) : (
            Object.entries(properties(o)).map(([key, p]) => (
              <label key={key}>
                {p.label}
                <div className="composition-number">
                  <input
                    type="range"
                    aria-label={`${p.label} slider`}
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={Number(propertyValue(o, key))}
                    onChange={(e) => {
                      const next = structuredClone(o);
                      setProperty(next, key, Number(e.target.value));
                      onChange(next, `${o.id}/${key}`);
                    }}
                  />
                  <input
                    type="number"
                    aria-label={p.label}
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={Number(propertyValue(o, key))}
                    onChange={(e) => {
                      const next = structuredClone(o);
                      try {
                        setProperty(next, key, Number(e.target.value));
                        onChange(next, `${o.id}/${key}`);
                        setInputError("");
                      } catch (error) {
                        setInputError(
                          error instanceof Error
                            ? error.message
                            : "Invalid value",
                        );
                      }
                    }}
                  />
                </div>
              </label>
            ))
          )}
          <details>
            <summary>Precise coordinates and appearance</summary>
            {pointInput("First handle", "a", o.a)}
            {pointInput("Second handle", "b", o.b)}
            {number("Line thickness (screen px)", "width", o.width, 0.5)}
            {toggle("Dashed line", "dashed", o.dashed)}
            {toggle("Learners can drag this line", "draggable", o.draggable)}
          </details>
        </>
      )}
      {o.kind === "square" && (
        <>
          <details>
            <summary>Precise center</summary>
            {pointInput("Center", "center", o.center)}
          </details>
          {number("Side length", "side", o.side)}
          {number("Rotation (degrees)", "rotation", o.rotation, 1)}
          {number("Outline thickness (screen px)", "width", o.width, 0.5)}
          {toggle("Filled square", "fill", o.fill)}
          {o.fill && number("Fill opacity", "opacity", o.opacity, 0.05)}
          {toggle("Learners can drag this square", "draggable", o.draggable)}
          <p>
            Area and perimeter use the mathematical side length. Outline
            thickness and fill do not change measurements.
          </p>
        </>
      )}
      {(o.kind === "building" || o.kind === "road" || o.kind === "person") && (
        <>
          {number("X position", "x", o.x, 0.5)}
          {number("Z position", "z", o.z, 0.5)}
        </>
      )}
      {(o.kind === "ground" || o.kind === "building" || o.kind === "road") && (
        <>
          {number("Width", "width", o.width, 0.5)}
          {number("Depth", "depth", o.depth, 0.5)}
        </>
      )}
      {o.kind === "building" && (
        <>
          {number("Height", "height", o.height, 0.5)}
          <label>
            Entrance side
            <select
              aria-label="Entrance side"
              value={o.entrance}
              onChange={(e) => patch({ entrance: e.target.value })}
            >
              {["north", "south", "east", "west"].map((side) => (
                <option key={side}>{side}</option>
              ))}
            </select>
          </label>
          {toggle("Blocks walking paths", "obstacle", o.obstacle)}
          <p>
            Entrance: ({entrance(o).x}, {entrance(o).y}). Schedules targeting
            this building follow its entrance when it moves.
          </p>
        </>
      )}
      {o.kind === "road" && (
        <>
          {toggle("Closed road (blocks crossing)", "closed", o.closed)}
          <p>
            Open roads are walkable surfaces. People take available routes
            across ground; roads do not force a fixed street grid.
          </p>
        </>
      )}
      {o.kind === "person" && (
        <>
          {number("Spawn time (hours)", "spawnAt", o.spawnAt, 0.25)}
          {number("Walking speed (units/second)", "speed", o.speed)}
          {!scene.workspace && (
            <fieldset className="composition-schedule">
              <legend>Where and when</legend>
              <p>
                Each row means depart at this time. A later departure interrupts
                the current trip. After arrival, wait for the next row. Times
                repeat each day.
              </p>
              {o.schedule.map((step, index) => {
                const update = (change: object) =>
                  patch({
                    schedule: o.schedule
                      .map((s) => (s.id === step.id ? { ...s, ...change } : s))
                      .sort((a, b) => a.at - b.at),
                  });
                return (
                  <fieldset key={step.id}>
                    <legend>Trip {index + 1}</legend>
                    <label>
                      Departure time
                      <input
                        type="number"
                        min={o.spawnAt}
                        max={23.99}
                        step={0.25}
                        value={step.at}
                        onChange={(e) => update({ at: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Destination
                      <select
                        aria-label="Destination"
                        value={step.target}
                        onChange={(e) => update({ target: e.target.value })}
                      >
                        <option value="">Coordinate in scene</option>
                        {scene.objects
                          .filter((b) => b.kind === "building")
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    {!step.target && (
                      <>
                        {(["x", "z"] as const).map((axis) => (
                          <label key={axis}>
                            Destination {axis}
                            <input
                              type="number"
                              min={-100}
                              max={100}
                              step={0.5}
                              value={step[axis]}
                              onChange={(e) =>
                                update({ [axis]: Number(e.target.value) })
                              }
                            />
                          </label>
                        ))}
                        <p>
                          Drag the yellow destination marker in the scene to
                          choose this coordinate.
                        </p>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          schedule: o.schedule.filter((s) => s.id !== step.id),
                        })
                      }
                    >
                      Remove trip {index + 1}
                    </button>
                  </fieldset>
                );
              })}
              <button
                type="button"
                disabled={
                  o.schedule.length >= 23.99 ||
                  (o.schedule.at(-1)?.at ?? o.spawnAt - 1) >= 23.99
                }
                onClick={() =>
                  patch({
                    schedule: [
                      ...o.schedule,
                      {
                        id: `trip-${crypto.randomUUID()}`,
                        at: Math.min(
                          23.99,
                          Math.max(
                            o.spawnAt,
                            (o.schedule.at(-1)?.at ?? o.spawnAt - 1) + 1,
                          ),
                        ),
                        target: "",
                        x: o.x + 5,
                        z: o.z,
                      },
                    ],
                  })
                }
              >
                Add trip
              </button>
            </fieldset>
          )}
          {scene.workspace && (
            <p>
              Add a Scheduled trip in Connections to choose where and when this
              person goes.
            </p>
          )}
        </>
      )}
      <div className="composition-object-actions">
        <button
          type="button"
          onClick={onDuplicate}
          disabled={!scene.workspace && o.kind === "ground"}
        >
          Duplicate object
        </button>
        <button type="button" onClick={onDelete}>
          Remove object
        </button>
      </div>
    </>
  );
}
