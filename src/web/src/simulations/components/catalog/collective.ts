import {
  collectiveKinds,
  collectiveModels,
  command,
} from "../../domains/collective";
import type { PublicDefinition } from "../../runtime/authoring/types";
import { object } from "../../runtime/parameterSchema";
import { base } from "./generic";
export const collectiveDefinitions: PublicDefinition[] =
  collectiveKinds.flatMap((kind, i) => {
    const m = collectiveModels[i];
    return ["action", "choice", "caption"]
      .filter((role) => kind !== "crowd" || role !== "choice")
      .map((role) => ({
        ...base(
          `${role === "caption" ? "displays" : "controls"}/collective-${kind}-${role}`,
          `${m.name} ${role}`,
          role === "caption" ? "displays" : "controls",
          object({}),
          {},
        ),
        description:
          role === "action"
            ? `One contextual primary action for ${m.name}. Run/pause/restart and reduced-motion completion, without a toolbar.`
            : role === "choice"
              ? `One essential choice for ${m.name}: ${kind === "fishing" ? "catch arrangement" : kind === "voting" ? "voting rule" : "habitat"}.`
              : `One short explanation from accepted ${m.name} state. No dashboard.`,
        tags: [...(m.tags ?? []), "collective"],
        inputs: {
          value: { kind: "value" as const, unit: `collective/${kind}` },
        },
        outputs:
          role === "caption"
            ? {}
            : Object.fromEntries(
                Object.entries(m.actions)
                  .filter(([id]) =>
                    role === "action"
                      ? (!id.includes("_SET_") &&
                          id !== command(kind, "STEP")) ||
                        (kind === "crowd" &&
                          id === command(kind, "SET_placement"))
                      : id ===
                        command(
                          kind,
                          `SET_${kind === "fishing" ? "arrangement" : kind === "voting" ? "rule" : "habitat"}`,
                        ),
                  )
                  .map(([id, action]) => [
                    id,
                    {
                      kind: "event" as const,
                      unit: "",
                      schema: action.arguments,
                    },
                  ]),
              ),
      }));
  });
