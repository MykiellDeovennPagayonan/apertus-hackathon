import { scienceCommand } from "../../domains/science";
import { scienceSpecs } from "../../domains/science/specs";
import type { PublicDefinition } from "../../runtime/authoring/types";
export interface CompositionRequirements {
  topic: string;
  guidance?: string;
  instanceNoun?: string;
  selectionKey: string;
  commands: string[];
  observations: string[];
  appearance?: string;
  dependencies?: string[];
  minimumInstances?: number;
}
const scienceTopics: Record<string, string> = {
  cell: "Cell division and mitosis",
  immune: "Immune defense and antigen-specific memory",
  genome: "Genetics and inheritance",
  pollination: "Pollination",
  invasive: "Spread and removal of invasive species",
  earth: "Earth layers and mantle convection",
  plates: "Plate boundaries and tectonics",
  volcano: "Volcano eruptions: effusive and explosive",
  water: "Water cycle and watershed runoff",
};
export const compositionRequirements: Record<string, CompositionRequirements> =
  {
    ...Object.fromEntries(
      scienceSpecs.map((spec) => [
        `prefabs/science/${spec.name}`,
        {
          topic: scienceTopics[spec.kind],
          selectionKey: spec.slug,
          guidance: `${spec.question} ${spec.invitation} ${spec.assumptions.join(" ")} Add a stage action, supported condition controls, attached scene, and separate observations.`,
          commands: [
            scienceCommand(spec.kind, "STEP"),
            ...(spec.kind === "immune"
              ? [scienceCommand(spec.kind, "EXPOSE")]
              : spec.kind === "invasive"
                ? [
                    scienceCommand(spec.kind, "INTRODUCE"),
                    scienceCommand(spec.kind, "REMOVE"),
                  ]
                : []),
            ...spec.settings
              .filter((f) => !f.advanced)
              .slice(0, 2)
              .map((f) =>
                scienceCommand(spec.kind, `SET_${f.key.toUpperCase()}`),
              ),
          ],
          observations: ["summary", "explanation", "inspection"],
          appearance: `appearance/science-${spec.kind}`,
        },
      ]),
    ),
    "prefabs/physical-systems/Pendulum": {
      topic: "Pendulum simulation",
      guidance:
        "Explore how length changes swing time at a fixed starting angle, then try larger starting angles up to 90°. Nonlinear period increases with amplitude; T≈2π√(L/g) is only the small-angle limit. Compare successive settings on the same pendulum. The drawing uses a fixed metre scale; changing length must visibly change the rod length.",
      selectionKey: "pendulum",
      commands: ["PEND_SET_LENGTH", "PEND_SET_AMPLITUDE", "PHYS_PLAY"],
      observations: ["period"],
      appearance: "appearance/physical-pendulum",
    },
    "prefabs/dynamic-systems/RingTraffic": {
      topic: "Traffic jam simulation",
      guidance:
        "Compare an undisturbed run and a braking run after reset with the same settings. Headway changes following behavior; congestion depends on density and parameters. Braking is a temporary disturbance, not an accident.",
      selectionKey: "traffic",
      commands: ["TRAFFIC_BRAKE", "TRAFFIC_SET_HEADWAY", "TRAFFIC_SET_PLAYING"],
      observations: ["averageSpeed"],
      appearance: "appearance/dynamic-traffic",
    },
    "prefabs/physical-systems/ResistiveCircuit": {
      topic: "Circuit bulbs in series and parallel",
      selectionKey: "circuit",
      commands: ["CIRC_SET_BULBS", "CIRC_SET_TOPOLOGY"],
      observations: ["bulbPower"],
      appearance: "appearance/physical-circuit",
    },
    "models/EclipseGeometry": {
      topic: "Solar and lunar eclipse geometry",
      selectionKey: "eclipse",
      commands: ["set:moonAngle", "set:moonOffset", "set:moonDistance"],
      observations: ["event"],
      appearance: "appearance/EclipseGeometry",
    },
    "models/SinusoidalSignal": {
      topic: "Sound pressure signal",
      instanceNoun: "Signal",
      selectionKey: "signal",
      commands: ["set:phase", "set:amplitude", "set:frequency"],
      observations: [],
      minimumInstances: 2,
      dependencies: ["data/SignalSuperposition"],
    },
    "data/SignalSuperposition": {
      topic: "Noise cancelling headphones",
      selectionKey: "headphones",
      commands: [],
      observations: ["residualPeak"],
      appearance: "appearance/SignalSuperposition",
      dependencies: ["models/SinusoidalSignal"],
    },
  };
export function applyExplorationTeaching(
  definitions: Map<string, PublicDefinition>,
) {
  for (const [id, requirements] of Object.entries(compositionRequirements)) {
    const d = definitions.get(id);
    if (!d) throw new Error(`Missing exploration model ${id}`);
    for (const command of requirements.commands)
      if (!d.commands[command])
        throw new Error(`Missing exploration command ${id}.${command}`);
    for (const output of requirements.observations)
      if (!d.outputs[output])
        throw new Error(`Missing exploration output ${id}.${output}`);
    if (requirements.appearance && !definitions.has(requirements.appearance))
      throw new Error(`Missing exploration appearance ${id}`);
  }
}
