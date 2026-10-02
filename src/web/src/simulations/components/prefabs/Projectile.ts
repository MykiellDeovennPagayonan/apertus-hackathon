import { BallisticMotionSystem } from "../systems/BallisticMotionSystem";
import type { LaunchSettings } from "../traits/LaunchSettings";
export function Projectile(
  id: string,
  settings: LaunchSettings,
  gravity: number,
  comparison = false,
) {
  return {
    id,
    launch: structuredClone(settings),
    ...BallisticMotionSystem(settings, gravity, 0),
    visual: {
      visual: "ShapeVisual2D",
      target: "svg" as const,
      resources: ["ProjectileStyles"],
      appearance: { comparison },
    },
  };
}
