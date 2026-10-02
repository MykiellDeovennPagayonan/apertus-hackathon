import type { FieldContract } from "../../runtime/definition";
import type { P2 } from "./Resident";
/** Navigation owns route/target/task; path following owns progress, heading and status. Speed: model units/s. */
export interface NavigationAgent {
  speed: number;
  path: P2[];
  progress: number; // waypoint index; PathFollowingSystem owns normal advancement
  destination?: P2;
  heading: number;
  status: "traveling" | "arrived" | "no-route";
  taskId: number;
  arrivedTaskId?: number;
}

export const NavigationAgentFields = {
  speed: {
    unit: "model units/second",
    role: "configuration",
    writer: "construction",
    timing: "construction",
    range: [3, 5],
  },
  path: {
    unit: "model coordinates",
    role: "state",
    writer: "NavigationSystem",
    timing: "model-step",
  },
  progress: {
    unit: "waypoint index",
    role: "state",
    writer: "PathFollowingSystem",
    timing: "model-step",
  },
  destination: {
    unit: "model coordinates",
    role: "state",
    writer: "NavigationSystem",
    timing: "live",
  },
  heading: {
    unit: "radians",
    role: "state",
    writer: "PathFollowingSystem",
    timing: "model-step",
  },
  status: {
    unit: "route outcome",
    role: "output",
    writer: "NavigationSystem (no-route); PathFollowingSystem (arrival)",
    timing: "model-step",
  },
  taskId: {
    unit: "request identity",
    role: "state",
    writer: "NavigationSystem",
    timing: "live",
  },
  arrivedTaskId: {
    unit: "request identity",
    role: "output",
    writer: "PathFollowingSystem",
    timing: "model-step",
  },
} satisfies Record<string, FieldContract>;
