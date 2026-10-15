import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { type ComponentRef, useEffect, useRef } from "react";
import { Vector3 } from "three";
import { TownExperiment } from "../compositions/TownExperiment";
import { useReducedMotion } from "../views/useCompactDiagram";
export function OrbitCameraControl({
  enabled = true,
  rotation = 0,
  zoom = 1,
}: {
  enabled?: boolean;
  rotation?: number;
  zoom?: number;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const previous = useRef({ rotation, zoom });
  const camera = useThree((state) => state.camera);
  const reduced = useReducedMotion();
  useEffect(() => {
    const target =
      controls.current?.target.clone() ??
      new Vector3(...TownExperiment.viewSettings.target);
    const offset = camera.position.clone().sub(target);
    offset.applyAxisAngle(
      new Vector3(0, 1, 0),
      ((rotation - previous.current.rotation) * Math.PI) / 180,
    );
    offset.multiplyScalar(zoom / previous.current.zoom);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    previous.current = { rotation, zoom };
    controls.current?.update();
  }, [camera, rotation, zoom]);
  return (
    <OrbitControls
      ref={controls}
      enabled={enabled}
      enableDamping={!reduced}
      maxPolarAngle={TownExperiment.viewSettings.maxPolarAngle}
      minDistance={TownExperiment.viewSettings.minDistance}
      maxDistance={TownExperiment.viewSettings.maxDistance}
      target={TownExperiment.viewSettings.target}
    />
  );
}
