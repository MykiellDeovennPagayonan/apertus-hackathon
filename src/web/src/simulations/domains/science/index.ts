import {
  clamp,
  event,
  type ScienceSpec,
  type ScienceState,
} from "../../components/systems/science/contracts";
import {
  environmentObservation,
  environmentStep,
} from "../../components/systems/science/environment";
import {
  lifeObservation,
  lifeStep,
} from "../../components/systems/science/life";
import { requireValue } from "../../runtime/authoring/requireValue";
import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import {
  boolean,
  choice,
  num,
  object,
  validateValue,
} from "../../runtime/parameterSchema";
import { scienceKeywords, scienceSpec, scienceSpecs } from "./specs";

export { scienceSpec, scienceSpecs } from "./specs";
export const scienceObservation = (s: ScienceState) =>
  ["cell", "immune", "genome", "pollination"].includes(s.kind)
    ? lifeObservation(s)
    : environmentObservation(s);
export const scienceCommand = (kind: string, action: string) =>
  `SCI_${kind.toUpperCase()}_${action}`;
export function initializeScience(
  spec: ScienceSpec,
  settings: Record<string, number>,
  seed = 17,
): ScienceState {
  const s: ScienceState = {
    kind: spec.kind,
    time: 0,
    playing: false,
    speed: 1,
    selected: 0,
    overlay: true,
    fraction: 0,
    seed,
    settings: { ...settings },
    events: [],
  };
  if (spec.kind === "immune")
    s.immune = {
      burden: 0,
      antibodies: 0,
      memory: [],
      exposure: 0,
      firstPeak: 0,
      firstClearance: 0,
      challengeMemory: false,
      clearance: 0,
    };
  if (spec.kind === "genome") s.offspring = [];
  if (spec.kind === "pollination")
    s.pollen = {
      loads: [0, 0, 0, 0],
      origins: [-1, -1, -1, -1],
      visits: Array(6).fill(0),
      transfers: Array(6).fill(0),
      fertilized: Array(6).fill(0),
      fruits: Array(6).fill(0),
    };
  if (spec.kind === "invasive")
    s.invasive = {
      origin: -1,
      cover: Array(24).fill(0),
      native: Array(24).fill(100),
      propagules: Array(24).fill(0),
      sources: Array(24).fill(-1),
      treated: Array(24).fill(0),
      effort: 8,
    };
  if (spec.kind === "volcano")
    s.volcano = { reservoir: 100, supplied: 0, lava: 0, ash: 0, activity: 0 };
  if (spec.kind === "water")
    s.water = {
      tracer: 0,
      trace: [0],
      atmosphere: 35,
      surface: 10,
      soil: 65,
      ground: 100,
      river: 20,
      input: 0,
      output: 0,
      runoff: 0,
      infiltration: 0,
      evaporation: 0,
      discharge: 0,
    };
  return s;
}
export function scienceAdvance(s: ScienceState): ScienceState {
  if (s.time >= scienceSpec(s.kind).limit) return { ...s, playing: false };
  const n = ["cell", "immune", "genome", "pollination"].includes(s.kind)
    ? lifeStep(s)
    : environmentStep(s);
  return n.time >= scienceSpec(s.kind).limit ? { ...n, playing: false } : n;
}
function makeModel(spec: ScienceSpec): DomainModel {
  const settingsSchema = object(
    Object.fromEntries(
      spec.settings.map((f) => [f.key, num(f.min, f.max, "1", true)]),
    ),
  );
  const parameters = object(
    { settings: settingsSchema, seed: num(1, 999999, "1", true) },
    ["settings", "seed"],
  );
  const defaults = {
    settings: Object.fromEntries(spec.settings.map((f) => [f.key, f.initial])),
    seed: 17,
  };
  const action = (
    argumentsSchema: ReturnType<typeof object>,
    description: string,
  ) => ({
    arguments: argumentsSchema,
    description,
    timing: "live" as const,
    target: "instance" as const,
  });
  const operations = {
    STEP: action(object({}), spec.step),
    PLAY: action(object({}), "Play"),
    PAUSE: action(object({}), "Pause"),
    RESTART: action(
      object({}),
      "Restart with the current conditions, seed, and retained baseline",
    ),
    SET: action(
      object({
        value: object({
          key: choice(...spec.settings.map((f) => f.key)),
          value: num(0, 100, "1", true),
        }),
      }),
      "Change a supported scientific condition",
    ),
    SELECT: action(
      object({ value: num(0, 29, "1", true) }),
      "Inspect a named object",
    ),
    SPEED: action(object({ value: choice(0.5, 1, 2) }), "Set playback speed"),
    OVERLAY: action(object({ value: boolean }), "Show labels and pathways"),
    BASELINE: action(
      object({}),
      "Keep this baseline and restart a matched run",
    ),
    EXPOSE: action(object({}), "Introduce or repeat a pathogen exposure"),
    INTRODUCE: action(object({}), "Introduce propagules at the selected patch"),
    REMOVE: action(object({}), "Remove invasive cover at the selected patch"),
    RESTORE: action(object({}), "Restore native cover at the selected patch"),
  };
  const common = [
    "STEP",
    "PLAY",
    "PAUSE",
    "RESTART",
    "SET",
    "SELECT",
    "SPEED",
    "OVERLAY",
    "BASELINE",
  ];
  const admitted = [
    ...common,
    ...(spec.kind === "immune"
      ? ["EXPOSE"]
      : spec.kind === "invasive"
        ? ["INTRODUCE", "REMOVE", "RESTORE"]
        : []),
  ];
  return {
    ref: `prefabs/science/${spec.name}`,
    version: 1,
    name: spec.title,
    description: spec.question,
    assumptions: spec.assumptions,
    tags: scienceKeywords[spec.kind],
    parameters,
    defaults,
    maximumInstances: 4,
    presentation: `science-${spec.kind}`,
    requiredObservations: [
      "stage",
      "summary",
      "explanation",
      "inspection",
      "timeline",
    ],
    actions: {
      ...Object.fromEntries(
        admitted.map((k) => [
          scienceCommand(spec.kind, k),
          operations[k as keyof typeof operations],
        ]),
      ),
      ...Object.fromEntries(
        spec.settings.map((f) => [
          scienceCommand(spec.kind, `SET_${f.key.toUpperCase()}`),
          {
            ...action(
              object({
                value: f.options
                  ? choice(...f.options.map((_, i) => i))
                  : num(f.min, f.max, "1", true),
              }),
              f.label,
            ),
            ...(f.restart ? { timing: "rebuild" as const } : {}),
          },
        ]),
      ),
    },
    outputs: {
      scene: { unit: "1", description: "Inspectable accepted science scene" },
      stage: {
        unit: "1",
        description: "Current stage",
        schema: { type: "string", maxLength: 500 },
      },
      summary: {
        unit: "1",
        description: "Key observations",
        schema: { type: "string", maxLength: 500 },
      },
      explanation: {
        unit: "1",
        description: "Why the outcome changes",
        schema: { type: "string", maxLength: 500 },
      },
      inspection: {
        unit: "1",
        description: "Selected object identity, state and process",
        schema: { type: "string", maxLength: 500 },
      },
      timeline: {
        unit: "1",
        description: "Recent authoritative events",
        schema: { type: "string", maxLength: 500 },
      },
    },
    dependencies: {
      resources: [],
      traits: [],
      behaviors: [],
      systems: [],
      visuals: [],
      views: ["AssemblyScene", "AssemblyTable"],
      controls: ["AssemblyControls"],
      prefabs: [],
      compositions: [],
    },
    initialize: (p) => {
      validateValue(parameters, p);
      return initializeScience(
        spec,
        { ...defaults.settings, ...(p.settings as Record<string, number>) },
        Number(p.seed ?? 17),
      ) as unknown as Record<string, unknown>;
    },
    configuration: (state) => ({
      settings: { ...(state as unknown as ScienceState).settings },
      seed: state.seed,
    }),
    apply: (state, command, value) => {
      const s = state as unknown as ScienceState,
        setter = spec.settings.find(
          (f) =>
            scienceCommand(spec.kind, `SET_${f.key.toUpperCase()}`) === command,
        );
      if (setter) {
        validateValue(
          num(setter.min, setter.max, "1", true),
          value,
          setter.label,
        );
        if (setter.key === "antigen" && s.immune?.burden)
          throw new Error(
            "Finish this exposure before choosing a different antigen.",
          );
        const settings = { ...s.settings, [setter.key]: Number(value) };
        const changed = setter.restart
          ? {
              ...initializeScience(spec, settings, s.seed),
              baseline: s.baseline,
            }
          : event(
              { ...s, settings },
              `${setter.label} changed to ${setter.options?.[Number(value)] ?? value}.`,
            );
        changed.selected = Math.min(
          changed.selected,
          scienceObservation(changed).objects.length - 1,
        );
        if (setter.key === "classification") changed.selected = 0;
        return changed as unknown as Record<string, unknown>;
      }
      const op = admitted.find((k) => scienceCommand(spec.kind, k) === command);
      if (!op) throw new Error("Unsupported science action");
      validateValue(
        operations[op as keyof typeof operations].arguments,
        value === undefined ? {} : { value },
      );
      let n: ScienceState = { ...s };
      if (op === "STEP") n = scienceAdvance({ ...s, playing: false });
      if (op === "PLAY") {
        if (s.kind === "genome")
          throw new Error("Breed offspring one at a time.");
        if (
          s.kind === "immune" &&
          (!requireValue(s.immune).exposure || !requireValue(s.immune).burden)
        )
          throw new Error("Introduce a pathogen before playback.");
        n.playing = s.time < spec.limit;
      }
      if (op === "PAUSE") n.playing = false;
      if (op === "RESTART")
        n = {
          ...initializeScience(spec, s.settings, s.seed),
          baseline: s.baseline,
        };
      if (op === "SPEED") n.speed = Number(value);
      if (op === "OVERLAY") n.overlay = Boolean(value);
      if (op === "SELECT") {
        const count = scienceObservation(s).objects.length;
        if (Number(value) >= count)
          throw new Error("Choose an available object.");
        n.selected = Number(value);
      }
      if (op === "SET") {
        const v = value as { key: string; value: number },
          field = spec.settings.find((f) => f.key === v.key)!;
        validateValue(
          num(field.min, field.max, "1", true),
          v.value,
          field.label,
        );
        if (v.key === "antigen" && s.immune?.burden)
          throw new Error(
            "Finish this exposure before choosing a different antigen.",
          );
        n.settings = { ...s.settings, [v.key]: v.value };
        if (field.restart)
          n = {
            ...initializeScience(spec, n.settings, s.seed),
            baseline: s.baseline,
          };
        if (v.key === "classification") n.selected = 0;
        n.selected = Math.min(
          n.selected,
          scienceObservation(n).objects.length - 1,
        );
        n = event(
          n,
          `${field.label} changed to ${field.options?.[v.value] ?? v.value}${field.restart ? " · scenario restarted" : ""}.`,
        );
      }
      if (op === "BASELINE") {
        const obs = scienceObservation(s);
        n = {
          ...initializeScience(spec, s.settings, s.seed),
          baseline: {
            snapshot: structuredClone({ ...s, baseline: undefined }),
            time: s.time,
            settings: { ...s.settings },
            seed: s.seed,
            metrics: obs.metrics,
            caption: obs.stage,
          },
        };
      }
      if (op === "EXPOSE") {
        const d = requireValue(s.immune);
        if (d.burden > 0)
          throw new Error(
            "Finish the current exposure before another challenge.",
          );
        n = event(
          {
            ...s,
            time: 0,
            playing: false,
            fraction: 0,
            immune: {
              ...d,
              burden: s.settings.dose,
              antibodies: 0,
              exposure: d.exposure + 1,
              challengeMemory: d.memory.includes(s.settings.antigen),
              clearance: 0,
            },
          },
          `Exposure ${d.exposure + 1}: ${s.settings.antigen ? "diamond" : "triangle"} antigen, dose ${s.settings.dose}.`,
        );
      }
      if (["INTRODUCE", "REMOVE", "RESTORE"].includes(op)) {
        const d = structuredClone(requireValue(s.invasive));
        if (!d.effort)
          throw new Error(
            "No intervention effort remains; restart for a new investigation.",
          );
        const i = s.selected;
        d.effort--;
        if (op === "INTRODUCE") {
          d.origin = i;
          d.propagules[i] += 4;
          d.sources[i] = i;
        }
        if (op === "REMOVE") {
          d.cover[i] = 0;
          d.treated[i] = 1;
          if (!s.settings.residual) d.propagules[i] = 0;
        }
        if (op === "RESTORE") d.native[i] = 100;
        n = event(
          { ...s, invasive: d },
          `${op === "INTRODUCE" ? "Introduced seeds" : op === "REMOVE" ? "Removed cover" : "Restored native cover"} in patch ${i + 1}${op === "REMOVE" && s.settings.residual ? " · seeds remain" : ""}.`,
        );
      }
      return n as unknown as Record<string, unknown>;
    },
    step: (state, delta) => {
      let s = state as unknown as ScienceState;
      if (!s.playing || delta <= 0 || !Number.isFinite(delta)) return state;
      s = { ...s, fraction: s.fraction + Math.min(delta, 0.25) * s.speed };
      if (s.fraction >= 1.1)
        s = scienceAdvance({ ...s, fraction: s.fraction - 1.1 });
      return s as unknown as Record<string, unknown>;
    },
    measure: (state) => {
      const s = state as unknown as ScienceState,
        obs = scienceObservation(s),
        selected = obs.objects[Math.min(s.selected, obs.objects.length - 1)];
      return {
        scene: {
          kind: s.kind,
          time: s.time,
          playing: s.playing,
          speed: s.speed,
          selected: s.selected,
          overlay: s.overlay,
          settings: s.settings,
          objects: obs.objects.map((o) => o.name),
          baseline: s.baseline
            ? { time: s.baseline.time, metrics: s.baseline.metrics }
            : null,
        },
        stage: obs.stage,
        summary: obs.metrics.join("  ·  "),
        explanation: obs.explanation,
        inspection: selected
          ? `${selected.name}: ${selected.state}. ${selected.why}`
          : "Select an object to inspect.",
        timeline: s.events.length
          ? s.events.slice(-3).join(" → ").slice(0, 490)
          : spec.invitation,
      };
    },
  };
}
export const scienceModels = scienceSpecs.map(makeModel);
export const science: DomainContribution = {
  namespace: "science",
  version: 1,
  models: scienceModels,
};
