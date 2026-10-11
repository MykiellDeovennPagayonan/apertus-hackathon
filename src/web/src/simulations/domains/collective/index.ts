import {
  advanceCrowd,
  type CrowdState,
  crowdCaption,
  crowdDefaults,
  initializeCrowd,
} from "../../components/systems/collective/crowd";
import {
  type FishingState,
  fishingCaption,
  fishingDay,
  fishingDefaults,
  initializeFishing,
} from "../../components/systems/collective/fishing";
import {
  initializeSelection,
  type SelectionState,
  selectionCaption,
  selectionDefaults,
  selectionGeneration,
} from "../../components/systems/collective/selection";
import {
  initializeVoting,
  type VotingState,
  votingCaption,
  votingDefaults,
  votingRound,
} from "../../components/systems/collective/voting";
import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
export const collectiveKinds = [
  "fishing",
  "crowd",
  "voting",
  "selection",
] as const;
export type CollectiveKind = (typeof collectiveKinds)[number];
export const command = (kind: CollectiveKind, action: string) =>
  `COL_${kind.toUpperCase()}_${action}`;
const arr = (
  items: ParameterSchema,
  minItems: number,
  maxItems: number,
): ParameterSchema => ({ type: "array", items, minItems, maxItems });
const configs = {
  fishing: object({
    initialStock: num(0, 10000, "fish", true),
    arrangement: choice(0, 1, 2),
    visibility: choice(0, 1),
    policy: choice(0, 1, 2),
    quota: boolean,
  }),
  crowd: object({
    count: num(1, 300, "people", true),
    seed: num(1, 999999, "", true),
    placement: choice(0, 1, 2),
    friction: num(0, 0.99),
    radius: num(0.5, 2),
  }),
  voting: object({
    groups: arr(num(0, 500, "people", true), 3, 3),
    candidateCount: num(2, 5, "candidates", true),
    ballots: arr(
      object({
        ranking: arr(num(0, 4, "", true), 0, 5),
        approvals: arr(num(0, 4, "", true), 0, 5),
      }),
      0,
      500,
    ),
    rule: choice(0, 1, 2),
    seed: num(1, 999999, "", true),
  }),
  selection: object({
    initialCount: num(1, 200, "organisms", true),
    habitat: num(0, 1),
    mutationRate: num(0, 1),
    mutationSize: num(0, 0.5),
    uniform: boolean,
    initialTrait: num(0, 1),
    selection: boolean,
    cap: num(1, 200, "organisms", true),
    seed: num(1, 999999, "", true),
  }),
};
const defaults = {
  fishing: fishingDefaults,
  crowd: crowdDefaults,
  voting: votingDefaults,
  selection: selectionDefaults,
};
const names = {
  fishing: "Shared fishing lake",
  crowd: "Crowd flow and obstacles",
  voting: "Alternate voting systems",
  selection: "Natural selection",
};
const assumptions = {
  fishing: [
    "Five fishermen share a stock. Births happen first: floor(opening stock / 100) each day; catches are simultaneous integer requests.",
    "Four each sustains only the initial 2,000 stock. No mortality, carrying capacity or fractional birth carry. Behavior policies are explicit rules, not predictions of people.",
  ],
  crowd: [
    "Illustrative synchronous floor-field model with conflict friction and turning delay; one person per cell. Model steps are not measured real evacuation seconds.",
    "Matched initial populations; obstacles can help, hinder, or leave flow similar. No pressure, injury or building-safety prediction.",
  ],
  voting: [
    "Two to five fictional candidates (three by default), one elected position. Preferences are fixed; transfers change the counted allocation, not the voter's mind.",
    "Approval sets are explicit. Active-ballot majorities exclude exhausted ballots; a seeded tie order is recorded before counting.",
  ],
  selection: [
    "A fictional single-parent quantitative-trait model. Survival probability is 0.2+0.6*(1-abs(trait-habitat)); each survivor proposes two offspring.",
    "Mutations are random, not directed by need. Parents retire at generation replacement; population cap sampling introduces chance. No speciation or Mendelian genetics.",
  ],
};
function initialize(
  kind: CollectiveKind,
  c: Record<string, unknown>,
): Record<string, unknown> {
  validateValue(configs[kind], c);
  if (kind === "fishing")
    return initializeFishing(c as unknown as FishingState) as unknown as Record<
      string,
      unknown
    >;
  if (kind === "crowd")
    return initializeCrowd(c as unknown as CrowdState) as unknown as Record<
      string,
      unknown
    >;
  if (kind === "voting") {
    if ((c.groups as number[]).reduce((a, b) => a + b, 0) > 500)
      throw new Error("Use at most 500 voters.");
    return initializeVoting(c as unknown as VotingState) as unknown as Record<
      string,
      unknown
    >;
  }
  return initializeSelection(
    c as unknown as SelectionState,
  ) as unknown as Record<string, unknown>;
}
function configuration(
  kind: CollectiveKind,
  s: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(Object.keys(defaults[kind]).map((k) => [k, s[k]]));
}
function apply(
  kind: CollectiveKind,
  s: Record<string, unknown>,
  action: string,
  value: unknown,
): Record<string, unknown> {
  const op = action.replace(`COL_${kind.toUpperCase()}_`, "");
  if (op === "RESTART") return initialize(kind, configuration(kind, s));
  if (op.startsWith("SET_")) {
    const edit = { key: op.slice(4), value };
    if (!Object.hasOwn(defaults[kind], edit.key))
      throw new Error("Unknown condition");
    const config = { ...configuration(kind, s), [edit.key]: edit.value };
    validateValue(configs[kind], config);
    if (s.playing) throw new Error("Pause before changing conditions.");
    if (
      kind === "crowd" ||
      (kind === "fishing" && edit.key === "initialStock") ||
      (kind === "voting" && edit.key !== "rule") ||
      (kind === "selection" &&
        ["initialCount", "uniform", "initialTrait", "seed", "cap"].includes(
          edit.key,
        ))
    )
      return initialize(kind, config);
    if (kind === "voting") return { ...s, ...config, rounds: [], done: false };
    return { ...s, ...config };
  }
  if (op === "COMPLETE") {
    if (kind === "fishing") {
      let n = s as unknown as FishingState;
      for (let i = 0; i < 30; i++) n = fishingDay(n);
      return { ...n, playing: false } as unknown as Record<string, unknown>;
    }
    if (kind === "crowd") {
      let n = s as unknown as CrowdState;
      for (
        let i = 0;
        i < 2000 && n.lanes.some((l) => l.people.length && l.ticks < 2000);
        i++
      )
        n = advanceCrowd(n);
      return { ...n, playing: false } as unknown as Record<string, unknown>;
    }
    if (kind === "selection")
      return selectionGeneration(
        s as unknown as SelectionState,
      ) as unknown as Record<string, unknown>;
    return votingRound(s as unknown as VotingState) as unknown as Record<
      string,
      unknown
    >;
  }
  if (op === "PAUSE")
    return {
      ...s,
      playing: false,
      ...(kind === "selection" ? { phase: 0 } : {}),
    };
  if (kind === "voting" && (op === "RUN" || op === "STEP"))
    return votingRound(s as unknown as VotingState) as unknown as Record<
      string,
      unknown
    >;
  if (kind === "fishing") {
    const state = s as unknown as FishingState;
    if (op === "STEP")
      return fishingDay(state) as unknown as Record<string, unknown>;
    if (op === "RUN") return { ...s, playing: true, remaining: 30, elapsed: 0 };
  }
  if (kind === "crowd") {
    if (op === "STEP")
      return advanceCrowd(s as unknown as CrowdState) as unknown as Record<
        string,
        unknown
      >;
    if (op === "RUN") return { ...s, playing: true };
  }
  if (kind === "selection" && (op === "RUN" || op === "STEP")) {
    const next = selectionGeneration(s as unknown as SelectionState);
    if (next.generation === s.generation)
      return { ...s, playing: false, phase: 0 };
    return {
      ...next,
      phase: next.events.length ? 1 : 0,
      playing: next.events.length > 0,
      elapsed: 0,
    } as unknown as Record<string, unknown>;
  }
  throw new Error("Unsupported action");
}
function step(
  kind: CollectiveKind,
  s: Record<string, unknown>,
  delta: number,
): Record<string, unknown> {
  if (!s.playing) return s;
  if (kind === "fishing") {
    let n = {
      ...s,
      elapsed: Number(s.elapsed) + delta,
    } as unknown as FishingState;
    while (n.elapsed >= 0.12 && n.remaining > 0 && n.playing) {
      n = fishingDay({
        ...n,
        elapsed: n.elapsed - 0.12,
        remaining: n.remaining - 1,
      });
    }
    return { ...n, playing: n.playing && n.remaining > 0 } as unknown as Record<
      string,
      unknown
    >;
  }
  if (kind === "crowd") {
    let n = {
      ...s,
      elapsed: Number(s.elapsed) + delta,
    } as unknown as CrowdState;
    while (n.elapsed >= 0.018 && n.playing)
      n = advanceCrowd({ ...n, elapsed: n.elapsed - 0.018 });
    return n as unknown as Record<string, unknown>;
  }
  if (kind === "selection") {
    const elapsed = Number(s.elapsed) + delta;
    return {
      ...s,
      elapsed,
      phase: elapsed < 0.65 ? 1 : elapsed < 1.45 ? 2 : 0,
      playing: elapsed < 1.8,
    };
  }
  return s;
}
export function caption(
  kind: CollectiveKind,
  s: Record<string, unknown>,
): string {
  if (kind === "fishing") return fishingCaption(s as unknown as FishingState);
  if (kind === "crowd") return crowdCaption(s as unknown as CrowdState);
  if (kind === "voting") return votingCaption(s as unknown as VotingState);
  return selectionCaption(s as unknown as SelectionState);
}
export const collectiveModels: DomainModel[] = collectiveKinds.map((kind) => ({
  ref: `prefabs/collective/${kind}`,
  version: 1,
  name: names[kind],
  presentation: `collective-${kind}`,
  description:
    kind === "fishing"
      ? "Overfishing a shared lake: five fishermen, daily reproduction, catch agreements, visibility and reciprocal behavior."
      : kind === "crowd"
        ? "Matched pedestrian dot crowds leaving through a narrow door, with and without a pillar; conditional obstacle effects."
        : kind === "voting"
          ? "Individual voter dots compare first-past-the-post, ranked choice instant-runoff and approval voting; fixed preferences and visible transfers."
          : "Organism dots survive by camouflage, reproduce with inherited traits and random mutations, and spawn distinct generations.",
  tags:
    kind === "selection"
      ? [
          "natural selection",
          "evolution",
          "inheritance",
          "offspring",
          "camouflage",
        ]
      : kind === "crowd"
        ? ["crowd", "exit", "obstacle", "pillar", "evacuation"]
        : kind === "fishing"
          ? ["fish", "overfishing", "lake", "commons"]
          : ["vote", "voting", "ranked choice", "approval"],
  assumptions: assumptions[kind],
  parameters: configs[kind],
  defaults: { ...defaults[kind] },
  maximumInstances: 4,
  requiredObservations: [],
  outputs: {
    scene: {
      unit: `collective/${kind}`,
      description: "Compact accepted activity state for controls and caption",
    },
    caption: { unit: "1", description: "One timely learner explanation" },
  },
  actions: Object.fromEntries([
    ...["RUN", "STEP", "PAUSE", "RESTART", "COMPLETE"].map((op) => [
      command(kind, op),
      {
        arguments: object({}),
        description:
          op === "RUN"
            ? kind === "voting"
              ? "Count the next round"
              : kind === "selection"
                ? "Show the next generation"
                : "Run the bounded activity"
            : op === "RESTART"
              ? "Restart with current conditions"
              : "Pause or advance this instance",
        timing: "live" as const,
        target: "instance" as const,
      },
    ]),
    ...Object.entries(
      (configs[kind] as Extract<ParameterSchema, { type: "object" }>)
        .properties,
    ).map(([key, schema]) => [
      command(kind, `SET_${key}`),
      {
        arguments: object({ value: schema }),
        description: `Change ${key}; starting-population edits restart the run`,
        timing:
          kind === "crowd" ||
          (kind === "voting" && key !== "rule") ||
          (kind === "fishing" && key === "initialStock") ||
          (kind === "selection" &&
            ["initialCount", "uniform", "initialTrait", "seed", "cap"].includes(
              key,
            ))
            ? ("relaunch" as const)
            : ("live" as const),
        target: "instance" as const,
      },
    ]),
  ]),
  dependencies: {
    resources: [],
    traits: [],
    behaviors: [],
    systems: [],
    visuals: [],
    views: [],
    controls: [],
    prefabs: [],
    compositions: [],
  },
  initialize: (c) => initialize(kind, { ...defaults[kind], ...c }),
  reconfigure: (s, c) => {
    validateValue(configs[kind], c);
    const changed = Object.keys(defaults[kind]).filter(
      (key) => JSON.stringify(s[key]) !== JSON.stringify(c[key]),
    );
    if (!changed.length) return s;
    const restart =
      kind === "crowd" ||
      (kind === "fishing" && changed.includes("initialStock")) ||
      (kind === "voting" && changed.some((k) => k !== "rule")) ||
      (kind === "selection" &&
        changed.some((k) =>
          ["initialCount", "uniform", "initialTrait", "seed", "cap"].includes(
            k,
          ),
        ));
    if (restart) return initialize(kind, c);
    let next: Record<string, unknown> = {
      ...s,
      playing: false,
      ...(kind === "selection" ? { phase: 0 } : {}),
    };
    for (const key of changed)
      next = apply(kind, next, command(kind, `SET_${key}`), c[key]);
    return next;
  },
  configuration: (s) => configuration(kind, s),
  apply: (s, a, v) => apply(kind, s, a, v),
  measure: (s) => ({
    scene: {
      kind,
      playing: Boolean(s.playing),
      phase: Number(s.phase ?? 0),
      day: Number(s.day ?? 0),
      generation: Number(s.generation ?? 0),
      done: Boolean(s.done),
      round: Array.isArray(s.rounds) ? s.rounds.length : 0,
      ...Object.fromEntries(
        Object.entries(configuration(kind, s)).filter(
          ([key]) => key !== "ballots",
        ),
      ),
    },
    caption: caption(kind, s),
  }),
  step: kind === "voting" ? undefined : (s, d) => step(kind, s, d),
}));
export const collective: DomainContribution = {
  namespace: "collective",
  version: 1,
  models: collectiveModels,
};
