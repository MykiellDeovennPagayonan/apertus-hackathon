import {
  createCircuit,
  createPendulum,
  createTrack,
} from "../../components/prefabs/physical-systems/objects";
import { physicalDefaults } from "../../components/resources/physical-systems/defaults";
import {
  advance,
  circuitApply,
  circuitMeasure,
  pendulumApply,
  pendulumMeasure,
  trackApply,
  trackMeasure,
} from "../../components/systems/physical-systems/models";
import type {
  CircuitState,
  PendulumParameters,
  PendulumState,
  TrackParameters,
  TrackState,
} from "../../components/traits/physical-systems/state";
import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
} from "../../runtime/parameterSchema";

const action = (
  field: ParameterSchema | undefined,
  description: string,
  timing: "live" | "relaunch" | "rebuild" = "live",
) => ({
  arguments: object(field ? { value: field } : {}),
  description,
  timing,
  target: "instance" as const,
});
const playbackActions = {
  PHYS_PLAY: action(
    boolean,
    "Play or pause this physical instance on the shared simulation clock",
  ),
  PHYS_RESTART: action(
    undefined,
    "Restart this instance from time zero with its current settings",
    "relaunch",
  ),
  PHYS_STEP: action(
    undefined,
    "Advance a paused physical instance by 0.1 simulation seconds",
  ),
};
function dependencies(name: string, system: string) {
  return {
    resources: ["physical-systems/EducationalDefaults"],
    traits: [`physical-systems/${name}State`],
    behaviors: [],
    systems: [`physical-systems/${system}`],
    visuals: [`physical-systems/${name}Visual`],
    views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
    controls: ["physical-systems/PhysicalControls"],
    prefabs: [`physical-systems/${name}`],
    compositions: [],
  };
}
const output = (unit: string, description: string) => ({ unit, description });
/** Registry-derived educational assembly hints; not phrases or complete responses. */
export const physicalCreationDefaults = {
  "prefabs/physical-systems/Pendulum": {
    structure: "comparison",
    objects: [
      { label: "First swing", parameters: { length: 1 } },
      { label: "Second swing", parameters: { length: 2 } },
    ],
    explanation:
      "Two simultaneous swings isolate the effect of length at shared gravity and amplitude.",
  },
  "prefabs/physical-systems/RollingTrack": {
    structure: "comparison",
    objects: [
      { label: "Smooth floor", parameters: { resistance: 0.05 } },
      { label: "Rough floor", parameters: { resistance: 0.1 } },
    ],
    explanation:
      "Two simultaneous tracks isolate surface resistance at shared launch height and gravity.",
  },
} as const;

export const pendulumModel: DomainModel = {
  ref: "prefabs/physical-systems/Pendulum",
  version: 1,
  name: "Compare pendulum lengths",
  creationDefaults:
    physicalCreationDefaults["prefabs/physical-systems/Pendulum"],
  presentation: "physical-pendulum",
  maximumInstances: 4,
  description:
    "Independent nonlinear ideal pendulum with length and starting-angle exploration (0–90°). Period increases with length and with large starting angles; T≈2π√(L/g) is the small-angle limit. For a longer-swing question assemble two pendulums of lengths 1 m and 2 m, both at 5 degrees and shared gravity 9.81 m/s². Compare independent instances, not snapshots.",
  assumptions: [
    "Ideal rigid-rod pendulum released at rest, starting angle 0–90°. No friction or air resistance.",
    "Nonlinear motion solves θ″=−(g/L)sinθ using the elliptic time coordinate. The calculated period is 4√(L/g)K(sin(amplitude/2)); motion is independent of frame rate. Changing length, gravity or starting angle restarts the run.",
    "Comparisons use shared gravity and initial amplitude. Length is the independent variable.",
  ],
  parameters: object(
    {
      length: num(0.1, 20, "m"),
      gravity: num(0.1, 30, "m/s²"),
      amplitude: num(0, 90, "deg"),
      playing: boolean,
    },
    ["length", "gravity", "amplitude", "playing"],
  ),
  defaults: { ...physicalDefaults.pendulum },
  requiredObservations: ["period", "angle", "elapsed"],
  graphOutput: "points",
  outputs: {
    period: output(
      "s",
      "Calculated time for a full oscillation; approaches 2π√(L/g) at small angles",
    ),
    angle: output("deg", "Angle from vertical"),
    elapsed: output("s", "Simulation time"),
    cycles: output("1", "Completed oscillations"),
    lastPeriod: output(
      "s",
      "Completed period, unavailable before the first cycle",
    ),
    x: output("m", "Bob horizontal position"),
    y: output("m", "Bob vertical position relative to pivot"),
    points: output(
      "deg",
      "Sampled angle curve over up to two periods or 12 s, x in seconds, y in degrees",
    ),
  },
  actions: {
    ...playbackActions,
    PEND_SET_LENGTH: action(
      num(0.1, 20, "m"),
      "Set the swing's absolute string or rod length in metres, from 0.1 to 20 inclusive. For a multiple of another swing, calculate the new length from that other swing. Zero or negative length is unsupported: return unsupported, never an edit with value 0. Preserve gravity and amplitude; restart from maximum angle.",
      "relaunch",
    ),
    PEND_SET_GRAVITY: action(
      num(0.1, 30, "m/s²"),
      "Set gravity; comparison commands must apply the same value to all pendulums",
      "relaunch",
    ),
    PEND_SET_AMPLITUDE: action(
      num(0, 90, "deg"),
      "Set starting angle from 0 to 90 degrees and release from rest",
      "relaunch",
    ),
  },
  dependencies: dependencies("Pendulum", "SmallAnglePendulumSystem"),
  initialize: (p) => ({
    ...createPendulum(p as unknown as PendulumParameters),
  }),
  configuration: (s) => ({
    length: s.length,
    gravity: s.gravity,
    amplitude: s.amplitude,
    playing: s.playing,
  }),
  apply: (s, a, v) => ({
    ...pendulumApply(s as unknown as PendulumState, a, v),
  }),
  measure: (s) => pendulumMeasure(s as unknown as PendulumState),
  step: (s, delta) => ({ ...advance(s as unknown as PendulumState, delta) }),
};
export const trackModel: DomainModel = {
  ref: "prefabs/physical-systems/RollingTrack",
  version: 1,
  name: "Smooth and rough floors",
  creationDefaults:
    physicalCreationDefaults["prefabs/physical-systems/RollingTrack"],
  presentation: "physical-track",
  maximumInstances: 4,
  description:
    "Independent ramp launch onto a horizontal rolling-resistance track. For smooth-versus-rough questions assemble two tracks at height 0.5 m and gravity 9.81 m/s², with resistance 0.05 and 0.10. v²=2gh, a=μg, stopping distance=h/μ. Zero resistance never stops.",
  assumptions: [
    "Simplified point-mass energy model. Ignore wheel rotation, ramp losses and air resistance.",
    "The clock starts at ramp exit with v=√(2gh). Horizontal deceleration is μg, an effective rolling-resistance approximation.",
    "Zero resistance gives no finite stopping distance or time. Trails represent travelled distance and reset with the run.",
  ],
  parameters: object(
    {
      height: num(0.01, 5, "m"),
      resistance: num(0, 1, "1"),
      gravity: num(0.1, 30, "m/s²"),
      playing: boolean,
    },
    ["height", "resistance", "gravity", "playing"],
  ),
  defaults: { ...physicalDefaults.track },
  requiredObservations: ["entrySpeed", "stoppingDistance", "distance", "speed"],
  outputs: {
    entrySpeed: output("m/s", "Speed at ramp exit"),
    deceleration: output("m/s²", "Horizontal deceleration μg"),
    stopTime: output("s", "Predicted stopping time"),
    stoppingDistance: output("m", "Predicted stopping distance h/μ"),
    distance: output("m", "Travelled distance"),
    speed: output("m/s", "Current speed"),
    elapsed: output("s", "Simulation time since ramp exit"),
    stopped: output("1", "Has the car stopped?"),
    points: output("m", "Current travelled trail, x in metres, y=0"),
  },
  actions: {
    ...playbackActions,
    ROLL_SET_HEIGHT: action(
      num(0.01, 5, "m"),
      "Set launch height and restart at ramp exit",
      "relaunch",
    ),
    ROLL_SET_RESISTANCE: action(
      num(0, 1, "1"),
      "Set the ABSOLUTE dimensionless floor roughness / rolling-resistance coefficient μ, from 0 to 1 inclusive. Doubling a current coefficient of 0.10 means value 0.20, NEVER value 2. Alternatively ROLL_SCALE_RESISTANCE accepts factor 2. Negative coefficients are unsupported: return unsupported rather than an edit. Preserve gravity and launch height; restart the run.",
      "relaunch",
    ),
    ROLL_SET_GRAVITY: action(
      num(0.1, 30, "m/s²"),
      "Set gravity; comparisons use the same value on all tracks",
      "relaunch",
    ),
    ROLL_SCALE_RESISTANCE: action(
      num(0, 10, "1"),
      "Multiply this floor's current roughness / rolling resistance by the supplied factor. A doubled roughness uses factor 2; the system calculates μ_new=factor×μ_current, preserving gravity and launch height. Reject if the resulting coefficient exceeds 1. Restart the run.",
      "relaunch",
    ),
  },
  dependencies: dependencies("RollingTrack", "RollingResistanceSystem"),
  initialize: (p) => ({ ...createTrack(p as unknown as TrackParameters) }),
  configuration: (s) => ({
    height: s.height,
    resistance: s.resistance,
    gravity: s.gravity,
    playing: s.playing,
  }),
  apply: (s, a, v) => ({ ...trackApply(s as unknown as TrackState, a, v) }),
  measure: (s) => trackMeasure(s as unknown as TrackState),
  step: (s, delta) => ({ ...advance(s as unknown as TrackState, delta) }),
};
export const circuitModel: DomainModel = {
  ref: "prefabs/physical-systems/ResistiveCircuit",
  version: 1,
  name: "Bulbs in a circuit",
  presentation: "physical-circuit",
  maximumInstances: 2,
  description:
    "Reusable ideal voltage source connected to 1–8 identical resistor-like bulbs using validated typed series or parallel wiring. Begin with one 12 Ω bulb and a 6 V source. Add bulb components, switch supported topology, observe each bulb's current and power and total current.",
  assumptions: [
    "Ideal constant-voltage battery and constant-resistance bulbs; Ohm's law. This approximation does not model real filament heating.",
    "Brightness illustrates electrical power using one shared scale; it does not calculate current.",
    "Only identical-bulb series and parallel topologies are supported. Zero resistance, short circuits and arbitrary wiring are rejected.",
  ],
  parameters: object(
    {
      voltage: num(0, 24, "V"),
      resistance: num(0.1, 1000, "Ω"),
      bulbs: num(1, 8, "1", true),
      topology: choice("series", "parallel"),
    },
    ["voltage", "resistance", "bulbs", "topology"],
  ),
  defaults: { ...physicalDefaults.circuit },
  requiredObservations: ["totalCurrent", "bulbPower", "bulbReadings"],
  outputs: {
    totalCurrent: output("A", "Total battery current"),
    equivalentResistance: output("Ω", "Equivalent circuit resistance"),
    bulbVoltage: output("V", "Voltage across each identical bulb"),
    bulbCurrent: output("A", "Current through each identical bulb"),
    bulbPower: output("W", "Power in each bulb"),
    totalPower: output("W", "Total power supplied"),
    bulbReadings: output(
      "1",
      "Individual bulb IDs and voltage (V), current (A), power (W)",
    ),
  },
  actions: {
    CIRC_ADD_BULB: action(
      undefined,
      "Add one more bulb without specifying a final count, up to eight. PARAMETERLESS: arguments must be {}, with NO value field. If a final count is named (for example a second bulb), use CIRC_SET_BULBS with absolute count 2 instead. Valid in series and parallel; preserves topology, voltage and per-bulb resistance.",
      "rebuild",
    ),
    CIRC_SET_BULBS: action(
      num(1, 8, "1", true),
      "Set the ABSOLUTE final number of identical bulbs, an integer from 1 to 8. Adding a second bulb means value 2; adding a third means value 3. Preserve battery voltage and per-bulb resistance. This action preserves existing topology; changing series/parallel requires CIRC_SET_TOPOLOGY too when different from current topology.",
      "rebuild",
    ),
    CIRC_SET_TOPOLOGY: action(
      choice("series", "parallel"),
      "Connect the existing bulbs in supported series or parallel topology",
      "rebuild",
    ),
    CIRC_SET_VOLTAGE: action(num(0, 24, "V"), "Set ideal battery voltage"),
    CIRC_SET_RESISTANCE: action(
      num(0.1, 1000, "Ω"),
      "Set resistance of every identical bulb in ohms, from 0.1 to 1000 inclusive. Zero or negative resistance would short the source and is unsupported: return unsupported, never an edit with value 0. Preserve bulb count, topology and battery voltage.",
    ),
  },
  dependencies: dependencies("ResistiveCircuit", "OhmicCircuitSystem"),
  initialize: (p) => ({ ...createCircuit(p as unknown as CircuitState) }),
  configuration: (s) => ({
    voltage: s.voltage,
    resistance: s.resistance,
    bulbs: s.bulbs,
    topology: s.topology,
  }),
  apply: (s, a, v) => ({ ...circuitApply(s as unknown as CircuitState, a, v) }),
  measure: (s) => circuitMeasure(s as unknown as CircuitState),
};
export const physicalSystems: DomainContribution = {
  namespace: "physical-systems",
  version: 1,
  models: [pendulumModel, trackModel, circuitModel],
  validateInstances: validatePhysicalComparison,
};

/** Integration calls this during staged assembly and after a staged edit batch. */
export function validatePhysicalComparison(
  instances: readonly {
    provider: string;
    parameters: Record<string, unknown>;
  }[],
) {
  for (const [provider, fields] of [
    [pendulumModel.ref, ["gravity", "amplitude"]],
    [trackModel.ref, ["gravity", "height"]],
  ] as const) {
    const group = instances.filter(
      (instance) => instance.provider === provider,
    );
    for (const field of fields) {
      if (
        group.some(
          (instance) =>
            instance.parameters[field] !== group[0].parameters[field],
        )
      )
        throw new Error(`Physical comparison requires shared ${field}`);
    }
  }
}
