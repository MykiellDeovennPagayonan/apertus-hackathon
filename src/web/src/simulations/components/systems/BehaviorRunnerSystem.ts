import { DailyRoutine } from "../behaviors/DailyRoutine";
import { buildingPos, jitter, marketPos } from "../prefabs/Citizen";
import type { Citizen, P2 } from "../traits/Resident";
export interface MoveTo {
  type: "MoveTo";
  entity: string;
  taskId: number;
  target: P2;
}
/** Owns behavior state only; the runtime dispatches returned requests to navigation. */
export function BehaviorRunnerSystem(
  c: Citizen,
  time: number,
  busy: boolean,
  nearSchool: boolean,
  invalidated = false,
  destinations?: { entrances: Record<string, P2>; market: P2 },
): MoveTo | undefined {
  if (c.binding.behavior !== DailyRoutine.id)
    throw new Error(`${c.id}: unavailable behavior`);
  const h = ((time % 24) + 24) % 24,
    s = DailyRoutine.schedule;
  const observations = {
    night: h < s.homeBefore || h >= s.homeAfter,
    busyMarket: busy && c.seed < s.busyMarketShare,
    morning: h < s.lunchStart,
    lunch: h < s.lunchEnd,
    afternoon: h < s.workEnd,
    always: true,
  };
  const rule = DailyRoutine.rules.find((r) => observations[r.observation]);
  if (!rule) return;
  const activity =
    rule.target === "lunchChoice"
      ? c.seed < (busy ? s.busyMarketShare : s.marketShare)
        ? "market"
        : "square"
      : rule.target;
  const target = jitter(
    activity === "home"
      ? c.home
      : activity === "market"
        ? (destinations?.market ?? marketPos(nearSchool))
        : (destinations?.entrances[
            activity === "square" ? c.squareId : c.daytimeId
          ] ?? buildingPos(activity === "square" ? c.squareId : c.daytimeId)),
    c.seed,
  );
  const last = c.behavior.target;
  if (!invalidated && last && last.x === target.x && last.z === target.z)
    return;
  c.behavior = { activity, target, requestId: c.behavior.requestId + 1 };
  return { type: "MoveTo", entity: c.id, taskId: c.behavior.requestId, target };
}
