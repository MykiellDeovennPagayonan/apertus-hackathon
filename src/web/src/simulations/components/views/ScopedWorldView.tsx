"use client";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import type { ComponentInstance } from "../../runtime/authoring/types";
import type { TownModelState } from "../../runtime/townModel";
import { TownExperiment } from "../compositions/TownExperiment";
import { OrbitCameraControl } from "../controls/OrbitCameraControl";
import { TownAppearance } from "../resources/TownAppearance";
import { BuildingVisual3D } from "../visuals/BuildingVisual3D";
import { CitizenVisual3D } from "../visuals/CitizenVisual3D";
import { MarketVisual3D } from "../visuals/MarketVisual3D";
import { RoadVisual3D } from "../visuals/RoadVisual3D";
import { TownSceneryVisual3D } from "../visuals/TownSceneryVisual3D";
export default function ScopedWorldView({
  state: s,
  appearances,
  cameraPreset = "overview",
}: {
  cameraPreset?: "overview" | "close";
  state: TownModelState;
  appearances: ComponentInstance[];
}) {
  const [camera, setCamera] = useState(0),
    day = Math.max(0, Math.sin(((s.time - 6) / 12) * Math.PI)),
    night = s.time < 6 || s.time >= 19;
  const targets = new Set(
      appearances.map((n) => String(n.configuration.target)),
    ),
    lighting = appearances.find(
      (n) => n.definition === "appearance/EnvironmentLighting",
    ),
    scenery = appearances.find(
      (n) => n.definition === "appearance/TownScenery",
    );
  return (
    <section className="composition-town" aria-label="Town world">
      <button type="button" onClick={() => setCamera((v) => v + 1)}>
        Reset camera
      </button>
      <Canvas
        key={`${camera}/${cameraPreset}`}
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{
          position: TownExperiment.viewSettings.cameraPosition.map(
            (v) => v * (cameraPreset === "close" ? 0.65 : 1),
          ) as [number, number, number],
          fov: TownExperiment.viewSettings.fov,
        }}
      >
        <color
          attach="background"
          args={[
            day > 0.2 ? TownAppearance.daylight : TownAppearance.moonlight,
          ]}
        />
        {lighting && (
          <>
            <hemisphereLight
              args={[
                "#d7e8ee",
                "#7a8361",
                (0.55 + day * 0.9) * Number(lighting.configuration.intensity),
              ]}
            />
            <directionalLight
              position={[-25 + day * 10, 25 + day * 20, 18]}
              intensity={
                (0.25 + day * 2.5) * Number(lighting.configuration.intensity)
              }
              color={day > 0.35 ? "#fff1d5" : "#bacde7"}
              castShadow
            />
          </>
        )}
        {Boolean(scenery?.configuration.visible) && (
          <TownSceneryVisual3D night={night} />
        )}
        <RoadVisual3D closed={s.roadClosed} />
        {s.buildings
          .filter((b) => targets.has(b.id))
          .map(({ building: b }, i) =>
            b.kind === "square" ? null : (
              <BuildingVisual3D
                key={b.id}
                building={b}
                index={i}
                night={night}
              />
            ),
          )}
        {targets.has(s.market.id) && (
          <MarketVisual3D market={s.market.building} busy={s.marketBusy} />
        )}
        {s.citizens
          .filter((c) => targets.has(c.id))
          .map((c, i) => (
            <CitizenVisual3D
              key={c.id}
              citizen={c}
              index={i}
              nearSchool={s.marketNearSchool}
            />
          ))}
        <OrbitCameraControl />
      </Canvas>
    </section>
  );
}
