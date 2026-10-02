import { avoidTownObstacles, townObstacles } from "./townNavigation";

export type Point = { x: number; z: number };
// Citizens join the street grid before heading to their destination.
export function planTownPath(
  from: Point,
  to: Point,
  closed: boolean,
  nearSchool = false,
  context?: {
    obstacles: import("./townNavigation").Obstacle[];
    streets: readonly number[];
  },
): Point[] {
  const streets = context?.streets ?? [-14, 14];
  const nearestStreet = (x: number) =>
    streets.reduce((a, b) => (Math.abs(x - a) < Math.abs(x - b) ? a : b));
  const a = nearestStreet(from.x);
  const b = nearestStreet(to.x);
  const obstacles = context?.obstacles ?? townObstacles(nearSchool);
  if (Math.hypot(from.x - to.x, from.z - to.z) < 2)
    return avoidTownObstacles(from, to, obstacles);
  const path: Point[] = [{ x: a, z: from.z }];
  if (a !== b) {
    const crossZ = closed ? (from.z < 0 ? -8 : 8) : 0;
    path.push({ x: a, z: crossZ }, { x: b, z: crossZ });
  }
  path.push({ x: b, z: to.z }, to);
  const result: Point[] = [];
  let anchor = from;
  for (const waypoint of path) {
    const segment = avoidTownObstacles(anchor, waypoint, obstacles);
    if (!segment.length) return [];
    result.push(...segment);
    anchor = waypoint;
  }
  return result;
}

export interface NavigationInputs {
  roadClosed: boolean;
  marketNearSchool: boolean;
  context?: {
    obstacles: import("./townNavigation").Obstacle[];
    streets: readonly number[];
  };
}
/** Owns route assignment. A failure is explicit and leaves position untouched. */
export function NavigationSystem(
  c: import("../traits/Resident").Citizen,
  request: import("./BehaviorRunnerSystem").MoveTo,
  inputs: NavigationInputs,
) {
  const path = planTownPath(
    c.pos,
    request.target,
    inputs.roadClosed,
    inputs.marketNearSchool,
    inputs.context,
  );
  c.destination = { ...request.target };
  c.path = path;
  c.taskId = request.taskId;
  c.status = path.length ? "traveling" : "no-route";
}
