import { cycleKinds, cycleModels } from "../../../domains/biogeochemistry";
import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import { object } from "../../../registry/contracts/parameterSchema";
import { cycleCommand } from "../systems/biogeochemistry/contracts";
import { base } from "../../../registry/definitions/shared";
export const cycleDefinitions: PublicDefinition[] = cycleKinds.flatMap(
  (kind, i) => {
    const model = cycleModels[i];
    return ["Action", "Activity", "Caption"].map((role) => ({
      ...base(
        `${role === "Caption" ? "displays" : "controls"}/cycle-${kind}-${role.toLowerCase()}`,
        `${model.name} ${role.toLowerCase()}`,
        role === "Caption" ? "displays" : "controls",
        object({}),
        {},
      ),
      description:
        role === "Action"
          ? `One contextual next action for ${model.name}; independently editable from scene and explanation. No playback toolbar.`
          : role === "Activity"
            ? `Choose one named ${model.name} investigation at a time. Focused scenario choice, cancel, and safe restart; no dashboard.`
            : `One short ${model.name} explanation derived from accepted state; no diagnostic metrics.`,
      tags: [kind, `${kind} cycle`, "biogeochemistry"],
      inputs: { value: { kind: "value" as const, unit: `cycle/${kind}` } },
      outputs:
        role === "Caption"
          ? {}
          : Object.fromEntries(
              (role === "Action" ? ["ADVANCE", "RESTART"] : ["ACTIVITY"]).map(
                (action) => {
                  const key = cycleCommand(kind, action);
                  return [
                    key,
                    {
                      kind: "event" as const,
                      unit: "",
                      schema: model.actions[key].arguments,
                    },
                  ];
                },
              ),
            ),
    }));
  },
);
