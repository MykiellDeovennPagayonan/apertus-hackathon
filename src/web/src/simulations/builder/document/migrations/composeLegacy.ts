import { sceneKinds } from "../../../components/contracts/composition";
import {
  CITIZEN_COUNT,
  MARKET_DEFAULT,
  MARKET_NEAR_SCHOOL,
  STATIC_BUILDINGS,
} from "../../../components/resources/TownLayout";
import {
  type BuildingObject,
  blankScene,
  createObject,
  entrance,
  type LineObject,
  outputs,
  type PersonObject,
  properties,
  type RoadObject,
} from "../../../runtime/composition/index";
import { canvasTarget } from "../../../runtime/composition/projectCanvas";
import { requireRecord } from "../../../runtime/records";
import { resolveRecipe } from "../../../runtime/resolver";
import { upgradeWorkspace } from "../../editor/workspaceCommands";
import type { ExperimentDocument } from "../types";
/** Explicit migration keeps the previous saved record intact until the author saves. */
export function composeLegacy(doc: ExperimentDocument): ExperimentDocument {
  const next = structuredClone(doc);
  next.documentVersion = 2;
  if (next.scene) {
    next.scene.version = 2;
    if (next.scene.workspace) next.scene.workspace.version = 2;
    return next;
  }
  if (!Object.hasOwn(sceneKinds, doc.template))
    throw new Error("Unsupported manual authoring template");
  const scene = blankScene(sceneKinds[doc.template]);
  if (doc.template === "gas" || doc.template === "fractions") {
    const claimed = new Set(
      [
        ...doc.presentation.controls,
        ...doc.presentation.results,
        ...(doc.editor.groups ?? []),
      ].map((v) => v.id),
    );
    const allocate = (base: string) => {
      let id = base,
        suffix = 1;
      while (claimed.has(id)) id = `${base}-${suffix++}`;
      claimed.add(id);
      return id;
    };
    if (doc.recipe) {
      const params = resolveRecipe(doc.recipe).instances[0].parameters;
      if (doc.template === "gas") {
        const gas = createObject("gas", allocate("gas/container"));
        if (gas.kind === "gas") {
          gas.inputs = {
            volume: Number(params.volume),
            temperature: Number(params.temperature),
            amount: Number(params.amount),
            playing: Boolean(params.playing),
          };
          gas.particles = doc.presentation.particles;
        }
        scene.objects.push(gas);
      } else {
        for (const [i, value] of (
          params.bars as { n: number; d: number }[]
        ).entries()) {
          const bar = createObject(
            "fraction-bar",
            allocate(`fractions/bar-${i === 0 ? "a" : "b"}`),
          );
          if (bar.kind === "fraction-bar") {
            bar.label = `Bar ${i === 0 ? "A" : "B"}`;
            bar.shaded = Array.from({ length: value.d }, (_, p) => p < value.n);
            bar.interactive = doc.presentation.directShading;
            bar.display.y = 10 + i * 30;
          }
          scene.objects.push(bar);
        }
      }
    }
    next.scene = scene;
    upgradeWorkspace(scene);
    const canvas = scene.workspace?.canvases[0];
    if (canvas && claimed.has(canvas.id)) {
      const oldId = canvas.id;
      canvas.id = allocate("canvas-main");
      for (const [id, target] of Object.entries(
        requireRecord(scene.workspace).placements,
      ))
        if (target === oldId)
          requireRecord(scene.workspace).placements[id] = canvas.id;
    }
    for (const c of doc.presentation.controls) {
      const object =
        c.capability === "splitB" ? scene.objects[1] : scene.objects[0];
      if (!canvas || !object) continue;
      if (c.capability === "reset" || c.capability.startsWith("split")) {
        scene.controls.push({
          id: c.id,
          label: c.label,
          target:
            c.capability === "reset" ? canvasTarget(canvas.id) : object.id,
          property: c.capability === "reset" ? "reset" : "subdivide",
          widget: "button",
          binding: "action",
          fixed:
            c.capability === "reset"
              ? {}
              : { factor: Number((c.fixed as { factor: number }).factor) },
          min: 0,
          max: 1,
          step: 1,
          unit: "",
          slot: c.slot,
        });
      } else {
        const p = properties(object)[c.capability];
        if (!p) throw new Error("Unsupported legacy control");
        scene.controls.push({
          id: c.id,
          label: c.label,
          target: object.id,
          property: c.capability,
          widget: p.toggle
            ? "toggle"
            : c.widget === "number"
              ? "number"
              : "slider",
          binding: "property",
          min: c.min ?? p.min,
          max: c.max ?? p.max,
          step: c.step ?? p.step,
          unit: p.unit ?? "",
          slot: c.slot,
        });
      }
    }
    scene.measurements = doc.presentation.results.map((r) => ({
      id: r.id,
      label: r.label,
      target: scene.objects[0].id,
      output: doc.template === "gas" ? "pressureKPa" : "comparison",
      other: doc.template === "fractions" ? scene.objects[1].id : "",
      unit: doc.template === "gas" ? "kPa" : "",
      precision: r.precision,
      slot: r.slot,
    }));
    next.recipe = null;
    next.presentation.controls = [];
    next.presentation.results = [];
    const remap = (id: string) =>
      id === "object" ? scene.objects[0]?.id : id === "view" ? canvas?.id : id;
    const ids = new Set(
      [
        ...scene.objects,
        ...scene.controls,
        ...scene.measurements,
        ...(scene.workspace?.canvases ?? []),
      ].map((o) => o.id),
    );
    next.editor.positions = Object.fromEntries(
      Object.entries(doc.editor.positions).flatMap(([id, point]) => {
        const mapped = remap(id);
        return mapped && ids.has(mapped) ? [[mapped, point]] : [];
      }),
    );
    if (next.editor.groups)
      next.editor.groups = next.editor.groups
        .map((g) => ({
          ...g,
          members: g.members
            .map(remap)
            .filter((id): id is string => !!id && ids.has(id)),
        }))
        .filter((g) => g.members.length >= 2);
    return next;
  }
  if (doc.recipe && doc.template === "line")
    for (const i of doc.recipe.assembly?.instances ?? []) {
      const o = createObject("line", i.id) as LineObject;
      const m = Number(i.parameters.slope ?? 1),
        b = Number(i.parameters.intercept ?? 0);
      o.label = i.label;
      o.a = { x: 0, y: b };
      o.b = { x: 1, y: b + m };
      scene.objects.push(o);
      const min = Number(i.parameters.xMin ?? -5),
        max = Number(i.parameters.xMax ?? 5);
      scene.canvas.xMin =
        scene.objects.length === 1 ? min : Math.min(scene.canvas.xMin, min);
      scene.canvas.xMax =
        scene.objects.length === 1 ? max : Math.max(scene.canvas.xMax, max);
      scene.canvas.yMax = (scene.canvas.xMax - scene.canvas.xMin) / 2;
      scene.canvas.yMin = -scene.canvas.yMax;
    }
  if (doc.recipe && doc.template === "town") {
    const params = doc.recipe.parameters;
    scene.clock = {
      start: Number(params.time ?? 8),
      speed: Number(params.speed ?? 1),
      playing: Boolean(params.playing ?? true),
      secondsPerHour: 5,
    };
    scene.objects.push(createObject("ground", "town/ground"));
    const mainRoad = createObject("road", "town/main-road") as RoadObject;
    mainRoad.label = "Main road";
    mainRoad.x = 0;
    mainRoad.z = 0;
    mainRoad.width = 46;
    mainRoad.depth = 3;
    mainRoad.closed = Boolean(params.roadClosed);
    scene.objects.push(mainRoad);
    for (const b of STATIC_BUILDINGS) {
      if (b.kind === "square") {
        const plaza = createObject("road", b.id) as RoadObject;
        Object.assign(plaza, {
          label: b.label,
          x: b.x,
          z: b.z,
          width: b.w,
          depth: b.d,
          color: b.color,
        });
        scene.objects.push(plaza);
      } else {
        const building = createObject("building", b.id) as BuildingObject;
        Object.assign(building, {
          label: b.kind === "house" ? `House ${b.id.slice(1)}` : b.label,
          x: b.x,
          z: b.z,
          width: b.w,
          depth: b.d,
          height: b.h,
          color: b.color,
          entrance: b.z > 0 ? "north" : "south",
        });
        scene.objects.push(building);
      }
    }
    const market = createObject("building", "market") as BuildingObject,
      location = params.marketNearSchool ? MARKET_NEAR_SCHOOL : MARKET_DEFAULT;
    Object.assign(market, {
      label: "Market",
      x: location.x,
      z: location.z,
      width: 7,
      depth: 1.4,
      height: 2,
    });
    scene.objects.push(market);
    for (let n = 0; n < CITIZEN_COUNT; n++) {
      const person = createObject(
        "person",
        `town/citizen-${n}`,
      ) as PersonObject;
      const home = scene.objects.find(
          (o) => o.id === `h${(n % 6) + 1}`,
        ) as BuildingObject,
        start = entrance(home),
        daytime = n % 3 === 0 ? "school" : "workshop";
      person.label = `Resident ${n + 1}`;
      person.x = start.x;
      person.z = start.y;
      person.schedule = [
        {
          id: `trip-${n}-morning`,
          at: 7,
          target: params.marketBusy ? "market" : daytime,
          x: 0,
          z: 0,
        },
        {
          id: `trip-${n}-lunch`,
          at: 12,
          target: n % 5 < 2 ? "market" : "",
          x: 6,
          z: 3.4,
        },
        { id: `trip-${n}-afternoon`, at: 13, target: daytime, x: 0, z: 0 },
        { id: `trip-${n}-home`, at: 17, target: home.id, x: 0, z: 0 },
      ];
      scene.objects.push(person);
    }
  }
  for (const c of doc.presentation.controls) {
    const target = doc.template === "line" ? scene.objects[0]?.id : "clock",
      property =
        c.capability === "time"
          ? "time"
          : c.capability === "playing"
            ? "playing"
            : c.capability;
    if (
      target &&
      properties(scene.objects.find((o) => o.id === target))[property]
    ) {
      const p = properties(scene.objects.find((o) => o.id === target))[
        property
      ];
      scene.controls.push({
        id: c.id,
        target,
        property,
        label: c.label,
        widget: p.toggle
          ? "toggle"
          : c.widget === "number"
            ? "number"
            : "slider",
        min: Math.max(c.min ?? p.min, p.min),
        max: Math.min(c.max ?? p.max, p.max),
        step: c.step ?? p.step,
        slot: c.slot,
      });
    }
    if (doc.template === "town" && c.capability === "closeRoad")
      scene.controls.push({
        id: c.id,
        target: "town/main-road",
        property: "closed",
        label: "Close main road",
        widget: "toggle",
        min: 0,
        max: 1,
        step: 1,
        slot: c.slot,
      });
  }
  for (const r of doc.presentation.results) {
    const target = doc.template === "line" ? scene.objects[0]?.id : "clock";
    if (target && outputs(scene.objects.find((o) => o.id === target))[r.output])
      scene.measurements.push({
        id: r.id,
        target,
        output: r.output,
        other: "",
        label: r.label,
        precision: r.precision,
        slot: r.slot,
      });
  }
  if (doc.template === "line" && scene.objects.length > 1) {
    for (const [index, o] of scene.objects.entries()) {
      if (index === 0) continue;
      for (const [property, p] of Object.entries(properties(o)))
        scene.controls.push({
          id: `control-line-${index}-${property}`,
          target: o.id,
          property,
          label: `${o.label} ${p.label}`.slice(0, 100),
          widget: "slider",
          min: p.min,
          max: p.max,
          step: p.step,
          slot: "primary",
        });
      for (const r of doc.recipe?.assembly?.observations.filter(
        (r) => r.instance === o.id,
      ) ?? []) {
        const label = outputs(o)[r.output];
        if (label)
          scene.measurements.push({
            id: `result-line-${index}-${r.output}`,
            target: o.id,
            output: r.output,
            other: "",
            label: `${o.label} ${label}`.slice(0, 100),
            precision: 2,
            slot: "primary",
          });
      }
    }
  }
  next.scene = scene;
  next.recipe = null;
  next.presentation.controls = [];
  next.presentation.results = [];
  next.editor.positions = {};
  delete next.editor.groups;
  return next;
}
