import type { PublicDefinition } from "../../runtime/authoring/types";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
} from "../../runtime/parameterSchema";
import {
  activityContracts,
  legacyActivities,
} from "../controls/controlContract";
import type { base } from "./generic";

const event = {
  submit: { kind: "event" as const, unit: "", cardinality: "many" as const },
};
export function basicControlDefinitions(
  make: typeof base,
  text: ParameterSchema,
): PublicDefinition[] {
  return ["NumberInput", "Slider", "Toggle", "Select", "Button", "Form"].map(
    (name) => {
      const numeric = name === "Slider" || name === "NumberInput";
      const scalar = numeric || name === "Toggle" || name === "Select";
      return {
        ...make(
          `controls/${name}`,
          name === "NumberInput"
            ? "Number input"
            : name === "Button"
              ? "Action button"
              : name === "Form"
                ? "Control group"
                : name,
          "controls",
          object(
            {
              label: text,
              mode: choice("submit", "immediate"),
              initial: text,
              ...(scalar ? { parameter: text } : {}),
              ...(numeric
                ? {
                    min: num(-1e12, 1e12),
                    max: num(-1e12, 1e12),
                    step: num(0.000000001, 1e12),
                  }
                : {}),
              ...(name === "Slider" ? { showNumber: boolean } : {}),
              ...(name === "Form"
                ? {
                    fields: {
                      type: "array" as const,
                      minItems: 0,
                      maxItems: 64,
                      items: object({
                        parameter: text,
                        label: text,
                        widget: choice(
                          "NumberInput",
                          "Slider",
                          "Toggle",
                          "Select",
                          "Field",
                        ),
                      }),
                    },
                  }
                : {}),
            },
            ["parameter", "min", "max", "step", "showNumber", "fields"],
          ),
          {
            label:
              name === "NumberInput"
                ? "Number input"
                : name === "Form"
                  ? "Control group"
                  : name,
            mode: scalar ? "immediate" : "submit",
            initial: "{}",
          },
        ),
        outputs: event,
      };
    },
  );
}
export function activityControlDefinitions(
  make: typeof base,
  text: ParameterSchema,
): PublicDefinition[] {
  const canonical = Object.entries(activityContracts).map(
    ([name, contract]): PublicDefinition => ({
      ...make(
        `controls/${name}`,
        contract.title,
        "controls",
        object({ label: text }),
        { label: contract.title },
      ),
      description: `A preset panel for ${contract.model.split("/")[1]} with activity-specific inputs and validation.`,
      discovery: {
        kind: "preset",
        group: "composites",
        summary: `Activity preset: ${contract.title.toLowerCase()}.`,
        placement: "Connect to its matching activity model",
      },
      outputs: event,
    }),
  );
  // Existing saved documents retain their identities and can still be opened.
  const legacy = [...Object.keys(legacyActivities), "ExplorationTask"].map(
    (name) => ({
      ...make(
        `controls/${name}`,
        name.replace(/([a-z])([A-Z])/g, "$1 $2"),
        "controls",
        object({
          label: text,
          mode: choice("submit", "immediate"),
          initial: text,
        }),
        { label: name, mode: "submit", initial: "{}" },
      ),
      outputs: event,
    }),
  );
  return [...canonical, ...legacy];
}
