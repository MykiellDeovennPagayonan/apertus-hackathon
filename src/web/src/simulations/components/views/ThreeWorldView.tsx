import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color, type DirectionalLight, type HemisphereLight } from "three";
import { useTownStore } from "../../runtime/townSession";
import { TownExperiment } from "../compositions/TownExperiment";
import { OrbitCameraControl } from "../controls/OrbitCameraControl";
import { TownAppearance } from "../resources/TownAppearance";
import CitizenSystem from "../visuals/CitizenVisual3D";
import TownEnvironment from "../visuals/TownEnvironment";

const daylight = new Color(TownAppearance.daylight);
const moonlight = new Color(TownAppearance.moonlight);
const sky = new Color();

function DayNightRig() {
  const sun = useRef<DirectionalLight>(null);
  const ambient = useRef<HemisphereLight>(null);
  useFrame((state) => {
    const town = useTownStore.getState();
    const day = Math.max(0, Math.sin(((town.time - 6) / 12) * Math.PI));
    if (sun.current) {
      sun.current.intensity = 0.25 + day * 2.5;
      sun.current.position.set(-25 + day * 10, 25 + day * 20, 18);
      sun.current.color.set(day > 0.35 ? "#fff1d5" : "#bacde7");
    }
    if (ambient.current) ambient.current.intensity = 0.55 + day * 0.9;
    state.gl.setClearColor(
      sky.copy(moonlight).lerp(daylight, Math.min(1, day * 3)),
    );
  });
  return (
    <>
      <hemisphereLight ref={ambient} args={["#d7e8ee", "#7a8361", 1.2]} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-camera-far={120}
        shadow-normalBias={0.06}
        shadow-bias={-0.0002}
      />
    </>
  );
}

export function ThreeWorldView() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{
        position: TownExperiment.viewSettings.cameraPosition,
        fov: TownExperiment.viewSettings.fov,
      }}
    >
      <DayNightRig />
      <TownEnvironment />
      <CitizenSystem />
      <OrbitCameraControl />
    </Canvas>
  );
}

export default ThreeWorldView;
