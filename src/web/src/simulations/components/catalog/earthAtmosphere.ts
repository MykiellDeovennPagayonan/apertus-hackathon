import {
  command,
  earthKinds,
  earthModels,
  extraActions,
  questions,
} from "../../domains/earth-atmosphere";
import type { PublicDefinition } from "../../runtime/authoring/types";
import { object } from "../../runtime/parameterSchema";
import { base } from "./generic";
export const earthDefinitions: PublicDefinition[] = earthKinds.flatMap(
  (kind, i) => {
    const m = earthModels[i];
    return ["action", "caption"].map((role) => ({
      ...base(
        `${role === "caption" ? "displays" : "controls"}/earth-atmosphere-${kind}-${role}`,
        `${m.name} ${role}`,
        role === "caption" ? "displays" : "controls",
        object({}),
        {},
      ),
      description:
        role === "caption"
          ? `One timely explanation of accepted state. ${questions[kind]}`
          : `One contextual primary action, then relevant investigations. No toolbar. ${questions[kind]}`,
      tags: m.tags ?? [],
      inputs: {
        value: { kind: "value" as const, unit: `earth-atmosphere/${kind}` },
      },
      outputs:
        role === "caption"
          ? {}
          : Object.fromEntries(
              Object.entries(m.actions).map(([id, a]) => [
                id,
                { kind: "event" as const, unit: "", schema: a.arguments },
              ]),
            ),
    }));
  },
);
const selectionDescriptions = {
  earthquake:
    "Ground shaking during earthquakes: tectonic stress and fault slip release seismic waves.",
  tsunami:
    "Tsunamis: seabed movement displaces water and long waves travel toward a coast.",
  atmosphere:
    "Atmospheric layers and stratospheric ozone: altitude, layers of air and ultraviolet absorption.",
  greenhouse:
    "Greenhouse effect: greenhouse gases absorb and emit infrared, warming Earth.",
  lightning:
    "Lightning formation: storm-cloud ice collisions separate charges before an electrical discharge.",
  rainbow:
    "Rainbow formation: sunlight refracts, reflects and disperses in raindrops toward an observer.",
  weather:
    "Clouds and rain in weather: rising moist air cools and condenses.",
};
export const earthRequirements = Object.fromEntries(
  earthKinds.map((kind, i) => [
    earthModels[i].ref,
    {
      topic: selectionDescriptions[kind],
      selectionKey: kind,
      selectionGroup: "earth-atmosphere",
      guidance: `${questions[kind]} Build ONE model, its attached appearance, controls/earth-atmosphere-${kind}-action, and displays/earth-atmosphere-${kind}-caption. Wire scene to both independent pieces and ALL action event outputs to matching model commands. One short caption, no generic observations/sliders/playback panels. Preserve defaults for omitted conditions. ${earthModels[i].assumptions.join(" ")}`,
      commands: [
        command(kind, "ADVANCE"),
        command(kind, "RUN"),
        command(kind, "PAUSE"),
        command(kind, "RESTART"),
        ...extraActions[kind].map((op) => command(kind, op)),
        ...Object.keys(earthModels[i].defaults).map((key) =>
          command(kind, `SET_${key}`),
        ),
      ],
      observations: ["scene"],
      appearance: `appearance/earth-atmosphere-${kind}`,
      dependencies: [
        `controls/earth-atmosphere-${kind}-action`,
        `displays/earth-atmosphere-${kind}-caption`,
      ],
    },
  ]),
);
