import { immutable } from "../../../definition";
import { ProjectileExperiment } from "./ProjectileExperiment";
export const AngleComparisonExperiment = immutable({
  ...ProjectileExperiment,
  id: "AngleComparisonExperiment",
  defaults: { ...ProjectileExperiment.defaults, compareAngle: 30 },
  instances: [
    ...ProjectileExperiment.instances,
    {
      id: "projectile/comparison",
      prefab: "Projectile",
      parameters: { angle: 30, velocity: 20, gravity: 9.81 },
    },
  ],
});
