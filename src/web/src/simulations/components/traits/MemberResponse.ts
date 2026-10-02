import type { FieldContract } from "../../runtime/definition";
/** Response-system output; score is dimensionless, never stress in physical units. */
export interface MemberResponse {
  score: number;
  classification: "compression" | "tension";
  model: "heuristic-bridge-v1";
}

export const MemberResponseFields = {
  score: {
    unit: "dimensionless",
    role: "output",
    writer: "HeuristicBridgeResponseSystem",
    timing: "live",
    range: [0, 1],
  },
  classification: {
    unit: "heuristic class",
    role: "output",
    writer: "HeuristicBridgeResponseSystem",
    timing: "live",
  },
  model: {
    unit: "fidelity ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
} satisfies Record<string, FieldContract>;
