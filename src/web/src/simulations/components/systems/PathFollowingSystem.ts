import { WalkingProfile } from "../resources/WalkingProfile";
import type { Citizen } from "../traits/Resident";
import { clearTownSegment, type Obstacle } from "./townNavigation";
/** Owns position/heading and advances an index through assigned waypoints; never generates or replaces a route. */
export function PathFollowingSystem(
  c: Citizen,
  delta: number,
  obstacles: Obstacle[],
) {
  let remaining = c.speed * delta;
  while (c.progress < c.path.length) {
    const next = c.path[c.progress],
      dx = next.x - c.pos.x,
      dz = next.z - c.pos.z,
      distance = Math.hypot(dx, dz);
    if (distance < WalkingProfile.arrivalTolerance) {
      c.progress++;
      continue;
    }
    if (remaining <= 0) break;
    const step = Math.min(distance, remaining),
      proposed = {
        x: c.pos.x + (dx / distance) * step,
        z: c.pos.z + (dz / distance) * step,
      };
    if (!clearTownSegment(c.pos, proposed, obstacles)) {
      c.status = "no-route";
      break;
    }
    c.heading = Math.atan2(dx, dz);
    c.pos = proposed;
    remaining -= step;
    if (step === distance) c.progress++;
  }
  if (c.progress >= c.path.length && c.status === "traveling") {
    c.status = "arrived";
    c.arrivedTaskId = c.taskId;
  }
}
