import type { FieldContract } from "../../runtime/definition";
/** Construction handler owns topology; supported span scales 1/2 and panel counts 5/8. */
export interface TrussSettings {
  spanScale: number;
  dense: boolean;
  topologyRevision: number;
}

export const TrussSettingsFields = {
  spanScale: {
    unit: "span multiplier",
    role: "configuration",
    writer: "construction handler",
    timing: "rebuild",
    range: [1, 2],
  },
  dense: {
    unit: "boolean",
    role: "configuration",
    writer: "construction handler",
    timing: "rebuild",
  },
  topologyRevision: {
    unit: "revision",
    role: "state",
    writer: "construction handler",
    timing: "rebuild",
  },
} satisfies Record<string, FieldContract>;
