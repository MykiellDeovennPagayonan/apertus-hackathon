import type { FieldContract } from "../../runtime/definition";
/** Construction-owned recipe assignment, read by the trusted behavior runner. */
export interface BehaviorBinding {
  behavior: "DailyRoutine";
  schedule: "DailySchedule";
}

export const BehaviorBindingFields = {
  behavior: {
    unit: "behavior ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  schedule: {
    unit: "resource ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
} satisfies Record<string, FieldContract>;
