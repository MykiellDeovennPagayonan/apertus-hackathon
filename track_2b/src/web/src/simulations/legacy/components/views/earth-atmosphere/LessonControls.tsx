"use client";
import { useContext, useState } from "react";
import {
  caption,
  command,
  type EarthState,
  lastPhase,
} from "../../../../domains/earth-atmosphere";
import type { DocumentRuntime } from "../../../../creation-and-editing/runtime-engine/DocumentRuntime";
import type { ComponentInstance } from "../../../../creation-and-editing/authoring-engine/document";
import { energyFlux } from "../../systems/earth-atmosphere/physics";
import { MotionContext, SnapshotContext } from "../../../../creation-and-editing/simulation/recipe/contexts";
import "./earth-atmosphere.css";
const labels = {
  earthquake: [
    "Move the plates",
    "Release the fault",
    "Follow the rupture",
    "Follow the waves",
    "See the lasting offset",
  ],
  tsunami: [
    "Move the seabed",
    "Follow the wave",
    "Reach the shelf",
    "Watch coastal arrival",
    "Show the next wave",
  ],
  greenhouse: [
    "Follow the energy",
    "See outgoing heat",
    "Meet greenhouse gases",
    "Add more greenhouse gas",
    "Watch the warming",
    "Follow the new balance",
  ],
  lightning: [
    "Watch charges separate",
    "Follow the particles",
    "Reveal the leader",
    "Connect the channel",
    "Follow the bright flash",
    "Hear why thunder is later",
  ],
  rainbow: [
    "Follow the light",
    "See the reflection",
    "Follow light out",
    "See the whole rainbow",
    "Move your viewpoint",
  ],
  weather: [
    "Warm the land",
    "Follow the rising air",
    "Look for a cloud",
    "Follow cloud water",
    "Grow the droplets",
    "See whether it rains",
  ],
  atmosphere: [],
};
export function LessonControls({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const snapshot = useContext(SnapshotContext),
    motion = useContext(MotionContext),
    [error, setError] = useState("");
  const link = runtime.document.connections.find(
    (c) => c.kind === "value" && c.to.node === node.id && c.to.port === "value",
  );
  const s = link
    ? (snapshot.state[link.from.node] as unknown as EarthState)
    : undefined;
  if (!s) return <p className="ea-caption">Connect the lesson to begin.</p>;
  const kind = s.kind,
    c = s.config,
    finished = s.phase >= lastPhase[kind];
  function send(op: string, value?: unknown) {
    const links = runtime.document.connections.filter(
      (l) =>
        l.kind === "command" &&
        l.from.node === node.id &&
        l.from.port === command(kind, op),
    );
    const result = links.length
      ? runtime.dispatch(
          links.map((l) => ({
            node: l.to.node,
            command: l.to.port,
            arguments: value === undefined ? {} : { value },
          })),
        )
      : { accepted: false, error: "This action is not connected." };
    setError(result.accepted ? "" : result.error);
  }
  if (node.definition.endsWith("-caption"))
    return (
      <p className="ea-caption" aria-live={s.playing ? "off" : "polite"}>
        {caption(s)}
      </p>
    );
  const energyChanged =
    kind === "greenhouse" &&
    Math.abs(
      energyFlux(
        s.energy,
        Number(c.absorption),
        Number(c.albedo),
        Number(c.solar),
      ).imbalance,
    ) > 1;
  const select = (
    label: string,
    key: string,
    options: [number | string, string][],
  ) => (
    <label className="ea-choice">
      {label}
      <select
        aria-label={label}
        data-earth-setting={key}
        value={String(c[key])}
        onChange={(e) =>
          send(
            `SET_${key}`,
            e.target.value === "true"
              ? true
              : e.target.value === "false"
                ? false
                : Number(e.target.value),
          )
        }
      >
        {!options.some(([value]) => String(value) === String(c[key])) && (
          <option value={String(c[key])}>
            Current · {String(c[key])}
            {key === "ozone"
              ? "× normal ozone"
              : key === "depth"
                ? " m"
                : key === "moisture"
                  ? "%"
                  : ""}
          </option>
        )}
        {options.map(([v, t]) => (
          <option key={String(v)} value={String(v)}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="ea-controls" data-responsive-height="content">
      {kind === "atmosphere" ? (
        <>
          {!c.uv ? (
            <label className="ea-altitude">
              Altitude <output>{String(c.altitude)} km</output>
              <input
                aria-label="Altitude"
                type="range"
                min="0"
                max="800"
                step={Number.isInteger(Number(c.altitude)) ? 1 : "any"}
                value={Number(c.altitude)}
                onChange={(e) => send("SET_altitude", Number(e.target.value))}
              />
            </label>
          ) : (
            select("Ozone amount", "ozone", [
              [1, "Normal ozone"],
              [0.3, "Less ozone"],
            ])
          )}
          <button
            type="button"
            className="ea-secondary"
            onClick={() => {
              send("SET_uv", !c.uv);
              if (!c.uv) send("SET_altitude", 25);
            }}
          >
            {c.uv ? "Explore the layers" : "See how ozone protects us"}
          </button>
        </>
      ) : (
        <>
          <button
            className="ea-primary"
            type="button"
            onClick={() => {
              if (s.playing) {
                send("PAUSE");
                return;
              }
              if (finished) {
                send("RESTART");
                return;
              }
              if (kind === "rainbow" && s.phase === 4)
                send(
                  "SET_observer",
                  Number(c.observer) >= 2 ? 0 : Number(c.observer) + 1,
                );
              if (kind === "greenhouse" && s.phase === 3 && !energyChanged)
                send(
                  "SET_absorption",
                  Math.min(0.95, Number(c.absorption) + 0.15),
                );
              send(motion ? "RUN" : "ADVANCE");
            }}
          >
            {s.playing
              ? "Pause this stage"
              : finished
                ? "Start again"
                : kind === "greenhouse" && s.phase === 3 && energyChanged
                  ? "Follow the warming"
                  : labels[kind][s.phase]}
          </button>
          {finished &&
            kind === "earthquake" &&
            select("Fault movement", "fault", [
              [0, "Sideways"],
              [1, "Normal · extension"],
              [2, "Reverse · compression"],
            ])}
          {finished &&
            kind === "tsunami" &&
            select("Ocean depth", "depth", [
              [1000, "Shallower · 1,000 m"],
              [4000, "Deeper · 4,000 m"],
              [6000, "Deepest · 6,000 m"],
            ])}
          {finished &&
            kind === "lightning" &&
            select("Discharge path", "intracloud", [
              ["false", "Cloud to ground"],
              ["true", "Inside the cloud"],
            ])}
          {finished &&
            kind === "rainbow" &&
            select("Rainbow", "secondary", [
              ["false", "Primary bow"],
              ["true", "Primary + secondary bow"],
            ])}
          {finished &&
            kind === "weather" &&
            select("Air moisture", "moisture", [
              [80, "Moist air · 80%"],
              [30, "Drier air · 30%"],
            ])}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
