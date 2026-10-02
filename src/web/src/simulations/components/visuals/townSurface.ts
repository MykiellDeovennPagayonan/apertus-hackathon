import {
  MARKET_DEFAULT,
  MARKET_NEAR_SCHOOL,
  STATIC_BUILDINGS,
} from "../resources/TownLayout";
import type { Point } from "../systems/NavigationSystem";

const PLAZA_HEIGHT = 0.22;
export function townSurfaceHeight({ x, z }: Point, nearSchool = false): number {
  let height = -0.05;
  if (Math.abs(x) <= 29 && Math.abs(z) <= 2.7) height = 0.075;
  if (Math.abs(x) <= 29 && Math.abs(z) <= 1.75) height = 0.12;
  for (const street of [-14, 14]) {
    if (Math.abs(x - street) <= 2.05 && Math.abs(z) <= 21)
      height = Math.max(height, 0.075);
    if (Math.abs(x - street) <= 1.25 && Math.abs(z) <= 21)
      height = Math.max(height, 0.125);
  }
  if (Math.abs(x) <= 21.5 && Math.abs(Math.abs(z) - 8) <= 0.9)
    height = Math.max(height, 0.12);
  for (const building of STATIC_BUILDINGS) {
    if (
      building.kind !== "square" &&
      Math.abs(x - building.x) <= (building.w + 1) / 2 &&
      Math.abs(z - building.z) <= (building.d + 1) / 2
    )
      height = Math.max(height, 0.24);
  }
  if (Math.abs(x - 6) <= 4 && Math.abs(z) <= 4) height = PLAZA_HEIGHT;
  const market = nearSchool ? MARKET_NEAR_SCHOOL : MARKET_DEFAULT;
  if (Math.abs(x - market.x) <= 4 && Math.abs(z - market.z) <= 2.25)
    height = Math.max(height, 0.24);
  return height;
}
