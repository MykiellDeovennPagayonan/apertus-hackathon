import {
  MARKET_DEFAULT,
  MARKET_NEAR_SCHOOL,
  STATIC_BUILDINGS,
  TownLayout,
} from "../resources/TownLayout";
import type { Building } from "../traits/Building";
import type { Point } from "./NavigationSystem";
import {
  clearRouteSegment,
  premadeRoutePolicy,
  searchRoute,
} from "./RouteSearchSystem";

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
  return clearRouteSegment(
    { x: from.x, y: from.z },
    { x: to.x, y: to.z },
    (p) => isTownWalkable({ x: p.x, z: p.y }, obstacles),
    0.15,
  );
}

export function avoidTownObstacles(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
): Point[] {
  return searchRoute(
    {
      bounds: { width: 60, depth: 50 },
      walkable: (p) => isTownWalkable({ x: p.x, z: p.y }, obstacles),
      clear: (a, b) =>
        clearTownSegment({ x: a.x, z: a.y }, { x: b.x, z: b.y }, obstacles),
    },
    { x: from.x, y: from.z },
    { x: to.x, y: to.z },
    premadeRoutePolicy,
  ).map((p) => ({ x: p.x, z: p.y }));
}
