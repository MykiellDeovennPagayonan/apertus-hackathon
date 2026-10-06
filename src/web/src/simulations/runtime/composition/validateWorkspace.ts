import { scheduledTripFields } from "../../components/behaviors/ScheduledTrip";
import { isPairOutput, pairKind } from "../../components/contracts/composition";
import {
  objectSpaces,
  outputs,
  properties,
  schemas,
} from "../../components/registry";
import { choice, num, object, validateValue } from "../parameterSchema";
import { requireRecord } from "../records";
import { canvasTarget, clockTarget, projectedScene } from "./projectCanvas";
import type { CompositionScene } from "./types";
import {
  validateActionBinding,
  validateControlShape,
  validateMeasurementUnit,
} from "./validateBindings";
import { validateSingleScene as validateScene } from "./validateSingleScene";

const text = { type: "string", maxLength: 100 } as const;
const optionalText = { ...text, minLength: 0 };
const canvasSchema = object(
  {
    id: text,
    label: text,
    kind: choice("cartesian", "town", "physical", "diagram"),
    settings: object({
      xMin: num(-100, 100),
      xMax: num(-100, 100),
      yMin: num(-100, 100),
      yMax: num(-100, 100),
      grid: { type: "boolean" },
      snap: num(0, 5),
    }),
    clock: object({
      start: num(0, 24),
      speed: num(0.25, 8),
      playing: { type: "boolean" },
      secondsPerHour: num(1, 60),
    }),
  },
  ["clock"],
);
const tripSchema = object({
  ...scheduledTripFields,
  label: text,
  person: optionalText,
});
export function validateWorkspace(
  scene: CompositionScene,
  template: string,
  validateStarts = true,
) {
  const w = requireRecord(scene.workspace);
  validateValue(
    object({
      version: choice(1, 2),
      canvases: {
        type: "array",
        minItems: 0,
        maxItems: 8,
        items: canvasSchema,
      },
      placements: object(
        Object.fromEntries(
          Object.keys(w.placements ?? {}).map((id) => [id, text]),
        ),
      ),
      trips: { type: "array", minItems: 0, maxItems: 128, items: tripSchema },
      arrangement: choice("side-by-side", "stacked"),
    }),
    w,
    "Workspace",
  );
  for (const [key, limit] of [
    ["objects", 64],
    ["controls", 40],
    ["measurements", 40],
  ] as const) {
    if (!Array.isArray(scene[key]) || scene[key].length > limit)
      throw new Error(`${key}: use at most ${limit} components`);
  }
  const ids = new Set(["clock", "lesson"]);
  const claim = (id: string) => {
    if (
      !/^[a-zA-Z][\w/-]{0,79}$/.test(id) ||
      id.startsWith("clock/") ||
      id.startsWith("canvas/") ||
      ids.has(id)
    )
      throw new Error(`Duplicate or invalid identity: ${id}`);
    ids.add(id);
  };
  for (const c of w.canvases) {
    claim(c.id);
    if (c.kind !== scene.kind)
      throw new Error("Canvas and objects must use the same space");
    validateScene(
      {
        version: scene.version,
        kind: c.kind,
        canvas: c.settings,
        ...(c.clock ? { clock: c.clock } : {}),
        objects: [],
        controls: [],
        measurements: [],
      },
      template,
    );
  }
  for (const o of scene.objects) {
    claim(o.id);
    if (!Object.hasOwn(schemas, o.kind)) throw new Error("Unsupported object");
    validateValue(schemas[o.kind], o, "Object");
    if (!/^#[0-9a-fA-F]{6}$/.test(o.color))
      throw new Error("Use a six digit color");
    if (objectSpaces[o.kind] !== scene.kind)
      throw new Error("Incompatible object");
    if (o.kind === "line" && Math.hypot(o.b.x - o.a.x, o.b.y - o.a.y) < 0.01)
      throw new Error("Line handles must be distinct");
    if (o.kind === "person" && o.schedule.length)
      throw new Error(
        "Use Scheduled trip components in the connection workspace",
      );
  }
  for (const [id, canvasId] of Object.entries(w.placements)) {
    if (
      !scene.objects.some((o) => o.id === id) ||
      !w.canvases.some((c) => c.id === canvasId)
    )
      throw new Error("Placement references a missing component");
  }
  const target = (id: string) => {
    const o = scene.objects.find((o) => o.id === id);
    if (
      !o &&
      !w.canvases.some(
        (c) =>
          (c.kind === "town" && clockTarget(c.id) === id) ||
          canvasTarget(c.id) === id,
      )
    )
      throw new Error("Binding references a missing object");
    return o;
  };
  for (const c of scene.controls) {
    claim(c.id);
    validateControlShape(c);
    if (c.target) {
      const o = target(c.target);
      if (c.widget === "button") {
        if (!o && !w.canvases.some((v) => canvasTarget(v.id) === c.target))
          throw new Error("Reset must target a canvas");
        validateActionBinding(c, o);
        continue;
      }
      if (c.target.startsWith("canvas/"))
        throw new Error("Canvas actions require a button");
      const p = properties(o)[c.property];
      if (
        !p ||
        Boolean(p.toggle) !== (c.widget === "toggle") ||
        c.min < p.min ||
        c.max > p.max
      )
        throw new Error("Control binding or range is incompatible");
      // Existing validation also checks starting values, vertical lines, and capabilities.
      const clock =
        w.canvases.find((v) => clockTarget(v.id) === c.target)?.clock ??
        scene.clock;
      validateScene(
        {
          version: scene.version,
          kind: scene.kind,
          canvas: scene.canvas,
          ...(clock ? { clock } : {}),
          objects: o ? [o] : [],
          controls: [{ ...c, target: o ? c.target : "clock" }],
          measurements: [],
        },
        template,
        validateStarts,
      );
    }
  }
  for (const m of scene.measurements) {
    claim(m.id);
    validateValue(
      object(
        {
          id: text,
          label: text,
          target: optionalText,
          other: optionalText,
          output: optionalText,
          precision: num(0, 6, "", true),
          slot: choice("primary", "details"),
          unit: optionalText,
        },
        ["unit"],
      ),
      m,
      "Measurement",
    );
    if (m.target) {
      if (m.target.startsWith("canvas/"))
        throw new Error("Canvas reset targets do not provide measurements");
      const o = target(m.target);
      validateMeasurementUnit(m, o);
      if (isPairOutput(m.output)) {
        if (o?.kind !== pairKind(m.output))
          throw new Error("Intersection requires two lines");
      } else if (!Object.hasOwn(outputs(o), m.output))
        throw new Error("Unsupported measurement");
    }
    if (m.other) {
      const o = target(m.other);
      if (
        !isPairOutput(m.output) ||
        o?.kind !== pairKind(m.output) ||
        m.other === m.target
      )
        throw new Error("Intersection requires a different line");
      if (
        m.target &&
        w.placements[m.target] &&
        w.placements[m.other] &&
        w.placements[m.target] !== w.placements[m.other]
      )
        throw new Error("Pair measurement objects must share a canvas");
    }
  }
  if (scene.kind !== "town" && w.trips.length)
    throw new Error("Trips require a 3D scene");
  for (const t of w.trips) {
    claim(t.id);
    const person = scene.objects.find((o) => o.id === t.person);
    const destination = scene.objects.find((o) => o.id === t.target);
    if (t.person && person?.kind !== "person")
      throw new Error("Trip requires a person");
    if (t.target && destination?.kind !== "building")
      throw new Error("Trip destination requires a building");
    if (person?.kind === "person" && t.at < person.spawnAt)
      throw new Error("Departure must be at or after spawning");
    if (
      t.person &&
      t.target &&
      w.placements[t.person] &&
      w.placements[t.target] &&
      w.placements[t.person] !== w.placements[t.target]
    )
      throw new Error("Person and destination must share a 3D scene");
    if (
      t.person &&
      w.trips.some(
        (other) =>
          other.id !== t.id && other.person === t.person && other.at === t.at,
      )
    )
      throw new Error("A person cannot have two departures at the same time");
  }
  // Strictly validate the legacy envelope and every compiled canvas; incomplete connections stay in drafts.
  const { workspace: _workspace, ...base } = scene;
  validateScene(
    { ...base, objects: [], controls: [], measurements: [] },
    template,
    validateStarts,
  );
  if (
    scene.objects.length > 64 ||
    scene.controls.length > 40 ||
    scene.measurements.length > 40
  )
    throw new Error("Too many components");
  for (const canvas of w.canvases)
    validateScene(projectedScene(scene, canvas), template, validateStarts);
}
