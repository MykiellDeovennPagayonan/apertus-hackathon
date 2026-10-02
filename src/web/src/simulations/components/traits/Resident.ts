import type { FieldContract } from "../../runtime/definition";
import type { BehaviorBinding } from "./BehaviorBinding";
import type { BehaviorState } from "./BehaviorState";
import type { NavigationAgent } from "./NavigationAgent";
export type P2 = { x: number; z: number };
/** Initial resident references/role/seed belong to construction; position belongs to path following. */
export interface Resident {
  home: P2;
  homeId: string;
  daytimeId: string;
  marketId: string;
  squareId: string;
  role: "student" | "worker";
  seed: number;
}
export interface Citizen extends Resident, NavigationAgent {
  id: string;
  pos: P2;
  behavior: BehaviorState;
  binding: BehaviorBinding;
}

export const ResidentFields = {
  home: {
    unit: "model units",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  homeId: {
    unit: "building ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  daytimeId: {
    unit: "building ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  marketId: {
    unit: "market ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  squareId: {
    unit: "building ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  role: {
    unit: "resident role",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  seed: {
    unit: "dimensionless",
    role: "configuration",
    writer: "construction",
    timing: "construction",
    range: [0, 1],
  },
} satisfies Record<string, FieldContract>;
