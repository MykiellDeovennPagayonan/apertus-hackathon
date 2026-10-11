import type { CompositionRequirements } from "./explorationTeaching";
export const physicsMechanicsRequirements: Record<
  string,
  CompositionRequirements
> = {
  "prefabs/physics/Pulley": {
    topic:
      "Pulley systems: more supporting rope strands reduce lifting force but require more rope travel",
    selectionKey: "pulley",
    selectionGroup: "physics",
    guidance:
      "Does less pulling force mean more rope travel? Use the attached physics-pulley scene; it already contains the relevant quantities and short caption. Add only Supporting strands, Rope pulled. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Validated fixed (1), single movable (2), and two-moving-wheel tackle (4) routings. One continuous rope, vertical supporting strands, massless frictionless pulleys; quasi-static, no acceleration or angled strands.",
    commands: ["PULLEY_STRANDS", "PULLEY_PULL"],
    observations: [],
    appearance: "appearance/physics-pulley",
  },
  "prefabs/physics/BicycleGears": {
    topic:
      "Bicycle gears: low gear gives more wheel torque but less distance per pedal turn",
    selectionKey: "gears",
    selectionGroup: "physics",
    guidance:
      "Why does a lower gear give less distance per pedal turn? Use the attached physics-gears scene; it already contains the relevant quantities and short caption. Add only Rear sprocket teeth, Front chainring teeth, Turn pedals / start again. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Ideal uncrossed no-slip chain: both sprockets rotate in the same direction. Tooth counts set speed ratio; torque ratio is reciprocal. No direct-mesh gears, tyre slip, drivetrain losses or shift dynamics.",
    commands: ["GEARS_REAR", "GEARS_FRONT", "GEARS_TURNS"],
    observations: [],
    appearance: "appearance/physics-gears",
  },
  "prefabs/physics/Tipping": {
    topic:
      "Centre of mass and tipping: cabinet height and load shelf change the critical tilt angle",
    selectionKey: "tipping",
    selectionGroup: "physics",
    guidance:
      "When does the centre of mass move beyond the supporting edge? Use the attached physics-tipping scene; it already contains the relevant quantities and short caption. Add only Tilt cabinet, Load shelf height, Cabinet height. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Rigid uniform centred cabinet and a centred movable load. Quasi-static clockwise tilt about the right lower edge, sufficient friction to prevent sliding. Height alone does not cause spontaneous tipping; no furniture safety prediction.",
    commands: ["TIPPING_TILT", "TIPPING_LOADHEIGHT", "TIPPING_HEIGHT"],
    observations: [],
    appearance: "appearance/physics-tipping",
  },
  "prefabs/physics/Collision": {
    topic:
      "Collisions and momentum: heavy and light carts exchange velocity; sticking transfers motion energy into internal energy",
    selectionKey: "collision",
    selectionGroup: "physics",
    guidance:
      "Where does the motion energy go when carts stick together? Use the attached physics-collision scene; it already contains the relevant quantities and short caption. Add only Left cart starting speed, Right cart starting speed, Collide / return to start. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Isolated frictionless one-dimensional instantaneous collision. Left cart collides only when its velocity exceeds the right cart velocity. Restitution 0 means sticking and 1 elastic. Kinetic energy transferred into internal energy is not destroyed; no deformation or external impulse.",
    commands: ["COLLISION_SPEED1", "COLLISION_SPEED2", "COLLISION_COLLIDED"],
    observations: [],
    appearance: "appearance/physics-collision",
  },
  "prefabs/physics/Buoyancy": {
    topic:
      "Buoyancy: why a hollow watertight steel hull floats while a solid steel block sinks",
    selectionKey: "buoyancy",
    selectionGroup: "physics",
    guidance:
      "Why can the same steel float as a watertight hollow hull? Use the attached physics-buoyancy scene; it already contains the relevant quantities and short caption. Add only Cargo added, Flood / seal the hull. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Quasi-static still-water equilibrium for a sealed box hull and a solid block made from the same material mass and volume. Flooded interior excludes no water, so only material volume provides buoyancy. At full submersion equality is neutral equilibrium. No waves, surface tension or ship engineering.",
    commands: ["BUOYANCY_CARGO", "BUOYANCY_FLOODED"],
    observations: [],
    appearance: "appearance/physics-buoyancy",
  },
  "prefabs/physics/WaterPressure": {
    topic:
      "Water pressure with depth: bottle hole height changes outlet speed and jet range",
    selectionKey: "pressure",
    selectionGroup: "physics",
    guidance:
      "Does a faster outlet always send water farther? Use the attached physics-pressure scene; it already contains the relevant quantities and short caption. Add only Hole height above floor. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Constant water-surface height maintained externally; ideal small horizontal outlet to air. Depth below water determines pressure/speed; height above floor determines fall time. No draining tank, contraction, viscosity or jet breakup.",
    commands: ["PRESSURE_HOLEHEIGHT"],
    observations: [],
    appearance: "appearance/physics-pressure",
  },
  "prefabs/physics/HydraulicLift": {
    topic:
      "Hydraulic lifts: unequal piston areas exchange force for travel at equal pressure",
    selectionKey: "hydraulics",
    selectionGroup: "physics",
    guidance:
      "How does a larger output piston trade force for travel? Use the attached physics-hydraulics scene; it already contains the relevant quantities and short caption. Add only Output piston area, Available input force, Requested input stroke. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Equal hydraulic head, massless frictionless pistons and incompressible fluid. Available force is a ceiling; a slow stroke uses exactly the balancing force. Below threshold both pistons remain fixed. Work is calculated using balancing load force, not the unused force ceiling. No pump/check-valve mechanism, leaks or acceleration.",
    commands: [
      "HYDRAULICS_OUTPUTAREA",
      "HYDRAULICS_INPUTFORCE",
      "HYDRAULICS_STROKE",
    ],
    observations: [],
    appearance: "appearance/physics-hydraulics",
  },
  "prefabs/physics/PipeFlow": {
    topic:
      "Flow through pipes: fixed volume flow makes water faster and pressure lower in a narrower section",
    selectionKey: "flow",
    selectionGroup: "physics",
    guidance:
      "What changes when a pipe narrows at fixed volume flow? Use the attached physics-flow scene; it already contains the relevant quantities and short caption. Add only Constriction area, Follow water / start again. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Steady horizontal incompressible inviscid flow driven at fixed volume flow Q, not fixed pump pressure. Reference pressure is absolute. Reject narrow-section pressure at or below water vapour pressure 2340 Pa at 20°C; no cavitation, viscous losses or turbulence. Tracer state uses computed speed and elapsed time.",
    commands: ["FLOW_NARROWAREA", "FLOW_TIME"],
    observations: [],
    appearance: "appearance/physics-flow",
  },
  "prefabs/physics/Parachute": {
    topic:
      "Parachutes and terminal velocity: larger canopy area increases drag and reduces descent speed",
    selectionKey: "parachute",
    selectionGroup: "physics",
    guidance:
      "How does canopy area change falling speed? Use the attached physics-parachute scene; it already contains the relevant quantities and short caption. Add only Canopy area, Fall one second, Start fall again. Omitted conditions retain defaults. Every model/appearance/control is independently editable. Preserve unrelated configuration and accepted state on revisions. Fully deployed fixed-shape canopy, constant atmosphere and quadratic drag opposing signed velocity. RK4 joint speed/position integration with drag-timescale bounded substeps; ground stops motion. Changing canopy area preserves current speed and position; no deployment shock, wind or canopy collapse. For the two-size comparison use two independent models with equal mass/density/drag/height and areas 20/40 m². Use a single advance button and restart button wired to BOTH models; one area slider for the comparison only. Three controls total. Do not add separate dashboards.",
    commands: ["PARACHUTE_ADVANCE", "PARACHUTE_RESTART"],
    observations: [],
    appearance: "appearance/physics-parachute",
  },
};
export const physicsMechanicsScalarCommands = {
  PULLEY_STRANDS: "strands",
  PULLEY_PULL: "pull",
  GEARS_REAR: "rear",
  GEARS_FRONT: "front",
  TIPPING_TILT: "tilt",
  TIPPING_LOADHEIGHT: "loadHeight",
  TIPPING_HEIGHT: "height",
  COLLISION_SPEED1: "speed1",
  COLLISION_SPEED2: "speed2",
  BUOYANCY_CARGO: "cargo",
  PRESSURE_HOLEHEIGHT: "holeHeight",
  HYDRAULICS_OUTPUTAREA: "outputArea",
  HYDRAULICS_INPUTFORCE: "inputForce",
  HYDRAULICS_STROKE: "stroke",
  FLOW_NARROWAREA: "narrowArea",
  PARACHUTE_AREA: "area",
};
export const physicsMechanicsLabels = {
  PULLEY_STRANDS: "Supporting strands",
  PULLEY_PULL: "Rope pulled",
  GEARS_REAR: "Rear sprocket teeth",
  GEARS_FRONT: "Front chainring teeth",
  GEARS_TURNS: "Turn pedals / start again",
  TIPPING_TILT: "Tilt cabinet",
  TIPPING_LOADHEIGHT: "Load shelf height",
  TIPPING_HEIGHT: "Cabinet height",
  COLLISION_SPEED1: "Left cart starting speed",
  COLLISION_SPEED2: "Right cart starting speed",
  COLLISION_COLLIDED: "Collide / return to start",
  BUOYANCY_CARGO: "Cargo added",
  BUOYANCY_FLOODED: "Flood / seal the hull",
  PRESSURE_HOLEHEIGHT: "Hole height above floor",
  HYDRAULICS_OUTPUTAREA: "Output piston area",
  HYDRAULICS_INPUTFORCE: "Available input force",
  HYDRAULICS_STROKE: "Requested input stroke",
  FLOW_NARROWAREA: "Constriction area",
  FLOW_TIME: "Follow water / start again",
  PARACHUTE_AREA: "Canopy area",
  PARACHUTE_ADVANCE: "Fall one second",
  PARACHUTE_RESTART: "Start fall again",
};
export const physicsMechanicsLiveCommands = [
  "PULLEY_STRANDS",
  "PULLEY_PULL",
  "GEARS_REAR",
  "GEARS_FRONT",
  "TIPPING_TILT",
  "TIPPING_LOADHEIGHT",
  "TIPPING_HEIGHT",
  "COLLISION_SPEED1",
  "COLLISION_SPEED2",
  "BUOYANCY_CARGO",
  "PRESSURE_HOLEHEIGHT",
  "HYDRAULICS_OUTPUTAREA",
  "HYDRAULICS_INPUTFORCE",
  "HYDRAULICS_STROKE",
  "FLOW_NARROWAREA",
  "PARACHUTE_AREA",
];
