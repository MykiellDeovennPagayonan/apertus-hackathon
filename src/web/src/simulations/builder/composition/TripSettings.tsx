import type { CompositionScene } from "../../runtime/composition/index";
import type { TripComponent } from "../../runtime/composition/types";
import { requireRecord } from "../../runtime/records";
import { connectPorts } from "../graph/deriveGraph";
export function TripSettings({
  trip,
  scene,
  changeScene,
  onDelete,
}: {
  trip: TripComponent;
  scene: CompositionScene;
  changeScene: (change: (s: CompositionScene) => void, group?: string) => void;
  onDelete: () => void;
}) {
  const update = (patch: Partial<TripComponent>) =>
    changeScene(
      (s) =>
        Object.assign(
          requireRecord(
            requireRecord(s.workspace).trips.find((t) => t.id === trip.id),
          ),
          patch,
        ),
      `${trip.id}/settings`,
    );
  return (
    <>
      <label>
        Name
        <input
          value={trip.label}
          maxLength={100}
          onChange={(e) => update({ label: e.target.value })}
        />
      </label>
      <label>
        Person
        <select
          aria-label="Trip person"
          value={trip.person}
          onChange={(e) => {
            if (!e.target.value) update({ person: "" });
            else
              changeScene((s) =>
                connectPorts(
                  s,
                  { node: e.target.value, port: "person" },
                  { node: trip.id, port: "person" },
                ),
              );
          }}
        >
          <option value="">Not connected</option>
          {scene.objects
            .filter((o) => o.kind === "person")
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
        </select>
      </label>
      <label>
        Departure time (hours)
        <div className="composition-number">
          <input
            aria-label="Departure time slider"
            type="range"
            min={0}
            max={23.99}
            step={0.25}
            value={Number.isFinite(trip.at) ? trip.at : 0}
            onChange={(e) => update({ at: Number(e.target.value) })}
          />
          <input
            aria-label="Departure time"
            type="number"
            min={0}
            max={23.99}
            step={0.25}
            value={Number.isFinite(trip.at) ? trip.at : ""}
            onChange={(e) =>
              update({
                at: e.target.value === "" ? Number.NaN : Number(e.target.value),
              })
            }
          />
        </div>
      </label>
      <label>
        Destination
        <select
          aria-label="Trip destination"
          value={trip.target}
          onChange={(e) => {
            if (!e.target.value) update({ target: "" });
            else
              changeScene((s) =>
                connectPorts(
                  s,
                  { node: e.target.value, port: "destination" },
                  { node: trip.id, port: "destination" },
                ),
              );
          }}
        >
          <option value="">Coordinate in scene</option>
          {scene.objects
            .filter((o) => o.kind === "building")
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
        </select>
      </label>
      {!trip.target &&
        (["x", "z"] as const).map((axis) => (
          <label key={axis}>
            Destination {axis}
            <input
              type="number"
              min={-100}
              max={100}
              step={0.5}
              value={Number.isFinite(trip[axis]) ? trip[axis] : ""}
              onChange={(e) =>
                update({
                  [axis]:
                    e.target.value === "" ? Number.NaN : Number(e.target.value),
                })
              }
            />
          </label>
        ))}
      <p>
        Depart at this time, walk to the destination, then wait. A later trip
        interrupts the current one. Trips repeat each day.
      </p>
      <button type="button" onClick={onDelete}>
        Remove trip
      </button>
    </>
  );
}
