import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import { boolean, num, object } from "../../../registry/contracts/parameterSchema";
import { base } from "../../../registry/definitions/shared";

function model(
  id: string,
  title: string,
  configuration: PublicDefinition["configuration"],
  defaults: Record<string, unknown>,
  tags: string[],
  assumptions: string[],
): PublicDefinition {
  const properties =
    configuration.type === "object" ? configuration.properties : {};
  return {
    ...base(id, title, "models", configuration, defaults),
    tags,
    assumptions,
    placement: ["logic"],
    runtimeProvider: id,
    presentationProvider: undefined,
    lifecycle: {
      authored: Object.keys(defaults),
      presentation: [],
      clock: false,
      reset: "authored",
      capture: true,
    },
    commands: {
      ...Object.fromEntries(
        Object.entries(properties).map(([key, schema]) => [
          `set:${key}`,
          {
            arguments: object({ value: schema }),
            description: `Set ${key}`,
            timing: "live" as const,
            submission: "continuous" as const,
          },
        ]),
      ),
      RESET: {
        arguments: object({}),
        description: "Restore authored settings",
        timing: "rebuild",
      },
    },
  };
}
const signal = model(
  "models/SinusoidalSignal",
  "Sinusoidal sound signal",
  object({
    amplitude: num(0, 2, "Pa"),
    frequency: num(20, 500, "Hz"),
    phase: num(0, 360, "deg"),
    duration: num(0.004, 0.02, "s"),
  }),
  { amplitude: 1, frequency: 200, phase: 0, duration: 0.02 },
  [
    "sound",
    "sound waves",
    "noise cancelling headphones",
    "interference",
    "signal",
    "phase",
    "amplitude",
  ],
  [
    "Ideal sinusoidal pressure at one point. Visual experiment only; no headphone feedback, spatial acoustics or audio output.",
  ],
);
signal.description =
  "One independently configurable sound signal. For interference insert two sources and connect their points to data/SignalSuperposition first and second. Equal frequency/amplitude and 180 degree phase difference cancel.";
signal.outputs = {
  points: { kind: "dataset", unit: "signal/pressure", crossScope: true },
};
const superposition: PublicDefinition = {
  ...base(
    "data/SignalSuperposition",
    "Sound wave superposition",
    "models",
    object({}),
    {},
  ),
  description:
    "Add two sampled sound pressure signals on a matching time grid; inspect source curves, sum, residual peak and RMS. Needs TWO signal sources, not one.",
  tags: [...signal.tags],
  placement: ["logic"],
  runtimeProvider: "data/SignalSuperposition",
  presentationProvider: undefined,
  inputs: {
    first: { kind: "dataset", unit: "signal/pressure" },
    second: { kind: "dataset", unit: "signal/pressure" },
  },
  outputs: {
    points: { kind: "dataset", unit: "Pa", crossScope: true },
    residualPeak: { kind: "value", unit: "Pa" },
    residualRms: { kind: "value", unit: "Pa" },
    appearance: {
      kind: "attachment",
      unit: "data/SignalSuperposition",
      cardinality: "many",
    },
  },
  lifecycle: {
    authored: [],
    presentation: [],
    clock: false,
    reset: "authored",
    capture: false,
  },
  assumptions: signal.assumptions,
};
const eclipse = model(
  "models/EclipseGeometry",
  "Solar and lunar eclipse geometry",
  object({
    moonAngle: num(0, 360, "deg"),
    moonOffset: num(-120, 120, "diagram units"),
    moonDistance: num(70, 140, "diagram units"),
  }),
  { moonAngle: 180, moonOffset: 0, moonDistance: 100 },
  [
    "eclipse",
    "eclipses",
    "solar",
    "lunar",
    "moon",
    "sun",
    "earth",
    "alignment",
    "shadow",
  ],
  [
    "Scaled planar educational geometry, not orbital prediction or a map of visibility. Sun/Earth remain fixed; move the Moon with angle, offset and distance controls.",
    "Finite source shadow cones distinguish umbra and penumbra. Solar alignment is not a claim of a total eclipse at every point on Earth.",
  ],
);
eclipse.description =
  "Move the Moon around a fixed Sun and Earth using angle (180 degrees solar, 0 lunar), vertical offset and distance. Observe finite-radius shadow alignment and event classification.";
eclipse.outputs = {
  geometry: { kind: "value", unit: "eclipse/geometry" },
  event: {
    kind: "value",
    unit: "",
    schema: { type: "string", maxLength: 160 },
  },
  appearance: { kind: "attachment", unit: eclipse.id, cardinality: "many" },
};
function appearance(target: PublicDefinition, id: string): PublicDefinition {
  return {
    ...base(id, `${target.title} appearance`, "appearance", object({}), {}),
    description: `Display attached ${target.title}; connect appearance output to model input.`,
    tags: [...target.tags],
    inputs: { model: { kind: "attachment", unit: target.id } },
    assumptions: target.assumptions,
    lifecycle: {
      authored: [],
      presentation: [],
      clock: false,
      reset: "authored",
      capture: false,
    },
  };
}
const spring = model(
  "models/SpringMass",
  "Spring and mass",
  object({
    mass: num(0.2, 5, "kg"),
    stiffness: num(1, 100, "N/m"),
    damping: num(0, 10, "N s/m"),
    amplitude: num(0.05, 0.5, "m"),
    playing: boolean,
  }),
  { mass: 1, stiffness: 20, damping: 0.3, amplitude: 0.3, playing: false },
  [
    "spring",
    "springs",
    "spring mass",
    "stiffness",
    "damping",
    "bouncing",
    "harmonic oscillator",
    "oscillation",
  ],
  [
    "Ideal linear spring with viscous damping on a horizontal frictionless track; displacement is measured from equilibrium. No nonlinear deformation or real spring stress prediction.",
  ],
);
spring.description =
  "Explore how a stronger spring changes bouncing. At fixed mass, higher stiffness increases frequency; damping reduces motion. Attach appearance/SpringMass and add a stiffness slider plus RELEASE button. Keep the initial experiment simple.";
spring.lifecycle.clock = true;
spring.commands.RELEASE = {
  arguments: object({}),
  description: "Release the mass",
  timing: "live",
};
spring.outputs = {
  displacement: { kind: "value", unit: "m" },
  frequency: { kind: "value", unit: "Hz" },
  appearance: { kind: "attachment", unit: spring.id, cardinality: "many" },
};
export const explorationDefinitions = [
  spring,
  appearance(spring, "appearance/SpringMass"),
  signal,
  superposition,
  eclipse,
  appearance(superposition, "appearance/SignalSuperposition"),
  appearance(eclipse, "appearance/EclipseGeometry"),
];
