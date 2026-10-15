import { scienceModels } from "../../../domains/science";
import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import { choice, object } from "../../../registry/contracts/parameterSchema";
import { base } from "../../../registry/definitions/shared";
export const scienceDefinitions: PublicDefinition[] = [
  ...scienceModels.map((m) => ({
    ...base(
      `controls/${m.presentation}`,
      `${m.name} exploration`,
      "controls",
      object(
        {
          panel: choice("conditions", "playback"),
          fields: {
            type: "array",
            items: choice(
              ...Object.keys(m.defaults.settings as Record<string, number>),
            ),
            minItems: 1,
            maxItems: 10,
          },
        },
        ["fields"],
      ),
      { panel: "conditions" },
    ),
    description: `Bounded, connected settings and playback for ${m.name}. Independently editable from its scene and observations.`,
    tags: ["science", "exploration"],
    inputs: { value: { kind: "value" as const, unit: "1", optional: true } },
    outputs: Object.fromEntries([
      ...Object.entries(m.actions).map(([id, a]) => [
        id,
        { kind: "event" as const, unit: "", schema: a.arguments },
      ]),
      ["RESET", { kind: "event" as const, unit: "", schema: object({}) }],
    ]),
  })),
  {
    ...base(
      "displays/ScienceObservations",
      "Science observations",
      "displays",
      object({ panel: choice("observations", "inspection", "comparison") }),
      { panel: "observations" },
    ),
    description:
      "Choose a short state explanation, selected-object inspection with a keyboard selector, or retained baseline comparison. Inspection requires a SELECT command connection.",
    inputs: { value: { kind: "value", unit: "1", optional: true } },
    outputs: {
      SELECT: {
        kind: "event",
        unit: "",
        schema: object({
          value: { type: "integer", minimum: 0, maximum: 29, unit: "1" },
        }),
      },
    },
    tags: ["science", "inspection", "comparison"],
  },
];
