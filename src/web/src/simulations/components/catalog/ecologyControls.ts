import type { PublicDefinition } from "../../runtime/authoring/types";
import { choice, num, object } from "../../runtime/parameterSchema";
import { foodWebSpecies } from "../systems/ecology/foodWebSpecies";
import { base } from "./generic";
export const ecologyControlDefinitions: PublicDefinition[] = [
  {
    ...base("controls/FoodWebPopulation", "Food-web exploration", "controls"),
    tags: ["ecology", "food-web", "population"],
    description:
      "Choose a connected organism and change its population independently; restore one organism or the whole authored web.",
    inputs: { value: { kind: "value", unit: "1", optional: true } },
    outputs: {
      SELECT: {
        kind: "event",
        unit: "",
        schema: object({ value: num(0, foodWebSpecies.length - 1, "1", true) }),
      },
      CHANGE: {
        kind: "event",
        unit: "",
        schema: object({
          value: object({
            species: choice(...foodWebSpecies.map((s) => s.id)),
            value: num(0, 150, "index", true),
          }),
        }),
      },
      RESET: { kind: "event", unit: "", schema: object({}) },
    },
  },
];
