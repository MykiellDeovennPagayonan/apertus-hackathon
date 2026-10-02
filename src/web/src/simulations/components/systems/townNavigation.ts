import {
  MARKET_DEFAULT,
  MARKET_NEAR_SCHOOL,
  STATIC_BUILDINGS,
  TownLayout,
} from "../resources/TownLayout";
import type { Building } from "../traits/Building";
import type { Point } from "./NavigationSystem";

export interface Obstacle {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

import { WalkingProfile } from "../resources/WalkingProfile";
export const CITIZEN_RADIUS = WalkingProfile.clearance;
export const FOUNTAIN = TownLayout.fountain;

export function townObstacles(
  nearSchool: boolean,
  buildings: readonly Building[] = STATIC_BUILDINGS,
  market = nearSchool ? MARKET_NEAR_SCHOOL : MARKET_DEFAULT,
): Obstacle[] {
  return [
    ...buildings
      .filter((building) => building.kind !== "square")
      .map((building) => ({
        x: building.x,
        z: building.z,
        halfWidth: building.w / 2 + 0.1,
        halfDepth: building.d / 2 + 0.1,
      })),
    {
      x: FOUNTAIN.x,
      z: FOUNTAIN.z,
      halfWidth: FOUNTAIN.radius,
      halfDepth: FOUNTAIN.radius,
    },
    ...TownLayout.benches,
    { ...market, halfWidth: 3.5, halfDepth: 0.7 },
  ];
}

export function isTownWalkable(point: Point, obstacles: Obstacle[]): boolean {
  return (
    Math.abs(point.x) <= TownLayout.bounds.x &&
    Math.abs(point.z) <= TownLayout.bounds.z &&
    !obstacles.some(
      (obstacle) =>
        Math.abs(point.x - obstacle.x) < obstacle.halfWidth + CITIZEN_RADIUS &&
        Math.abs(point.z - obstacle.z) < obstacle.halfDepth + CITIZEN_RADIUS,
    )
  );
}

export function clearTownSegment(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
): boolean {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.15),
  );
  for (let index = 0; index <= steps; index++) {
    if (
      !isTownWalkable(
        {
          x: from.x + ((to.x - from.x) * index) / steps,
          z: from.z + ((to.z - from.z) * index) / steps,
        },
        obstacles,
      )
    )
      return false;
  }
  return true;
}

export function avoidTownObstacles(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
): Point[] {
  if (!isTownWalkable(to, obstacles)) return [];
  if (clearTownSegment(from, to, obstacles)) return [to];
  const spacing = 0.5;
  const width = 121;
  const height = 101;
  const pointAt = (index: number): Point => ({
    x: (index % width) * spacing - 30,
    z: Math.floor(index / width) * spacing - 25,
  });
  const indexAt = (point: Point) =>
    Math.round((point.z + 25) / spacing) * width +
    Math.round((point.x + 30) / spacing);
  const start = indexAt(from);
  const queue = [start];
  const parents = new Int32Array(width * height).fill(-1);
  parents[start] = start;
  let reached = -1;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    const point = pointAt(current);
    if (
      Math.hypot(point.x - to.x, point.z - to.z) <= 0.75 &&
      clearTownSegment(point, to, obstacles)
    ) {
      reached = current;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const column = (current % width) + dx;
      const row = Math.floor(current / width) + dz;
      if (column < 0 || column >= width || row < 0 || row >= height) continue;
      const next = row * width + column;
      if (
        parents[next] !== -1 ||
        !clearTownSegment(
          current === start ? from : point,
          pointAt(next),
          obstacles,
        )
      )
        continue;
      parents[next] = current;
      queue.push(next);
    }
  }
  if (reached === -1) return [];
  const reverse: Point[] = [to];
  while (reached !== start) {
    reverse.push(pointAt(reached));
    reached = parents[reached];
  }
  const route = reverse.reverse();
  const result: Point[] = [];
  let anchor = from;
  for (let index = 0; index < route.length; index++) {
    if (
      index === route.length - 1 ||
      !clearTownSegment(anchor, route[index + 1], obstacles)
    ) {
      result.push(route[index]);
      anchor = route[index];
    }
  }
  return result;
}
