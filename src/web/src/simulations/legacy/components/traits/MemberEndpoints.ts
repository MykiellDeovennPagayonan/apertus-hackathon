import type { FieldContract } from "../../runtime/definition";
export interface Joint {
  id: string;
  x: number; // 0..1 along span
  y: number; // 0 = deck, -1 = top chord (normalized)
}

export interface Member {
  id: string;
  a: string; // joint id
  b: string;
  present: boolean; // topology/removal handler owns this state
  kind: "deck" | "top" | "vertical" | "diagonal";
}

/** Topology handler owns endpoint references; presence is the runtime removal selection. */
export type MemberEndpoints = Member;

export const MemberEndpointsFields = {
  a: {
    unit: "joint ID",
    role: "configuration",
    writer: "topology handler",
    timing: "rebuild",
  },
  b: {
    unit: "joint ID",
    role: "configuration",
    writer: "topology handler",
    timing: "rebuild",
  },
  kind: {
    unit: "member kind",
    role: "configuration",
    writer: "topology handler",
    timing: "rebuild",
  },
  present: {
    unit: "boolean",
    role: "state",
    writer: "removal handler",
    timing: "live",
  },
} satisfies Record<string, FieldContract>;
