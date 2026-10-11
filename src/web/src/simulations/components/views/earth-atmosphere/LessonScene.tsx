"use client";
import dynamic from "next/dynamic";
import { Component, type ReactNode, useState } from "react";
import { type EarthState, questions } from "../../../domains/earth-atmosphere";
import type { ModelInstance } from "../../../runtime/contribution";
import {
  AtmosphereDiagram,
  DropletDiagram,
  EarthquakeDiagram,
  GreenhouseDiagram,
  LightningDiagram,
  RainbowDiagram,
  TsunamiDiagram,
  WeatherDiagram,
} from "./Diagrams";
import "./earth-atmosphere.css";
const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });
const compactKeys = {
  earthquake:
    "Teal: surface markers · red: rupture · dashed blue: seismic waves",
  tsunami: "Blue: water · tan: seabed and coast · wave height exaggerated",
  atmosphere:
    "Ozone-rich air is in the stratosphere; layer heights are compressed",
  greenhouse: "Gold: sunlight · terracotta: infrared · gray: atmosphere",
  lightning: "Arrow: updraft · + / −: charge · gold: bright channel",
  rainbow: "Yellow: Sun behind you · blue: rain ahead · teal: observer",
  weather: "Gold circle: air parcel · gray: cloud water · blue: rain",
};
class SpatialBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function LessonScene({ instance }: { instance: ModelInstance }) {
  const s = instance.state as unknown as EarthState;
  const [view, setView] = useState(
      s.kind === "rainbow" ? "observer" : "angled",
    ),
    [unavailable, setUnavailable] = useState(false);
  const is3d = s.kind === "rainbow" || s.kind === "earthquake";
  const fallback =
    s.kind === "rainbow" ? (
      <RainbowDiagram s={s} />
    ) : (
      <EarthquakeDiagram s={s} />
    );
  const drawing =
    s.kind === "tsunami" ? (
      <TsunamiDiagram s={s} />
    ) : s.kind === "atmosphere" ? (
      <AtmosphereDiagram s={s} />
    ) : s.kind === "greenhouse" ? (
      <GreenhouseDiagram s={s} />
    ) : s.kind === "lightning" ? (
      <LightningDiagram s={s} />
    ) : s.kind === "weather" ? (
      <WeatherDiagram s={s} />
    ) : (
      fallback
    );
  return (
    <section
      className="ea-scene"
      data-earth={s.kind}
      data-phase={s.phase}
      data-playing={String(s.playing)}
      data-responsive-height="content"
      aria-label={questions[s.kind]}
    >
      <h2>{questions[s.kind]}</h2>
      <div className="ea-drawing">
        {is3d && view !== "section" && !unavailable && (
          <div className="ea-loading-explanation" aria-hidden="true">
            {fallback}
          </div>
        )}
        {is3d && view !== "section" && !unavailable ? (
          <SpatialBoundary fallback={fallback}>
            <Scene3D
              s={s}
              view={view}
              onUnavailable={() => setUnavailable(true)}
            />
          </SpatialBoundary>
        ) : (
          drawing
        )}
        {s.kind === "rainbow" && s.phase >= 1 && s.phase <= 3 && (
          <div className="ea-inset">
            <DropletDiagram s={s} />
            <p>
              Enlarged droplet · light paths are sampled from a continuous
              spectrum
            </p>
          </div>
        )}
      </div>
      <p className="ea-mobile-key">
        {s.kind === "greenhouse" && s.phase >= 4
          ? `Surface ${(s.energy.surface - 273.15).toFixed(1)} °C in this simplified model · terracotta: infrared`
          : compactKeys[s.kind]}
      </p>
      {is3d && (
        <label className="ea-camera">
          View{" "}
          <select
            aria-label="Scene view"
            value={unavailable ? "section" : view}
            onChange={(e) => setView(e.target.value)}
            disabled={unavailable}
          >
            {s.kind === "earthquake" ? (
              <>
                <option value="angled">Fault blocks · 3D</option>
                <option value="top">From above · 3D</option>
              </>
            ) : (
              <>
                <option value="observer">Observer's view · 3D</option>
                <option value="angled">Sun–rain–observer · 3D</option>
              </>
            )}
            <option value="section">Explanation · 2D</option>
          </select>
        </label>
      )}
      <p className="ea-note">
        {unavailable
          ? "Spatial rendering is unavailable; the same lesson continues in 2D."
          : s.kind === "earthquake"
            ? "Movement exaggerated · changing the view does not move the plates"
            : s.kind === "rainbow"
              ? "Changing the camera does not move the observer · droplets enlarged"
              : s.kind === "tsunami"
                ? "Ocean propagation and coastal arrival use different teaching stages"
                : s.kind === "atmosphere"
                  ? "Representative atmosphere · ionosphere overlaps several layers"
                  : s.kind === "weather"
                    ? "Follow one parcel through a prescribed flow; this is not a forecast"
                    : s.kind === "greenhouse"
                      ? "Single-layer energy model · absorption is not a measured CO₂ concentration"
                      : "Cloud charging and channel shapes are representative teaching stages"}
      </p>
    </section>
  );
}
