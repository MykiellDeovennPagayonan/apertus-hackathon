import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
import { requireRecord } from "../records";
import {
  actions,
  applyAction,
  createDomainObject,
  domainSchemas,
  fractionAction,
  gasProperties,
  isPairOutput,
  objectSpaces,
  outputSpec,
  pairKind,
  sceneKinds,
} from "./definitions";
import { type SceneWorkspace, validateWorkspace } from "./workspace";

export type Point = { x: number; y: number };
type Base = { id: string; label: string; color: string };
export type LineObject = Base & {
  kind: "line";
  a: Point;
  b: Point;
  width: number;
  dashed: boolean;
  draggable: boolean;
};
export type SquareObject = Base & {
  kind: "square";
  center: Point;
  side: number;
  rotation: number;
  fill: boolean;
  opacity: number;
  width: number;
  draggable: boolean;
};
export type GroundObject = Base & {
  kind: "ground";
  width: number;
  depth: number;
};
export type BuildingObject = Base & {
  kind: "building";
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  entrance: "north" | "south" | "east" | "west";
  obstacle: boolean;
};
export type RoadObject = Base & {
  kind: "road";
  x: number;
  z: number;
  width: number;
  depth: number;
  closed: boolean;
};
export type Destination = { target: string; x: number; z: number };
export type ScheduleStep = Destination & { id: string; at: number };
export type PersonObject = Base & {
  kind: "person";
  x: number;
  z: number;
  spawnAt: number;
  speed: number;
  schedule: ScheduleStep[];
};
export type DisplayBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type GasObject = Base & {
  kind: "gas";
  display: DisplayBounds;
  inputs: import("../../components/traits/GasState").GasState;
  particles: boolean;
};
export type FractionObject = Base & {
  kind: "fraction-bar";
  display: DisplayBounds;
  shaded: boolean[];
  interactive: boolean;
};
export type SceneObject =
  | GasObject
  | FractionObject
  | LineObject
  | SquareObject
  | GroundObject
  | BuildingObject
  | RoadObject
  | PersonObject;
export type ObjectKind = SceneObject["kind"];
export type SceneControl = {
  id: string;
  target: string;
  property: string;
  label: string;
  widget: "slider" | "number" | "toggle" | "button";
  binding?: "property" | "action";
  fixed?: { factor?: number };
  unit?: string;
  min: number;
  max: number;
  step: number;
  slot: "primary" | "details";
};
export type Measurement = {
  id: string;
  target: string;
  other: string;
  output: string;
  unit?: string;
  label: string;
  precision: number;
  slot: "primary" | "details";
};
export interface CompositionScene {
  version: 1 | 2;
  workspace?: SceneWorkspace;
  kind: "cartesian" | "town" | "physical" | "diagram";
  canvas: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    grid: boolean;
    snap: number;
  };
  clock?: {
    start: number;
    speed: number;
    playing: boolean;
    secondsPerHour: number;
  };
  objects: SceneObject[];
  controls: SceneControl[];
  measurements: Measurement[];
}
const string = { type: "string", maxLength: 100 } as const;
const optionalText = { ...string, minLength: 0 };
const color = { type: "string", maxLength: 7 } as const;
const position = num(-100, 100);
const point = object({ x: num(-1000, 1000), y: num(-1000, 1000) });
const base = { id: string, label: string, color };
export const schemas: Record<ObjectKind, ParameterSchema> = {
  ...domainSchemas,
  line: object({
    ...base,
    kind: choice("line"),
    a: point,
    b: point,
    width: num(0.5, 16),
    dashed: boolean,
    draggable: boolean,
  }),
  square: object({
    ...base,
    kind: choice("square"),
    center: point,
    side: num(0.1, 100),
    rotation: num(-360, 360),
    fill: boolean,
    opacity: num(0, 1),
    width: num(0.5, 16),
    draggable: boolean,
  }),
  ground: object({
    ...base,
    kind: choice("ground"),
    width: num(4, 100),
    depth: num(4, 100),
  }),
  building: object({
    ...base,
    kind: choice("building"),
    x: position,
    z: position,
    width: num(1, 30),
    depth: num(1, 30),
    height: num(0.5, 30),
    entrance: choice("north", "south", "east", "west"),
    obstacle: boolean,
  }),
  road: object({
    ...base,
    kind: choice("road"),
    x: position,
    z: position,
    width: num(0.5, 100),
    depth: num(0.5, 100),
    closed: boolean,
  }),
  person: object({
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
      items: object({
        id: string,
        at: num(0, 23.99),
        target: optionalText,
        x: position,
        z: position,
      }),
    },
  }),
};
export function blankScene(kind: CompositionScene["kind"]): CompositionScene {
  return {
    version: 2,
    kind,
    canvas:
      kind === "physical" || kind === "diagram"
        ? { xMin: 0, xMax: 100, yMin: 0, yMax: 75, grid: false, snap: 1 }
        : { xMin: -10, xMax: 10, yMin: -10, yMax: 10, grid: true, snap: 0.5 },
    ...(kind === "town" || kind === "cartesian"
      ? { clock: { start: 0, speed: 1, playing: false, secondsPerHour: 5 } }
      : {}),
    objects: [],
    controls: [],
    measurements: [],
  };
}
export function createObject(kind: ObjectKind, id: string): SceneObject {
  if (kind === "gas" || kind === "fraction-bar")
    return createDomainObject(kind, id);
  const base = {
    id,
    label: {
      line: "Line",
      square: "Square",
      ground: "Ground",
      building: "House",
      road: "Road",
      person: "Person",
      gas: "Gas container",
      "fraction-bar": "Fraction bar",
    }[kind],
    color: "#4367b2",
  };
  switch (kind) {
    case "line":
      return {
        ...base,
        kind,
        a: { x: 0, y: 0 },
        b: { x: 2, y: 2 },
        width: 3,
        dashed: false,
        draggable: true,
      };
    case "square":
      return {
        ...base,
        kind,
        center: { x: 0, y: 0 },
        side: 3,
        rotation: 0,
        fill: false,
        opacity: 0.3,
        width: 3,
        draggable: true,
      };
    case "ground":
      return { ...base, kind, color: "#91a87b", width: 48, depth: 40 };
    case "building":
      return {
        ...base,
        kind,
        color: "#d7c9aa",
        x: 0,
        z: 0,
        width: 5,
        depth: 5,
        height: 4,
        entrance: "south",
        obstacle: true,
      };
    case "road":
      return {
        ...base,
        kind,
        color: "#aaa79c",
        x: 0,
        z: -6,
        width: 30,
        depth: 3,
        closed: false,
      };
    case "person":
      return {
        ...base,
        kind,
        color: "#b75d45",
        x: -8,
        z: 0,
        spawnAt: 0,
        speed: 2,
        schedule: [],
      };
  }
}
export function addSceneObject(
  scene: CompositionScene,
  kind: ObjectKind,
  id: string,
) {
  if (objectSpaces[kind] !== scene.kind)
    throw new Error("This object is incompatible with the canvas");
  if (scene.objects.length >= 64) throw new Error("Use at most 64 objects");
  if (
    !scene.workspace &&
    kind === "ground" &&
    scene.objects.some((o) => o.kind === "ground")
  )
    throw new Error("This scene already has ground. Edit its size or color.");
  const item = createObject(kind, id);
  const count = scene.objects.filter((o) => o.kind === kind).length;
  item.label += ` ${count + 1}`;
  if (item.kind === "line") {
    item.a.y = count;
    item.b.y += count;
    item.color = ["#4367b2", "#b75d45", "#48805b", "#8c5f9c"][count % 4];
  }
  if (item.kind === "gas") {
    item.display.x += (count % 2) * 45;
    item.display.y += Math.floor(count / 2) * 55;
  }
  if (item.kind === "fraction-bar") item.display.y += count * 22;
  if (item.kind === "building") item.x = Math.min(count * 7, 18);
  scene.objects.push(item);
  return item;
}
export function removeSceneObject(scene: CompositionScene, id: string) {
  const removed = scene.objects.find((o) => o.id === id);
  if (removed?.kind === "building")
    for (const o of scene.objects)
      if (o.kind === "person")
        for (const step of o.schedule)
          if (step.target === id) {
            const p = entrance(removed);
            step.target = "";
            step.x = p.x;
            step.z = p.y;
          }
  scene.objects = scene.objects.filter((o) => o.id !== id);
  if (scene.workspace) {
    for (const c of scene.controls) if (c.target === id) c.target = "";
    for (const m of scene.measurements) {
      if (m.target === id) m.target = "";
      if (m.other === id) m.other = "";
    }
  } else {
    scene.controls = scene.controls.filter((c) => c.target !== id);
    scene.measurements = scene.measurements.filter(
      (m) => m.target !== id && m.other !== id,
    );
  }
  if (scene.workspace) {
    delete scene.workspace.placements[id];
    for (const trip of scene.workspace.trips) {
      if (trip.person === id) trip.person = "";
      if (trip.target === id && removed?.kind === "building") {
        const p = entrance(removed);
        trip.target = "";
        trip.x = p.x;
        trip.z = p.y;
      }
    }
  }
}
export type Property = {
  label: string;
  min: number;
  max: number;
  step: number;
  toggle?: boolean;
  integer?: boolean;
  unit?: string;
};
export function properties(
  o: SceneObject | undefined,
): Record<string, Property> {
  if (!o)
    return {
      time: { label: "Time (hours)", min: 0, max: 24, step: 0.05 },
      playing: { label: "Play", min: 0, max: 1, step: 1, toggle: true },
      speed: { label: "Playback speed", min: 0.25, max: 8, step: 0.25 },
    };
  switch (o.kind) {
    case "gas":
      return gasProperties;
    case "fraction-bar":
      return {
        partitions: {
          label: "Partition count",
          min: 1,
          max: 12,
          step: 1,
          integer: true,
          unit: "",
        },
      };
    case "line":
      return {
        slope: { label: "Slope", min: -20, max: 20, step: 0.1 },
        intercept: { label: "Y intercept", min: -100, max: 100, step: 0.1 },
      };
    case "square":
      return {
        side: { label: "Side length", min: 0.1, max: 100, step: 0.1 },
        rotation: { label: "Rotation", min: -360, max: 360, step: 1 },
        fill: { label: "Filled", min: 0, max: 1, step: 1, toggle: true },
      };
    case "building":
      return {
        x: { label: "X position", min: -100, max: 100, step: 0.5 },
        z: { label: "Z position", min: -100, max: 100, step: 0.5 },
      };
    case "road":
      return {
        closed: { label: "Road closed", min: 0, max: 1, step: 1, toggle: true },
      };
    case "person":
      return {
        speed: { label: "Walking speed", min: 0.1, max: 10, step: 0.1 },
      };
    case "ground":
      return {};
  }
}
export function propertyValue(o: SceneObject, key: string): number | boolean {
  if (o.kind === "gas") return o.inputs[key as keyof typeof o.inputs];
  if (o.kind === "fraction-bar") return o.shaded.length;
  if (o.kind === "line") {
    const dx = o.b.x - o.a.x;
    if (key === "slope") return dx === 0 ? 0 : (o.b.y - o.a.y) / dx;
    if (key === "intercept")
      return dx === 0 ? 0 : o.a.y - ((o.b.y - o.a.y) / dx) * o.a.x;
  }
  return (o as unknown as Record<string, number | boolean>)[key];
}
export function setProperty(
  o: SceneObject,
  key: string,
  value: number | boolean,
) {
  const capabilities = properties(o);
  if (!Object.hasOwn(capabilities, key))
    throw new Error("Unsupported property");
  const spec = capabilities[key];
  if (
    !spec ||
    (spec.toggle
      ? typeof value !== "boolean"
      : typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < spec.min ||
        value > spec.max ||
        (spec.integer && !Number.isInteger(value)))
  )
    throw new Error("Unsupported property or value outside its range");
  if (o.kind === "gas") {
    Object.assign(o.inputs, { [key]: value });
    return;
  }
  if (o.kind === "fraction-bar") {
    fractionAction(o, "SET_BAR_FRACTION", {
      bar: 0,
      fraction: {
        n: Math.min(o.shaded.filter(Boolean).length, Number(value)),
        d: Number(value),
      },
    });
    return;
  }
  if (o.kind === "line") {
    if (o.a.x === o.b.x)
      throw new Error(
        "A vertical line has no finite slope or y intercept. Move its handles first.",
      );
    const m =
      key === "slope" ? Number(value) : Number(propertyValue(o, "slope"));
    const b =
      key === "intercept"
        ? Number(value)
        : Number(propertyValue(o, "intercept"));
    o.a = { x: 0, y: b };
    o.b = { x: 1, y: m + b };
  } else (o as unknown as Record<string, unknown>)[key] = value;
}
export function outputs(o: SceneObject | undefined): Record<string, string> {
  if (!o)
    return {
      time: "Time",
      population: "Spawned people",
      traveling: "People walking",
      blocked: "People without a route",
    };
  switch (o.kind) {
    case "gas":
      return { pressureKPa: "Pressure" };
    case "fraction-bar":
      return {
        fraction: "Fraction",
        decimal: "Decimal value",
        comparison: "Comparison with another bar",
      };
    case "line":
      return {
        equation: "Equation",
        yAtZero: "y at x = 0",
        yAtOne: "y at x = 1",
        rise: "Rise",
        run: "Run",
        slope: "Slope",
        intercept: "Y intercept",
        intersection: "Intersection with another line",
      };
    case "square":
      return { area: "Area", perimeter: "Perimeter", side: "Side length" };
    case "person":
      return { status: "Activity", position: "Position" };
    case "building":
      return { entrance: "Entrance position" };
    case "ground":
      return { area: "Ground area" };
    case "road":
      return { closed: "Road state" };
  }
}
export function validateScene(
  scene: CompositionScene,
  template: string,
  validateStarts = true,
) {
  if (
    scene?.version === 1 &&
    (scene.kind === "physical" || scene.kind === "diagram")
  )
    throw new Error(
      "Physical and diagram compositions require scene version 2",
    );
  if (scene?.workspace) {
    validateWorkspace(scene, template, validateStarts);
    return;
  }
  if (!scene || typeof scene !== "object" || Array.isArray(scene))
    throw new Error("Invalid composition scene");
  for (const [field, limit] of [
    ["objects", 64],
    ["controls", 40],
    ["measurements", 40],
  ] as const) {
    if (!Array.isArray(scene[field]) || scene[field].length > limit)
      throw new Error(`${field}: use at most ${limit} items`);
  }
  validateValue(
    object({
      version: choice(1, 2),
      kind: choice("cartesian", "town", "physical", "diagram"),
      canvas: object({
        xMin: position,
        xMax: position,
        yMin: position,
        yMax: position,
        grid: boolean,
        snap: num(0, 5),
      }),
      ...(scene.kind === "town" || scene.kind === "cartesian"
        ? {
            clock: object({
              start: num(0, 24),
              speed: num(0.25, 8),
              playing: boolean,
              secondsPerHour: num(1, 60),
            }),
          }
        : {}),
      objects: { type: "array", minItems: 0, maxItems: 64, items: object({}) },
      controls: { type: "array", minItems: 0, maxItems: 40, items: object({}) },
      measurements: {
        type: "array",
        minItems: 0,
        maxItems: 40,
        items: object({}),
      },
    }),
    {
      ...scene,
      objects: scene.objects?.map(() => ({})),
      controls: scene.controls?.map(() => ({})),
      measurements: scene.measurements?.map(() => ({})),
    },
    "Composition",
  );
  if (scene.kind !== sceneKinds[template as keyof typeof sceneKinds])
    throw new Error("Composition does not match the canvas");
  if (
    scene.canvas.xMax - scene.canvas.xMin < 1 ||
    scene.canvas.yMax - scene.canvas.yMin < 1
  )
    throw new Error("Axis maximum must be at least one unit above minimum");
  const ids = new Set<string>(["clock"]);
  const claim = (id: string) => {
    if (!/^[a-zA-Z][\w/-]{0,79}$/.test(id) || ids.has(id))
      throw new Error(`Duplicate or invalid identity: ${id}`);
    ids.add(id);
  };
  for (const o of scene.objects) {
    if (!o || !Object.hasOwn(schemas, o.kind))
      throw new Error("Unsupported scene object");
    validateValue(schemas[o.kind], o, "Object");
    claim(o.id);
    if (!/^#[0-9a-fA-F]{6}$/.test(o.color))
      throw new Error("Use a six digit color");
    if (objectSpaces[o.kind] !== scene.kind)
      throw new Error("Incompatible object");
    if (o.kind === "line" && Math.hypot(o.b.x - o.a.x, o.b.y - o.a.y) < 0.01)
      throw new Error("Line handles must be distinct");
    if (o.kind === "person") {
      let previous = o.spawnAt - 0.001;
      for (const step of o.schedule) {
        claim(step.id);
        if (step.at <= previous)
          throw new Error(
            "Schedule departure times must be ordered, distinct, and at or after spawning",
          );
        previous = step.at;
      }
    }
  }
  if (scene.objects.filter((o) => o.kind === "ground").length > 1)
    throw new Error("Use one ground component");
  for (const o of scene.objects)
    if (o.kind === "person")
      for (const step of o.schedule)
        if (
          step.target &&
          !scene.objects.some(
            (b) => b.kind === "building" && b.id === step.target,
          )
        )
          throw new Error("Schedule destination references a missing building");
  const target = (id: string) => {
    if (id === "clock" && scene.kind === "town") return undefined;
    const o = scene.objects.find((o) => o.id === id);
    if (!o) throw new Error("Binding references a missing object");
    return o;
  };
  for (const c of scene.controls) {
    validateControlShape(c);
    claim(c.id);
    if (c.widget === "button") {
      if (c.target === "canvas" && c.property !== "reset")
        throw new Error("Unsupported canvas action");
      validateActionBinding(
        c,
        c.target === "canvas" ? undefined : target(c.target),
      );
      continue;
    }
    const capabilities = properties(target(c.target));
    if (!Object.hasOwn(capabilities, c.property))
      throw new Error("Unsupported control property");
    const p = capabilities[c.property];
    validatePropertyUnit(c, p);
    if (
      !p ||
      Boolean(p.toggle) !== (c.widget === "toggle") ||
      c.min < p.min ||
      c.max > p.max ||
      c.min >= c.max ||
      c.step > c.max - c.min
    )
      throw new Error("Control binding or range is incompatible");
    const o = target(c.target);
    if (o?.kind === "line" && o.a.x === o.b.x)
      throw new Error(
        "Slope and intercept controls require a nonvertical line",
      );
    if (validateStarts && !p.toggle) {
      const start = o
        ? propertyValue(o, c.property)
        : c.property === "time"
          ? requireRecord(scene.clock).start
          : requireRecord(scene.clock).speed;
      if (typeof start !== "number" || start < c.min || start > c.max)
        throw new Error(
          `${c.label}: starting value must fit the control range`,
        );
    }
  }
  for (const m of scene.measurements) {
    validateValue(
      object(
        {
          id: string,
          target: string,
          other: optionalText,
          output: string,
          label: string,
          precision: num(0, 6, "", true),
          slot: choice("primary", "details"),
          unit: optionalText,
        },
        ["unit"],
      ),
      m,
      "Measurement",
    );
    claim(m.id);
    const o = target(m.target);
    validateMeasurementUnit(m, o);
    if (!Object.hasOwn(outputs(o), m.output))
      throw new Error("Unsupported measurement");
    if (isPairOutput(m.output)) {
      const other = target(m.other);
      if (
        other?.kind !== pairKind(m.output) ||
        o?.kind !== pairKind(m.output) ||
        other.id === m.target
      )
        throw new Error("Intersection requires a different line");
    } else if (m.other)
      throw new Error("This measurement does not accept a second object");
  }
}
export function entrance(b: BuildingObject): Point {
  const clearance = 0.8;
  return {
    x:
      b.x +
      (b.entrance === "east"
        ? b.width / 2 + clearance
        : b.entrance === "west"
          ? -b.width / 2 - clearance
          : 0),
    y:
      b.z +
      (b.entrance === "south"
        ? b.depth / 2 + clearance
        : b.entrance === "north"
          ? -b.depth / 2 - clearance
          : 0),
  };
}
export function lineIntersection(
  a: LineObject,
  b: LineObject,
): Point | "parallel" | "coincident" {
  const u = { x: a.b.x - a.a.x, y: a.b.y - a.a.y },
    v = { x: b.b.x - b.a.x, y: b.b.y - b.a.y };
  const cross = u.x * v.y - u.y * v.x,
    dx = b.a.x - a.a.x,
    dy = b.a.y - a.a.y;
  if (Math.abs(cross) < 1e-9)
    return Math.abs(dx * u.y - dy * u.x) < 1e-9 ? "coincident" : "parallel";
  const t = (dx * v.y - dy * v.x) / cross;
  return { x: a.a.x + t * u.x, y: a.a.y + t * u.y };
}

export function formatHour(hours: number) {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

export const controlSchema = object(
  {
    id: string,
    target: optionalText,
    property: optionalText,
    label: string,
    widget: choice("slider", "number", "toggle", "button"),
    min: num(-10000, 10000),
    max: num(-10000, 10000),
    step: num(0.001, 10000),
    slot: choice("primary", "details"),
    binding: choice("property", "action"),
    fixed: object({ factor: num(2, 12, "", true) }, ["factor"]),
    unit: optionalText,
  },
  ["binding", "fixed", "unit"],
);
export function validateControlShape(c: SceneControl) {
  validateValue(controlSchema, c, "Control");
  if (c.min >= c.max || c.step > c.max - c.min)
    throw new Error("Control minimum, maximum and step are incompatible");
  if (c.binding && (c.binding === "action") !== (c.widget === "button"))
    throw new Error("Incompatible control binding kind");
  if (c.widget !== "button" && c.fixed !== undefined)
    throw new Error("Property controls do not accept action arguments");
}
export function validatePropertyUnit(c: SceneControl, p: Property | undefined) {
  if (c.unit !== undefined && c.unit !== (p?.unit ?? ""))
    throw new Error("Control unit is incompatible");
  if (
    p?.integer &&
    (!Number.isInteger(c.min) ||
      !Number.isInteger(c.max) ||
      !Number.isInteger(c.step))
  )
    throw new Error("Partition controls require integer ranges and steps");
}
export function validateActionBinding(
  c: SceneControl,
  o: SceneObject | undefined,
) {
  const spec = actions(o)[c.property];
  if (!spec || (c.property === "reset" && o))
    throw new Error("Unsupported action binding");
  validateValue(spec.schema, c.fixed ?? {}, "Action arguments");
  if (c.unit !== undefined && c.unit !== "")
    throw new Error("Action buttons do not accept units");
}
export function validateMeasurementUnit(
  m: Measurement,
  o: SceneObject | undefined,
) {
  if (m.unit !== undefined && m.unit !== outputSpec(o, m.output).unit)
    throw new Error("Measurement unit is incompatible");
}
export { applyAction };
