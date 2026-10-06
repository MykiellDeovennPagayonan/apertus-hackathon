import { requireValue } from "../../runtime/authoring/requireValue";
import type { Port, PublicDefinition } from "../../runtime/authoring/types";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
} from "../../runtime/parameterSchema";

const identity: ParameterSchema = { type: "string", maxLength: 160 };
const value = (unit: string, kind: Port["kind"] = "value"): Port => ({
  kind,
  unit,
  crossScope: true,
});
const command = (
  schema: ParameterSchema,
  description: string,
  timing: "live" | "relaunch" = "live",
) => ({
  arguments: object({ value: schema }),
  description,
  timing,
  submission: "continuous" as const,
});
const reset = {
  arguments: object({}),
  description: "Restore authored settings",
  timing: "rebuild" as const,
};
function model(
  id: string,
  title: string,
  properties: Record<string, ParameterSchema>,
  defaults: Record<string, unknown>,
  unit = id,
): PublicDefinition {
  return {
    id,
    version: 1,
    title,
    description: title,
    category: "models",
    tags: [
      "spatial",
      id.includes("Town") || id.includes("Routine") || id.includes("Market")
        ? "town"
        : "mechanics",
    ],
    configuration: object(properties),
    defaults,
    inputs: {},
    outputs: {
      data: value(unit),
      appearance: { kind: "attachment", unit: id, cardinality: "many" },
    },
    commands: { RESET: reset },
    placement: ["logic"],
    lifecycle: {
      authored: Object.keys(defaults),
      presentation: [],
      clock: false,
      reset: "authored",
      capture: true,
    },
    assumptions: [],
    runtimeProvider: id,
  };
}
const projectile = model(
  "models/Projectile",
  "Projectile",
  {
    angle: num(0, 90, "degrees"),
    velocity: num(5, 40, "m/s"),
    gravity: num(0.1, 30, "m/s²"),
    playing: boolean,
    slowMo: boolean,
    trajectoryVisible: boolean,
    showVectors: boolean,
  },
  {
    angle: 45,
    velocity: 20,
    gravity: 9.81,
    playing: true,
    slowMo: false,
    trajectoryVisible: true,
    showVectors: false,
  },
);
projectile.lifecycle.clock = true;
projectile.lifecycle.presentation = ["trajectoryVisible", "showVectors"];
projectile.assumptions = ["Same launch and landing height; no air resistance."];
for (const field of [
  "angle",
  "velocity",
  "gravity",
  "playing",
  "slowMo",
  "trajectoryVisible",
  "showVectors",
])
  projectile.commands[`set:${field}`] = command(
    (projectile.configuration as Extract<ParameterSchema, { type: "object" }>)
      .properties[field],
    field,
    ["angle", "velocity", "gravity"].includes(field) ? "relaunch" : "live",
  );
projectile.commands.LAUNCH = {
  arguments: object({}),
  description: "Launch",
  timing: "relaunch",
};
projectile.commands.RESTART = {
  arguments: object({}),
  description: "Restart comparison peer",
  timing: "relaunch",
};
projectile.outputs = {
  ...projectile.outputs,
  range: value("m"),
  maxHeight: value("m"),
  duration: value("s"),
  elapsed: value("s"),
  samples: value("m", "dataset"),
  trajectory: value("m", "dataset"),
  configuration: value(""),
};
const joint = model(
  "models/TrussJoint",
  "Truss joint",
  { x: num(0, 1), y: choice(0, -1) },
  { x: 0, y: 0 },
  "truss/joint",
);
const member = model(
  "models/TrussMember",
  "Truss member",
  {
    a: identity,
    b: identity,
    kind: choice("deck", "top", "vertical", "diagonal"),
    present: boolean,
  },
  { a: "joint-a", b: "joint-b", kind: "deck", present: true },
  "truss/member",
);
member.configurationReferences = {
  a: "models/TrussJoint",
  b: "models/TrussJoint",
};
member.commands["set:present"] = command(boolean, "Member present");
const load = model(
  "models/BridgeLoad",
  "Bridge load",
  { position: num(0.05, 0.95), magnitude: num(2, 30, "t") },
  { position: 0.5, magnitude: 10 },
  "truss/load",
);
load.commands.MOVE_LOAD = command(num(0.05, 0.95), "Move load");
load.commands.SET_LOAD = command(num(2, 30, "t"), "Load (t)");
const bridge = model(
  "models/BridgeResponse",
  "Bridge response",
  { spanScale: choice(1, 2), dense: boolean },
  { spanScale: 1, dense: false },
);
bridge.lifecycle.capture = false;
bridge.inputs = {
  joints: {
    ...value("truss/joint"),
    cardinality: "many",
    optional: true,
    crossScope: false,
  },
  members: {
    ...value("truss/member"),
    cardinality: "many",
    optional: true,
    crossScope: false,
  },
  load: { ...value("truss/load"), optional: true, crossScope: false },
};
bridge.commands.SELECT_MEMBER = command(
  { type: "string", minLength: 0, maxLength: 200 },
  "Select member",
);
bridge.outputs.response = value("");
bridge.outputs.selected = value("");
bridge.assumptions = [
  "Conceptual heuristic scores, not structural deflection or a general structural solver.",
  "Only generated five/eight panel topology, span scales 1 or 2, and one absent middle diagonal are supported.",
];
const building = model(
  "models/TownBuilding",
  "Town building",
  {
    label: { type: "string", maxLength: 100 },
    kind: choice("house", "school", "workshop", "square"),
    x: num(-100, 100),
    z: num(-100, 100),
    w: num(1, 30),
    d: num(1, 30),
    h: num(0, 30),
    color: { type: "string", maxLength: 30 },
  },
  {
    label: "House",
    kind: "house",
    x: -18,
    z: -12,
    w: 5,
    d: 5,
    h: 4,
    color: "#d7c9aa",
  },
  "town/building",
);
building.lifecycle.presentation = ["color", "h"];
const market = model(
  "models/Market",
  "Market",
  { nearSchool: boolean, busy: boolean },
  { nearSchool: false, busy: false },
  "town/market",
);
market.commands.MOVE_MARKET = {
  arguments: object({}),
  description: "Move market near school",
  timing: "live",
};
market.commands.MARKET_BUSY = {
  arguments: object({}),
  description: "Make market busy",
  timing: "live",
};
const routine = model(
  "models/DailyRoutine",
  "Daily routine",
  {
    homeId: identity,
    daytimeId: identity,
    squareId: identity,
    role: choice("student", "worker"),
    seed: num(0, 1),
  },
  {
    homeId: "h1",
    daytimeId: "school",
    squareId: "square",
    role: "student",
    seed: 0,
  },
  "town/routine",
);
routine.configurationReferences = {
  homeId: "models/TownBuilding",
  daytimeId: "models/TownBuilding",
  squareId: "models/TownBuilding",
};
const town = model(
  "models/TownNavigation",
  "Town navigation and clock",
  {
    time: num(0, 24, "h"),
    playing: boolean,
    speed: choice(1, 2, 4),
    roadClosed: boolean,
  },
  { time: 8, playing: true, speed: 1, roadClosed: false },
);
town.lifecycle.clock = true;
town.lifecycle.capture = true;
for (const field of ["time", "playing", "speed", "roadClosed"])
  town.commands[`set:${field}`] = command(
    (town.configuration as Extract<ParameterSchema, { type: "object" }>)
      .properties[field],
    field,
  );
town.inputs = {
  buildings: {
    ...value("town/building"),
    cardinality: "many",
    optional: true,
    crossScope: false,
  },
  routines: {
    ...value("town/routine"),
    cardinality: "many",
    optional: true,
    crossScope: false,
  },
  market: { ...value("town/market"), optional: true, crossScope: false },
};
town.outputs = {
  ...town.outputs,
  time: value("h"),
  population: value("1"),
  activity: value("1", "dataset"),
};
town.assumptions = [
  "Planar scheduled navigation; one controller owns all citizen motion.",
  "Street preference and obstacle detours use the established town layout; arbitrary road networks are unsupported.",
];
export const spatialDefinitions: PublicDefinition[] = [
  projectile,
  joint,
  member,
  load,
  bridge,
  building,
  market,
  routine,
  town,
];
for (const [id, title, target] of [
  ["appearance/Projectile", "Projectile scene", projectile.id],
  ["appearance/Bridge", "Bridge scene", bridge.id],
  ["canvases/World", "World canvas", town.id],
] as const)
  spatialDefinitions.push({
    ...model(id, title, {}, {}),
    category: id.startsWith("canvases") ? "canvases" : "appearance",
    runtimeProvider: undefined,
    presentationProvider: id,
    inputs: {
      model: {
        kind: "attachment",
        unit: target,
        ...(id === "appearance/Projectile"
          ? { cardinality: "many" as const }
          : {}),
      },
    },
    outputs: {},
    commands: {},
    placement: ["lesson"],
    lifecycle: {
      authored: [],
      presentation: [],
      clock: false,
      reset: "authored",
      capture: false,
    },
  });

const timeline = model(
  "models/ScheduledTrip",
  "Scheduled trip clock",
  {
    time: num(0, 24, "h"),
    playing: boolean,
    speed: num(0.25, 8),
    secondsPerHour: num(1, 60),
  },
  { time: 0, playing: false, speed: 1, secondsPerHour: 5 },
);
timeline.lifecycle.clock = true;
timeline.inputs = {
  objects: {
    kind: "value",
    unit: "town/object",
    cardinality: "many",
    optional: true,
  },
};
timeline.outputs = {
  data: value("town/timeline"),
  time: value("h"),
  people: value("1", "dataset"),
  appearance: {
    kind: "attachment",
    unit: "town/timeline",
    cardinality: "many",
  },
};
for (const field of ["time", "playing", "speed"])
  timeline.commands[`set:${field}`] = command(
    (timeline.configuration as Extract<ParameterSchema, { type: "object" }>)
      .properties[field],
    field,
  );
timeline.assumptions = [
  "Bounded planar authored navigation; road rectangles are obstacles, not an arbitrary road-network solver.",
];
spatialDefinitions.push(timeline);
for (const [id, title, target, properties, defaults] of [
  [
    "appearance/EnvironmentLighting",
    "Environment lighting",
    undefined,
    { intensity: num(0, 4) },
    { intensity: 1 },
  ],
  [
    "appearance/TownScenery",
    "Town scenery",
    undefined,
    { visible: boolean },
    { visible: true },
  ],
  [
    "appearance/TownBuilding",
    "Building appearance",
    "models/TownBuilding",
    { target: identity },
    { target: "h1" },
  ],
  [
    "appearance/TownCitizen",
    "Citizen appearance",
    "models/DailyRoutine",
    { target: identity },
    { target: "citizen" },
  ],
  [
    "appearance/Market",
    "Market appearance",
    "models/Market",
    { target: identity },
    { target: "market" },
  ],
] as [
  string,
  string,
  string | undefined,
  Record<string, ParameterSchema>,
  Record<string, unknown>,
][]) {
  const d = model(id, title, properties, defaults);
  d.category = "appearance";
  d.runtimeProvider = undefined;
  d.presentationProvider = id;
  d.commands = {};
  d.outputs = {
    scene: {
      kind: "attachment",
      unit: "world/presentation",
      cardinality: "many",
    },
  };
  d.lifecycle.presentation = Object.keys(defaults);
  d.lifecycle.capture = false;
  if (target) d.configurationReferences = { target };
  spatialDefinitions.push(d);
}
const world = requireValue(
  spatialDefinitions.find((d) => d.id === "canvases/World"),
);
world.configuration = object({ cameraPreset: choice("overview", "close") });
world.defaults = { cameraPreset: "overview" };
world.lifecycle.presentation = ["cameraPreset"];
world.inputs.scene = {
  kind: "attachment",
  unit: "world/presentation",
  cardinality: "many",
  optional: true,
};

for (const [id, title, unit] of [
  ["appearance/Launcher", "Launcher", "projectile/presentation"],
  ["appearance/Trajectory", "Trajectory", "projectile/presentation"],
  ["appearance/VelocityArrow", "Velocity arrows", "projectile/presentation"],
  ["appearance/ProjectileBody", "Projectile body", "projectile/presentation"],
  ["appearance/Beam", "Truss beams", "bridge/presentation"],
  ["appearance/Joint", "Truss joints", "bridge/presentation"],
  ["appearance/BridgeSupport", "Bridge supports", "bridge/presentation"],
  ["appearance/LoadTruck", "Load truck", "bridge/presentation"],
] as const) {
  const d = model(id, title, { visible: boolean }, { visible: true });
  d.category = "appearance";
  d.runtimeProvider = undefined;
  d.presentationProvider = id;
  d.commands = {};
  d.outputs = { scene: { kind: "attachment", unit, cardinality: "many" } };
  d.placement = ["model attachment"];
  d.lifecycle.presentation = ["visible"];
  d.lifecycle.capture = false;
  spatialDefinitions.push(d);
}
for (const [id, unit] of [
  ["appearance/Projectile", "projectile/presentation"],
  ["appearance/Bridge", "bridge/presentation"],
])
  requireValue(spatialDefinitions.find((d) => d.id === id)).inputs.visuals = {
    kind: "attachment",
    unit,
    cardinality: "many",
    optional: true,
  };
