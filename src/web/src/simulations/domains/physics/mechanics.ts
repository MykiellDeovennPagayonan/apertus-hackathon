import {
  buoyancyDefaults,
  buoyancyMeasure,
  buoyancyParameters,
  buoyancyState,
} from "../../components/systems/physics/buoyancy";
import {
  collisionDefaults,
  collisionMeasure,
  collisionParameters,
  collisionState,
} from "../../components/systems/physics/collision";
import {
  flowDefaults,
  flowMeasure,
  flowParameters,
  flowState,
} from "../../components/systems/physics/flow";
import {
  gearsDefaults,
  gearsMeasure,
  gearsParameters,
  gearsState,
} from "../../components/systems/physics/gears";
import {
  hydraulicsDefaults,
  hydraulicsMeasure,
  hydraulicsParameters,
  hydraulicsState,
} from "../../components/systems/physics/hydraulics";
import {
  parachuteAdvance,
  parachuteDefaults,
  parachuteMeasure,
  parachuteParameters,
  parachuteState,
} from "../../components/systems/physics/parachute";
import {
  pressureDefaults,
  pressureMeasure,
  pressureParameters,
  pressureState,
} from "../../components/systems/physics/pressure";
import {
  pulleyDefaults,
  pulleyMeasure,
  pulleyParameters,
  pulleyState,
} from "../../components/systems/physics/pulley";
import {
  tippingDefaults,
  tippingMeasure,
  tippingParameters,
  tippingState,
} from "../../components/systems/physics/tipping";
import type { DomainModel } from "../../runtime/contribution";
import { object, validateValue } from "../../runtime/parameterSchema";

const dependencies = {
  resources: [],
  traits: [],
  behaviors: [],
  systems: [],
  visuals: [],
  views: ["AssemblyScene"],
  controls: [],
  prefabs: [],
  compositions: [],
};

if (pulleyParameters.type !== "object")
  throw new Error("Expected object schema");
export const pulleyModel: DomainModel = {
  ref: "prefabs/physics/Pulley",
  version: 1,
  name: "Supporting rope strands",
  description:
    "Does less pulling force mean more rope travel? Validated fixed (1), single movable (2), and two-moving-wheel tackle (4) routings. One continuous rope, vertical supporting strands, massless frictionless pulleys; quasi-static, no acceleration or angled strands.",
  tags: [
    "pulley",
    "pulleys",
    "lifting",
    "rope",
    "strands",
    "supporting rope strands",
    "does less pulling force mean more rope travel?",
  ],
  assumptions: [
    "Validated fixed (1), single movable (2), and two-moving-wheel tackle (4) routings. One continuous rope, vertical supporting strands, massless frictionless pulleys; quasi-static, no acceleration or angled strands.",
  ],
  parameters: pulleyParameters,
  defaults: pulleyDefaults,
  presentation: "physics-pulley",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      tension: "N",
      rise: "m",
      inputWork: "J",
      outputWork: "J",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    PULLEY_STRANDS: {
      arguments: object({ value: pulleyParameters.properties.strands }),
      description: "Supporting strands",
      timing: "live",
      target: "instance",
    },
    PULLEY_PULL: {
      arguments: object({ value: pulleyParameters.properties.pull }),
      description: "Rope pulled",
      timing: "live",
      target: "instance",
    },
  },
  initialize: pulleyState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = pulleyModel.actions[command];
    if (!action) throw new Error("Unsupported pulley action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = pulleyState(state);
    if (command === "PULLEY_STRANDS")
      return pulleyState({ ...s, strands: value });
    if (command === "PULLEY_PULL") return pulleyState({ ...s, pull: value });
    throw new Error("Unsupported pulley action");
  },
  measure: (s) => pulleyMeasure(pulleyState(s)),
};
if (gearsParameters.type !== "object")
  throw new Error("Expected object schema");
export const gearsModel: DomainModel = {
  ref: "prefabs/physics/BicycleGears",
  version: 1,
  name: "Bicycle chain drive",
  description:
    "Why does a lower gear give less distance per pedal turn? Ideal uncrossed no-slip chain: both sprockets rotate in the same direction. Tooth counts set speed ratio; torque ratio is reciprocal. No direct-mesh gears, tyre slip, drivetrain losses or shift dynamics.",
  tags: [
    "gears",
    "gear",
    "bike",
    "cycling",
    "pedal",
    "wheel",
    "sprocket",
    "bicycle chain drive",
    "why does a lower gear give less distance per pedal turn?",
  ],
  assumptions: [
    "Ideal uncrossed no-slip chain: both sprockets rotate in the same direction. Tooth counts set speed ratio; torque ratio is reciprocal. No direct-mesh gears, tyre slip, drivetrain losses or shift dynamics.",
  ],
  parameters: gearsParameters,
  defaults: gearsDefaults,
  presentation: "physics-gears",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      ratio: "1",
      torqueRatio: "1",
      wheelTorque: "N·m",
      wheelTurns: "turns",
      distancePerTurn: "m",
      distance: "m",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    GEARS_REAR: {
      arguments: object({ value: gearsParameters.properties.rear }),
      description: "Rear sprocket teeth",
      timing: "live",
      target: "instance",
    },
    GEARS_FRONT: {
      arguments: object({ value: gearsParameters.properties.front }),
      description: "Front chainring teeth",
      timing: "live",
      target: "instance",
    },
    GEARS_TURNS: {
      arguments: object({}),
      description: "Turn pedals / start again",
      timing: "live",
      target: "instance",
    },
  },
  initialize: gearsState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = gearsModel.actions[command];
    if (!action) throw new Error("Unsupported gears action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = gearsState(state);
    if (command === "GEARS_REAR") return gearsState({ ...s, rear: value });
    if (command === "GEARS_FRONT") return gearsState({ ...s, front: value });
    if (command === "GEARS_TURNS")
      return gearsState({ ...s, turns: s.turns >= 10 ? 0 : s.turns + 0.25 });
    throw new Error("Unsupported gears action");
  },
  measure: (s) => gearsMeasure(gearsState(s)),
};
if (tippingParameters.type !== "object")
  throw new Error("Expected object schema");
export const tippingModel: DomainModel = {
  ref: "prefabs/physics/Tipping",
  version: 1,
  name: "Cabinet stability",
  description:
    "When does the centre of mass move beyond the supporting edge? Rigid uniform centred cabinet and a centred movable load. Quasi-static clockwise tilt about the right lower edge, sufficient friction to prevent sliding. Height alone does not cause spontaneous tipping; no furniture safety prediction.",
  tags: [
    "tipping",
    "cabinet stability",
    "when does the centre of mass move beyond the supporting edge?",
  ],
  assumptions: [
    "Rigid uniform centred cabinet and a centred movable load. Quasi-static clockwise tilt about the right lower edge, sufficient friction to prevent sliding. Height alone does not cause spontaneous tipping; no furniture safety prediction.",
  ],
  parameters: tippingParameters,
  defaults: tippingDefaults,
  presentation: "physics-tipping",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      centreHeight: "m",
      criticalAngle: "deg",
      gravityX: "m",
      restoringTorque: "N·m",
      tipped: "1",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    TIPPING_TILT: {
      arguments: object({ value: tippingParameters.properties.tilt }),
      description: "Tilt cabinet",
      timing: "live",
      target: "instance",
    },
    TIPPING_LOADHEIGHT: {
      arguments: object({ value: tippingParameters.properties.loadHeight }),
      description: "Load shelf height",
      timing: "live",
      target: "instance",
    },
    TIPPING_HEIGHT: {
      arguments: object({ value: tippingParameters.properties.height }),
      description: "Cabinet height",
      timing: "live",
      target: "instance",
    },
  },
  initialize: tippingState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = tippingModel.actions[command];
    if (!action) throw new Error("Unsupported tipping action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = tippingState(state);
    if (command === "TIPPING_TILT") return tippingState({ ...s, tilt: value });
    if (command === "TIPPING_LOADHEIGHT")
      return tippingState({ ...s, loadHeight: value });
    if (command === "TIPPING_HEIGHT")
      return tippingState({ ...s, height: value });
    throw new Error("Unsupported tipping action");
  },
  measure: (s) => tippingMeasure(tippingState(s)),
};
if (collisionParameters.type !== "object")
  throw new Error("Expected object schema");
export const collisionModel: DomainModel = {
  ref: "prefabs/physics/Collision",
  version: 1,
  name: "Two-cart collision",
  description:
    "Where does the motion energy go when carts stick together? Isolated frictionless one-dimensional instantaneous collision. Left cart collides only when its velocity exceeds the right cart velocity. Restitution 0 means sticking and 1 elastic. Kinetic energy transferred into internal energy is not destroyed; no deformation or external impulse.",
  tags: [
    "collision",
    "cart",
    "carts",
    "momentum",
    "velocities",
    "speeds",
    "two-cart collision",
    "where does the motion energy go when carts stick together?",
  ],
  assumptions: [
    "Isolated frictionless one-dimensional instantaneous collision. Left cart collides only when its velocity exceeds the right cart velocity. Restitution 0 means sticking and 1 elastic. Kinetic energy transferred into internal energy is not destroyed; no deformation or external impulse.",
  ],
  parameters: collisionParameters,
  defaults: collisionDefaults,
  presentation: "physics-collision",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      approaching: "1",
      velocity1: "m/s",
      velocity2: "m/s",
      momentum: "kg·m/s",
      finalMomentum: "kg·m/s",
      initialEnergy: "J",
      kineticEnergy: "J",
      internalEnergy: "J",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    COLLISION_SPEED1: {
      arguments: object({ value: collisionParameters.properties.speed1 }),
      description: "Left cart starting speed",
      timing: "live",
      target: "instance",
    },
    COLLISION_SPEED2: {
      arguments: object({ value: collisionParameters.properties.speed2 }),
      description: "Right cart starting speed",
      timing: "live",
      target: "instance",
    },
    COLLISION_COLLIDED: {
      arguments: object({}),
      description: "Collide / return to start",
      timing: "live",
      target: "instance",
    },
  },
  initialize: collisionState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = collisionModel.actions[command];
    if (!action) throw new Error("Unsupported collision action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = collisionState(state);
    if (command === "COLLISION_SPEED1")
      return collisionState({ ...s, speed1: value, collided: false });
    if (command === "COLLISION_SPEED2")
      return collisionState({ ...s, speed2: value, collided: false });
    if (command === "COLLISION_COLLIDED")
      return collisionState({ ...s, collided: !s.collided });
    throw new Error("Unsupported collision action");
  },
  measure: (s) => collisionMeasure(collisionState(s)),
};
if (buoyancyParameters.type !== "object")
  throw new Error("Expected object schema");
export const buoyancyModel: DomainModel = {
  ref: "prefabs/physics/Buoyancy",
  version: 1,
  name: "Steel hull and block",
  description:
    "Why can the same steel float as a watertight hollow hull? Quasi-static still-water equilibrium for a sealed box hull and a solid block made from the same material mass and volume. Flooded interior excludes no water, so only material volume provides buoyancy. At full submersion equality is neutral equilibrium. No waves, surface tension or ship engineering.",
  tags: [
    "buoyancy",
    "steel",
    "ship",
    "float",
    "sinks",
    "hull",
    "cargo",
    "boat",
    "steel hull and block",
    "why can the same steel float as a watertight hollow hull?",
  ],
  assumptions: [
    "Quasi-static still-water equilibrium for a sealed box hull and a solid block made from the same material mass and volume. Flooded interior excludes no water, so only material volume provides buoyancy. At full submersion equality is neutral equilibrium. No waves, surface tension or ship engineering.",
  ],
  parameters: buoyancyParameters,
  defaults: buoyancyDefaults,
  presentation: "physics-buoyancy",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      requiredVolume: "m³",
      displacedVolume: "m³",
      availableVolume: "m³",
      weight: "N",
      buoyantForce: "N",
      floats: "1",
      draft: "m",
      solidFloats: "1",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    BUOYANCY_CARGO: {
      arguments: object({ value: buoyancyParameters.properties.cargo }),
      description: "Cargo added",
      timing: "live",
      target: "instance",
    },
    BUOYANCY_FLOODED: {
      arguments: object({}),
      description: "Flood / seal the hull",
      timing: "live",
      target: "instance",
    },
  },
  initialize: buoyancyState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = buoyancyModel.actions[command];
    if (!action) throw new Error("Unsupported buoyancy action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = buoyancyState(state);
    if (command === "BUOYANCY_CARGO")
      return buoyancyState({ ...s, cargo: value });
    if (command === "BUOYANCY_FLOODED")
      return buoyancyState({ ...s, flooded: !s.flooded });
    throw new Error("Unsupported buoyancy action");
  },
  measure: (s) => buoyancyMeasure(buoyancyState(s)),
};
if (pressureParameters.type !== "object")
  throw new Error("Expected object schema");
export const pressureModel: DomainModel = {
  ref: "prefabs/physics/WaterPressure",
  version: 1,
  name: "Bottle outlet",
  description:
    "Does a faster outlet always send water farther? Constant water-surface height maintained externally; ideal small horizontal outlet to air. Depth below water determines pressure/speed; height above floor determines fall time. No draining tank, contraction, viscosity or jet breakup.",
  tags: [
    "pressure",
    "bottle",
    "hole",
    "water tank",
    "jet",
    "depth",
    "outlet",
    "bottle outlet",
    "does a faster outlet always send water farther?",
  ],
  assumptions: [
    "Constant water-surface height maintained externally; ideal small horizontal outlet to air. Depth below water determines pressure/speed; height above floor determines fall time. No draining tank, contraction, viscosity or jet breakup.",
  ],
  parameters: pressureParameters,
  defaults: pressureDefaults,
  presentation: "physics-pressure",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      depth: "m",
      gaugePressure: "Pa",
      speed: "m/s",
      flightTime: "s",
      range: "m",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    PRESSURE_HOLEHEIGHT: {
      arguments: object({ value: pressureParameters.properties.holeHeight }),
      description: "Hole height above floor",
      timing: "live",
      target: "instance",
    },
  },
  initialize: pressureState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = pressureModel.actions[command];
    if (!action) throw new Error("Unsupported pressure action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = pressureState(state);
    if (command === "PRESSURE_HOLEHEIGHT")
      return pressureState({ ...s, holeHeight: value });
    throw new Error("Unsupported pressure action");
  },
  measure: (s) => pressureMeasure(pressureState(s)),
};
if (hydraulicsParameters.type !== "object")
  throw new Error("Expected object schema");
export const hydraulicsModel: DomainModel = {
  ref: "prefabs/physics/HydraulicLift",
  version: 1,
  name: "Two-piston hydraulic lift",
  description:
    "How does a larger output piston trade force for travel? Equal hydraulic head, massless frictionless pistons and incompressible fluid. Available force is a ceiling; a slow stroke uses exactly the balancing force. Below threshold both pistons remain fixed. Work is calculated using balancing load force, not the unused force ceiling. No pump/check-valve mechanism, leaks or acceleration.",
  tags: [
    "hydraulics",
    "hydraulic",
    "piston",
    "pistons",
    "piston areas",
    "lift",
    "two-piston hydraulic lift",
    "how does a larger output piston trade force for travel?",
  ],
  assumptions: [
    "Equal hydraulic head, massless frictionless pistons and incompressible fluid. Available force is a ceiling; a slow stroke uses exactly the balancing force. Below threshold both pistons remain fixed. Work is calculated using balancing load force, not the unused force ceiling. No pump/check-valve mechanism, leaks or acceleration.",
  ],
  parameters: hydraulicsParameters,
  defaults: hydraulicsDefaults,
  presentation: "physics-hydraulics",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      pressureChange: "Pa",
      outputForce: "N",
      requiredInputForce: "N",
      canLift: "1",
      inputTravel: "m",
      outputTravel: "m",
      displacedVolume: "m³",
      inputWork: "J",
      outputWork: "J",
      loadWork: "J",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    HYDRAULICS_OUTPUTAREA: {
      arguments: object({ value: hydraulicsParameters.properties.outputArea }),
      description: "Output piston area",
      timing: "live",
      target: "instance",
    },
    HYDRAULICS_INPUTFORCE: {
      arguments: object({ value: hydraulicsParameters.properties.inputForce }),
      description: "Available input force",
      timing: "live",
      target: "instance",
    },
    HYDRAULICS_STROKE: {
      arguments: object({ value: hydraulicsParameters.properties.stroke }),
      description: "Requested input stroke",
      timing: "live",
      target: "instance",
    },
  },
  initialize: hydraulicsState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = hydraulicsModel.actions[command];
    if (!action) throw new Error("Unsupported hydraulics action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = hydraulicsState(state);
    if (command === "HYDRAULICS_OUTPUTAREA")
      return hydraulicsState({ ...s, outputArea: value });
    if (command === "HYDRAULICS_INPUTFORCE")
      return hydraulicsState({ ...s, inputForce: value });
    if (command === "HYDRAULICS_STROKE")
      return hydraulicsState({ ...s, stroke: value });
    throw new Error("Unsupported hydraulics action");
  },
  measure: (s) => hydraulicsMeasure(hydraulicsState(s)),
};
if (flowParameters.type !== "object") throw new Error("Expected object schema");
export const flowModel: DomainModel = {
  ref: "prefabs/physics/PipeFlow",
  version: 1,
  name: "Water pipe constriction",
  description:
    "What changes when a pipe narrows at fixed volume flow? Steady horizontal incompressible inviscid flow driven at fixed volume flow Q, not fixed pump pressure. Reference pressure is absolute. Reject narrow-section pressure at or below water vapour pressure 2340 Pa at 20°C; no cavitation, viscous losses or turbulence. Tracer state uses computed speed and elapsed time.",
  tags: [
    "flow",
    "pipe",
    "pipes",
    "narrower",
    "constriction",
    "continuity",
    "bernoulli",
    "water pipe constriction",
    "what changes when a pipe narrows at fixed volume flow?",
  ],
  assumptions: [
    "Steady horizontal incompressible inviscid flow driven at fixed volume flow Q, not fixed pump pressure. Reference pressure is absolute. Reject narrow-section pressure at or below water vapour pressure 2340 Pa at 20°C; no cavitation, viscous losses or turbulence. Tracer state uses computed speed and elapsed time.",
  ],
  parameters: flowParameters,
  defaults: flowDefaults,
  presentation: "physics-flow",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      wideSpeed: "m/s",
      narrowSpeed: "m/s",
      pressureDifference: "Pa",
      narrowPressure: "Pa absolute",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    FLOW_NARROWAREA: {
      arguments: object({ value: flowParameters.properties.narrowArea }),
      description: "Constriction area",
      timing: "live",
      target: "instance",
    },
    FLOW_TIME: {
      arguments: object({}),
      description: "Follow water / start again",
      timing: "live",
      target: "instance",
    },
  },
  initialize: flowState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = flowModel.actions[command];
    if (!action) throw new Error("Unsupported flow action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = flowState(state);
    if (command === "FLOW_NARROWAREA")
      return flowState({ ...s, narrowArea: value });
    if (command === "FLOW_TIME")
      return flowState({ ...s, time: s.time >= 10 ? 0 : s.time + 1 });
    throw new Error("Unsupported flow action");
  },
  measure: (s) => flowMeasure(flowState(s)),
};
if (parachuteParameters.type !== "object")
  throw new Error("Expected object schema");
export const parachuteModel: DomainModel = {
  ref: "prefabs/physics/Parachute",
  version: 1,
  name: "Parachute descent",
  description:
    "How does canopy area change falling speed? Fully deployed fixed-shape canopy, constant atmosphere and quadratic drag opposing signed velocity. RK4 joint speed/position integration with drag-timescale bounded substeps; ground stops motion. Changing canopy area preserves current speed and position; no deployment shock, wind or canopy collapse.",
  tags: [
    "parachute",
    "canopy",
    "canopies",
    "falling",
    "drag",
    "terminal velocity",
    "parachute descent",
    "how does canopy area change falling speed?",
  ],
  assumptions: [
    "Fully deployed fixed-shape canopy, constant atmosphere and quadratic drag opposing signed velocity. RK4 joint speed/position integration with drag-timescale bounded substeps; ground stops motion. Changing canopy area preserves current speed and position; no deployment shock, wind or canopy collapse.",
  ],
  parameters: parachuteParameters,
  defaults: parachuteDefaults,
  presentation: "physics-parachute",
  maximumInstances: 2,
  requiredObservations: [],
  dependencies,
  outputs: Object.fromEntries(
    Object.entries({
      terminalSpeed: "m/s",
      support: "N",
      speed: "m/s",
      distance: "m",
      time: "s",
      weight: "N",
      drag: "N",
      acceleration: "m/s²",
      landed: "1",
    }).map(([key, unit]) => [key, { unit, description: key }]),
  ),
  actions: {
    PARACHUTE_AREA: {
      arguments: object({ value: parachuteParameters.properties.area }),
      description: "Canopy area",
      timing: "live",
      target: "instance",
    },
    PARACHUTE_ADVANCE: {
      arguments: object({}),
      description: "Fall one second",
      timing: "live",
      target: "instance",
    },
    PARACHUTE_RESTART: {
      arguments: object({}),
      description: "Start fall again",
      timing: "live",
      target: "instance",
    },
  },
  initialize: parachuteState,
  configuration: (s) => ({ ...s }),
  apply: (state, command, value) => {
    const action = parachuteModel.actions[command];
    if (!action) throw new Error("Unsupported parachute action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    const s = parachuteState(state);
    if (command === "PARACHUTE_AREA")
      return parachuteState({ ...s, area: value });
    if (command === "PARACHUTE_ADVANCE") return parachuteAdvance(s);
    if (command === "PARACHUTE_RESTART")
      return parachuteState({
        ...s,
        speed: 0,
        distance: 0,
        time: 0,
        landed: false,
      });
    throw new Error("Unsupported parachute action");
  },
  measure: (s) => parachuteMeasure(parachuteState(s)),
};
export const mechanicsModels = [
  pulleyModel,
  gearsModel,
  tippingModel,
  collisionModel,
  buoyancyModel,
  pressureModel,
  hydraulicsModel,
  flowModel,
  parachuteModel,
];

export const mechanicsPresentations = Object.fromEntries(
  mechanicsModels.map((m) => [m.presentation, true]),
);
