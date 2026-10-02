import { OrbitControls } from "@react-three/drei";
import { TownExperiment } from "../compositions/TownExperiment";
export function OrbitCameraControl() {
  return (
    <OrbitControls
      enableDamping
      maxPolarAngle={TownExperiment.viewSettings.maxPolarAngle}
      minDistance={TownExperiment.viewSettings.minDistance}
      maxDistance={TownExperiment.viewSettings.maxDistance}
      target={TownExperiment.viewSettings.target}
    />
  );
}
