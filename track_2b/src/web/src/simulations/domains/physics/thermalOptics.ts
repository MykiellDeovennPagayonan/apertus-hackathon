import * as capacitor from "../../legacy/components/systems/physics/capacitor";
import * as conduction from "../../legacy/components/systems/physics/conduction";
import {
  coolingDefaults,
  coolingMeasure,
  coolingParameters,
  coolingState,
} from "../../legacy/components/systems/physics/cooling";
import * as doppler from "../../legacy/components/systems/physics/doppler";
import * as fibre from "../../legacy/components/systems/physics/fibre";
import * as induction from "../../legacy/components/systems/physics/induction";
import * as latent from "../../legacy/components/systems/physics/latent";
import * as lens from "../../legacy/components/systems/physics/lens";
import * as string from "../../legacy/components/systems/physics/string";
import * as turning from "../../legacy/components/systems/physics/turning";
import type {
  DomainContribution,
  DomainModel,
} from "../../registry/contracts/domainContribution";
import {
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../registry/contracts/parameterSchema";

export const coolingModel: DomainModel = {
  ref: "prefabs/physics/Cooling",
  version: 1,
  name: "Cooling a hot drink",
  description:
    "Compare a hot drink cooling in warm and cold rooms. The bigger temperature difference makes cooling faster.",
  tags: [
    "hot drink",
    "cooling",
    "warm room",
    "cold room",
    "coffee",
    "tea",
    "Newton cooling",
  ],
  assumptions: [
    "Well-mixed drink, constant ambient temperature and positive effective cooling coefficient. No freezing, boiling, evaporation, changing airflow or separate cup temperature.",
  ],
  parameters:
    coolingParameters.type === "object"
      ? object(
          coolingParameters.properties,
          Object.keys(coolingParameters.properties),
        )
      : coolingParameters,
  defaults: coolingDefaults,
  presentation: "physics-cooling",
  maximumInstances: 3,
  requiredObservations: [],
  creationDefaults: {
    structure: "comparison",
    objects: [
      { label: "Cold room · 20°C", parameters: { ambient: 20 } },
      { label: "Warm room · 30°C", parameters: { ambient: 30 } },
    ],
    explanation:
      "Identical drinks begin at 80°C. The colder room cools its drink faster.",
  },
  outputs: {
    temperature: { unit: "°C", description: "Drink temperature" },
    rate: { unit: "°C/min", description: "Signed warming or cooling rate" },
  },
  actions: {
    PT_COOLING_TIME: {
      arguments: object({ value: num(0, 240, "min") }),
      description: "Minutes elapsed",
      timing: "live",
      target: "instance",
    },
    PT_COOLING_AMBIENT: {
      arguments: object({ value: num(0, 50, "°C") }),
      description: "Room temperature",
      timing: "live",
      target: "instance",
    },
  },
  dependencies: {
    resources: [],
    traits: [],
    behaviors: [],
    systems: [],
    visuals: [],
    views: ["AssemblyScene"],
    controls: [],
    prefabs: [],
    compositions: [],
  },
  initialize: coolingState,
  configuration: (s) => ({ ...s }),
  apply: (state, action, value) => {
    const contract = coolingModel.actions[action];
    if (!contract) throw new Error("Unsupported cooling action");
    validateValue(contract.arguments, { value });
    return coolingState({
      ...state,
      [action === "PT_COOLING_TIME" ? "time" : "ambient"]: value,
    });
  },
  measure: (s) => coolingMeasure(coolingState(s)),
};

export interface PhysicsControl {
  field: string;
  command: string;
  label: string;
  type: "Slider" | "Button" | "Select";
  step?: number;
}
interface PhysicsSpec {
  key: string;
  ref: string;
  name: string;
  question: string;
  tags: string[];
  assumptions: string;
  parameters: ParameterSchema;
  defaults: Record<string, unknown>;
  initialize: DomainModel["initialize"];
  measure: DomainModel["measure"];
  outputs: Record<string, string>;
  controls: PhysicsControl[];
  apply?: DomainModel["apply"];
  objects?: { label: string; parameters: Record<string, unknown> }[];
}
const control = (
  key: string,
  field: string,
  label: string,
  type: PhysicsControl["type"] = "Slider",
  step = 1,
): PhysicsControl => ({
  field,
  label,
  type,
  step,
  command: `PT_${key.toUpperCase()}_${field.toUpperCase()}`,
});
export const thermalOpticsSpecs: PhysicsSpec[] = [
  {
    key: "capacitor",
    ref: "prefabs/physics/Capacitor",
    name: "Charging and discharging",
    question:
      "Why does a capacitor supply energy briefly through a connected load?",
    tags: [
      "capacitor",
      "charging",
      "discharging",
      "battery disconnected",
      "RC circuit",
    ],
    assumptions:
      "Ideal resistor-capacitor circuit with charge/isolate/discharge switch. Resistance Ω, capacitance F, time seconds. Isolation has no leakage; switching preserves voltage. No nonlinear LEDs or dielectric breakdown.",
    parameters: capacitor.capacitorParameters,
    defaults: capacitor.capacitorDefaults,
    initialize: capacitor.capacitorState,
    measure: (s) => capacitor.capacitorMeasure(capacitor.capacitorState(s)),
    outputs: {
      voltage: "V",
      current: "A",
      charge: "C",
      energy: "J",
      timeConstant: "s",
    },
    controls: [
      control("capacitor", "mode", "Circuit connection", "Select"),
      control("capacitor", "advance", "Advance one second", "Button"),
      control("capacitor", "restart", "Start uncharged", "Button"),
    ],
    apply: (s, action, value) => {
      const state = capacitor.capacitorState(s);
      if (action === "PT_CAPACITOR_ADVANCE")
        return capacitor.capacitorAdvance(state, 1);
      if (action === "PT_CAPACITOR_RESTART")
        return capacitor.capacitorState({
          ...state,
          voltage: 0,
          time: 0,
          mode: "charge",
        });
      return capacitor.capacitorState({ ...state, mode: value });
    },
  },
  {
    key: "lens",
    ref: "prefabs/physics/Lens",
    name: "Magnifying glass images",
    question: "When does a converging lens make an upright enlarged image?",
    tags: [
      "magnifying glass",
      "magnifying lens",
      "converging lens",
      "upright",
      "inverted",
      "image",
      "magnification",
      "upside down",
      "lens focusing",
      "image formation",
    ],
    assumptions:
      "Paraxial converging thin lens; all lengths cm. Negative image distance is virtual, dashed backward ray extensions. At object distance equal to focal length no finite image; no screen there. Excludes angular size, aberrations and lens thickness.",
    parameters: lens.lensParameters,
    defaults: lens.lensDefaults,
    initialize: lens.lensState,
    measure: (s) => lens.lensMeasure(lens.lensState(s)),
    outputs: {
      imageDistance: "cm",
      magnification: "1",
      imageHeight: "cm",
      kind: "1",
    },
    controls: [
      control("lens", "distance", "Object distance", "Slider", 1),
      control("lens", "focal", "Focal length", "Slider", 1),
    ],
  },
  {
    key: "fibre",
    ref: "prefabs/physics/Fibre",
    name: "Light in a fibre",
    question: "Which entry angles keep light confined in a straight fibre?",
    tags: [
      "fibre optic cable",
      "fiber optics",
      "light leaking",
      "total internal reflection",
    ],
    assumptions:
      "Straight planar lossless core/cladding with refractive indices. External entry angle measured from entry-face normal; internal boundary incidence from its normal. Snell entry/refraction and unpolarized Fresnel reflected intensity. No bend losses, absorption, modes or dispersion.",
    parameters: fibre.fibreParameters,
    defaults: fibre.fibreDefaults,
    initialize: fibre.fibreState,
    measure: (s) => fibre.fibreMeasure(fibre.fibreState(s)),
    outputs: {
      direction: "deg",
      incidence: "deg",
      critical: "deg",
      confined: "1",
      transmittedAngle: "deg",
      reflectance: "1",
    },
    controls: [
      control("fibre", "entry", "Entry angle from normal", "Slider", 1),
      control("fibre", "cladding", "Cladding index", "Slider", 0.01),
    ],
  },
  {
    key: "doppler",
    ref: "prefabs/physics/Doppler",
    name: "Passing ambulance siren",
    question: "Why does a passing siren change pitch?",
    tags: ["ambulance", "siren", "pitch", "Doppler effect", "passing sound"],
    assumptions:
      "Subsonic straight moving source in still uniform medium, stationary roadside listener. Received frequency computed at retarded emission time, not source position at reception. Collinear coincidence undefined. Representative sparse wavefronts are illustrative, not one circle per audio cycle. No actual audio or shock waves.",
    parameters: doppler.dopplerParameters,
    defaults: doppler.dopplerDefaults,
    initialize: doppler.dopplerState,
    measure: (s) => doppler.dopplerMeasure(doppler.dopplerState(s)),
    outputs: {
      received: "Hz",
      radialVelocity: "m/s",
      emissionTime: "s",
      sourceX: "m",
    },
    controls: [
      control(
        "doppler",
        "time",
        "Seconds relative to closest pass",
        "Slider",
        0.1,
      ),
      control("doppler", "speed", "Ambulance speed", "Slider", 1),
    ],
  },
  {
    key: "string",
    ref: "prefabs/physics/String",
    name: "Guitar string modes",
    question: "How does a shorter vibrating string raise the note?",
    tags: ["guitar", "fret", "string", "standing waves", "harmonic", "note"],
    assumptions:
      "Ideal string fixed at both ends with constant tension and linear mass density. Physical frequency n*sqrt(tension/density)/(2length). Phase control shows one slowed wave cycle and is not elapsed physical time. No audio, stiffness, fret-induced tension change or pluck transient.",
    parameters: string.stringParameters,
    defaults: string.stringDefaults,
    initialize: string.stringState,
    measure: (s) => string.stringMeasure(string.stringState(s)),
    outputs: { waveSpeed: "m/s", fundamental: "Hz", frequency: "Hz" },
    controls: [
      control("string", "length", "Vibrating length", "Slider", 0.005),
      control("string", "phase", "Explore one wave cycle", "Slider", 0.05),
      control("string", "harmonic", "Harmonic", "Select"),
    ],
  },
  {
    key: "turning",
    ref: "prefabs/physics/Turning",
    name: "Speed and sharp turns",
    question: "Why does doubling speed require four times the turning force?",
    tags: [
      "bike",
      "sharp turn",
      "going fast",
      "circular motion",
      "centripetal force",
      "grip",
    ],
    assumptions:
      "Steady level requested circle; inward force m*v²/r, friction ceiling μmg, balanced lean atan(v²/(rg)). Static traction feasibility only: no animated skid trajectory, banking, braking or tyre dynamics.",
    parameters: turning.turningParameters,
    defaults: turning.turningDefaults,
    initialize: turning.turningState,
    measure: (s) => turning.turningMeasure(turning.turningState(s)),
    outputs: {
      acceleration: "m/s²",
      requiredForce: "N",
      availableForce: "N",
      limit: "m/s",
      lean: "deg",
      feasible: "1",
    },
    controls: [
      control("turning", "speed", "Bike speed", "Slider", 0.1),
      control("turning", "radius", "Turn radius", "Slider", 1),
    ],
  },
  {
    key: "latent",
    ref: "prefabs/physics/LatentHeat",
    name: "Heating ice and water",
    question: "Where does energy go while ice melts at constant temperature?",
    tags: [
      "ice",
      "melting",
      "stop getting warmer",
      "heating",
      "boiling",
      "latent heat",
    ],
    assumptions:
      "Pure water at about1atm, constant properties: ice2100J/kg/K, liquid4186, vapour2010, fusion334kJ/kg, vaporization2256kJ/kg. Total enthalpy includes initial sensible heat and all phase transitions. Temperatures limited to200°C; reject heating beyond the constant-property range. Retained mass, externally maintained pressure, no escaping steam/open-container model or heat loss.",
    parameters: latent.latentParameters,
    defaults: latent.latentDefaults,
    initialize: latent.latentState,
    measure: (s) => latent.latentMeasure(latent.latentState(s)),
    outputs: {
      temperature: "°C",
      solid: "1",
      liquid: "1",
      vapour: "1",
      addedEnergy: "J",
      enthalpy: "J",
    },
    controls: [
      control("latent", "time", "Heating time", "Slider", 10),
      control("latent", "power", "Heater power", "Slider", 10),
    ],
  },
  {
    key: "induction",
    ref: "prefabs/physics/Induction",
    name: "Moving magnet and coil",
    question: "Why does changing magnetic flux produce voltage?",
    tags: [
      "moving magnet",
      "generate electricity",
      "coil",
      "electromagnetic induction",
      "Faraday",
      "Lenz",
    ],
    assumptions:
      "Prescribed externally driven magnet path with per-turn teaching flux polarity*peakFlux*exp(-x²/(2width²)); emf=−N*dphi/dx*speed. Negligible self-inductance, resistive loop current=emf/R and dissipation=emf²/R. External work supplies electrical energy. No detailed bar-magnet solver or back-force dynamics.",
    parameters: induction.inductionParameters,
    defaults: induction.inductionDefaults,
    initialize: induction.inductionState,
    measure: (s) => induction.inductionMeasure(induction.inductionState(s)),
    outputs: {
      flux: "Wb",
      fluxRate: "Wb/s",
      emf: "V",
      current: "A",
      dissipation: "W",
    },
    controls: [
      control("induction", "position", "Magnet position", "Slider", 0.01),
      control("induction", "speed", "Signed magnet speed", "Slider", 0.01),
      control("induction", "advance", "Move magnet 0.1 second", "Button"),
    ],
    apply: (s, action, value) =>
      action === "PT_INDUCTION_ADVANCE"
        ? induction.inductionAdvance(induction.inductionState(s))
        : induction.inductionState({
            ...s,
            [action === "PT_INDUCTION_POSITION" ? "position" : "speed"]: value,
          }),
  },
  {
    key: "conduction",
    ref: "prefabs/physics/Conduction",
    name: "Heat through a spoon",
    question: "Why does heat reach a metal handle sooner than a wooden one?",
    tags: [
      "metal spoon",
      "metal",
      "wooden",
      "handles",
      "heat spreading",
      "wooden spoon",
      "hot soup",
      "heat conduction",
      "conductivity",
      "thermal diffusivity",
    ],
    assumptions:
      "Uniform one-dimensional cell-centred rod: alpha=k/(rho*cp). Bath held constant at one end; far end and sides insulated. Explicit finite-volume fluxes with Fourier number≤.2; reject over200000 steps. Comparison holds rho*cp and geometry equal to isolate conductivity1/100W/m/K; teaching approximations, not actual utensil property presets. No side heat losses.",
    parameters: conduction.conductionParameters,
    defaults: conduction.conductionDefaults,
    initialize: conduction.conductionState,
    measure: (s) => conduction.conductionMeasure(conduction.conductionState(s)),
    outputs: {
      temperatures: "°C",
      diffusivity: "m²/s",
      handle: "°C",
      mean: "°C",
      energyChange: "J",
      heatInput: "W",
    },
    controls: [control("conduction", "time", "Warming time", "Slider", 30)],
    objects: [
      {
        label: "Low conductivity · 1 W/(m·K)",
        parameters: { conductivity: 1 },
      },
      {
        label: "High conductivity · 100 W/(m·K)",
        parameters: { conductivity: 100 },
      },
    ],
  },
];
export const thermalOpticsModels: DomainModel[] = thermalOpticsSpecs.map(
  (spec) => {
    if (spec.parameters.type !== "object")
      throw new Error("Expected physics object schema");
    const properties = spec.parameters.properties;
    const model: DomainModel = {
      ref: spec.ref,
      version: 1,
      name: spec.name,
      description: spec.question,
      tags: spec.tags,
      assumptions: [spec.assumptions],
      parameters: object(properties, Object.keys(properties)),
      defaults: spec.defaults,
      presentation: `physics-${spec.key}`,
      maximumInstances: 3,
      requiredObservations: [],
      dependencies: coolingModel.dependencies,
      outputs: Object.fromEntries(
        Object.entries(spec.outputs).map(([key, unit]) => [
          key,
          { unit, description: key },
        ]),
      ),
      actions: Object.fromEntries(
        spec.controls.map((c) => [
          c.command,
          {
            arguments: object(
              c.type === "Button" ? {} : { value: properties[c.field] },
            ),
            description: c.label,
            timing: "live" as const,
            target: "instance" as const,
          },
        ]),
      ),
      initialize: spec.initialize,
      measure: spec.measure,
      configuration: (s) => ({ ...s }),
      apply: (state, action, value) => {
        const c = spec.controls.find((c) => c.command === action);
        if (!c) throw new Error("Unsupported physics action");
        validateValue(
          model.actions[action].arguments,
          c.type === "Button" && value === undefined ? {} : { value },
        );
        if (spec.apply) return spec.apply(state, action, value);
        return spec.initialize({ ...state, [c.field]: value });
      },
      ...(spec.objects
        ? {
            creationDefaults: {
              structure: "comparison" as const,
              objects: spec.objects,
              explanation: spec.question,
            },
          }
        : {}),
    };
    return model;
  },
);
export const thermalOptics: DomainContribution = {
  namespace: "physics-thermal-optics",
  version: 1,
  models: [coolingModel, ...thermalOpticsModels],
};
export const thermalOpticsPresentations = Object.fromEntries(
  thermalOptics.models.map((m) => [m.presentation, true]),
);
