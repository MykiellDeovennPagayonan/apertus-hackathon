import {
  isPairOutput,
  pairKind,
  sceneKinds,
} from "../../../registry/contracts/objects/composition";
import {
  optionalText,
  position,
  string,
} from "../../../registry/contracts/objects/objectFields";
import {
  objectSpaces,
  outputs,
  properties,
  propertyValue,
  schemas,
} from "../../../registry/objects/registry";
import {
  boolean,
  choice,
  num,
  object,
  validateValue,
} from "../../../registry/contracts/parameterSchema";
import { requireRecord } from "../../../legacy/runtime/records";
import type { CompositionScene } from "../../runtime-engine/composition/types";
import {
  validateActionBinding,
  validateControlShape,
  validateMeasurementUnit,
  validatePropertyUnit,
} from "./validateBindings";
export function validateSingleScene(
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
