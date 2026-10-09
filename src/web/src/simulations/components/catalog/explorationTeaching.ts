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
export const compositionRequirements: Record<string, CompositionRequirements> =
  {
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
