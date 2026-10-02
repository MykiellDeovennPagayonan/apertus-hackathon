import { immutable } from "../../runtime/definition";
import { DailySchedule } from "../resources/DailySchedule";
/** Ordered recipe, interpreted by BehaviorRunnerSystem through a fixed trusted vocabulary. */
export const DailyRoutine = immutable({
  id: "DailyRoutine",
  rules: [
    { observation: "night", target: "home" },
    { observation: "busyMarket", target: "market" },
    { observation: "morning", target: "work" },
    { observation: "lunch", target: "lunchChoice" },
    { observation: "afternoon", target: "work" },
    { observation: "always", target: "home" },
  ] as const,
  schedule: DailySchedule,
});
