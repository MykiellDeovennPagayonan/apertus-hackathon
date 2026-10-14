import { choice, num, object } from "../contracts/parameterSchema";
import { scheduledTripSchema } from "../../legacy/components/behaviors/ScheduledTrip";
import type { ComponentDefinition } from "../contracts/objects/ComponentDefinition";
import { numericProperty } from "../contracts/objects/numericField";
import { base, position } from "../contracts/objects/objectFields";
import { observePerson } from "../../legacy/components/systems/TownObservationSystem";

const personSchema = object({
  ...base,
  kind: choice("person"),
  x: position,
  z: position,
  spawnAt: num(0, 23.99),
  speed: num(0.1, 10),
  schedule: {
    type: "array",
    minItems: 0,
    maxItems: 24,
    items: scheduledTripSchema,
  },
});
export const PersonDefinition: ComponentDefinition<"person"> = {
  id: "prefabs/AuthoredPerson",
  kind: "person",
  label: "Person",
  description: "A person with a spawn point, spawn time and walking speed.",
  space: "town",
  schema: personSchema,
  properties: {
    speed: numericProperty(personSchema, "speed", "Walking speed", 0.1),
  },
  outputContracts: {
    status: { label: "Activity", type: "text", unit: "" },
    position: { label: "Position", type: "point", unit: "" },
  },
  observe: observePerson,
  create: (id) => ({
    id,
    label: "Person",
    kind: "person",
    color: "#b75d45",
    x: -8,
    z: 0,
    spawnAt: 0,
    speed: 2,
    schedule: [],
  }),
  presentation: [],
  state: [],
  visual: "CitizenVisual3D",
  view: "AuthoredTownView",
};
