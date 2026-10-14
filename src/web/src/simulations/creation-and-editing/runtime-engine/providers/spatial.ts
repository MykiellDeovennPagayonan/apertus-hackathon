import { Building } from "../../../legacy/components/prefabs/Building";
import { Citizen, jitter } from "../../../legacy/components/prefabs/Citizen";
import { Market } from "../../../legacy/components/prefabs/Market";
import { WalkingProfile } from "../../../legacy/components/resources/WalkingProfile";
import {
  BallisticMotionSystem,
  sampleTrajectory,
} from "../../../legacy/components/systems/BallisticMotionSystem";
import type { HeuristicBridgeResponseSystem } from "../../../legacy/components/systems/HeuristicBridgeResponseSystem";
import { compileTown } from "../../../legacy/components/systems/ScheduledTripSystem";
import type { Building as BuildingData } from "../../../legacy/components/traits/Building";
import type { Joint, Member } from "../../../legacy/components/traits/MemberEndpoints";
import type { CompositionScene } from "../composition/types";
import { evaluateTown, stepTown, type TownModelState } from "../../../legacy/runtime/townModel";
import { bridgeResponseFromParts } from "../../../legacy/runtime/trussModel";
import type { RuntimeProvider } from ".";
import { requireValue } from "../../authoring-engine/requireValue";
import type { ComponentInstance } from "../../authoring-engine/document";

type State = Record<string, unknown>;
export type RuntimeInputs = Record<string, unknown[]>;
const data = (s: State, n: ComponentInstance) => ({ data: { ...s, id: n.id } });
const plain: RuntimeProvider = {
  initialize: (n) => structuredClone(n.configuration),
  apply: (s, c, a) => ({ ...s, [c.slice(4)]: a.value }),
  measure: data,
  capture: (s) => s,
};
function projectile(s: State) {
  return BallisticMotionSystem(
    {
      angle: Number(s.angle),
      velocity: Number(s.velocity),
      origin: { x: 0, y: 0 },
    },
    Number(s.gravity),
    Number(s.elapsed),
  );
}
const projectileProvider: RuntimeProvider = {
  initialize: (n) => ({ ...n.configuration, elapsed: 0, samples: [] }),
  apply: (s, c, a) =>
    c === "LAUNCH"
      ? { ...s, playing: true, elapsed: 0, samples: [] }
      : c === "RESTART"
        ? { ...s, elapsed: 0, samples: [] }
        : {
            ...s,
            [c.slice(4)]: a.value,
            ...(["set:angle", "set:velocity", "set:gravity"].includes(c)
              ? { elapsed: 0, samples: [] }
              : {}),
          },
  measure: (s, n) => {
    const p = projectile(s);
    return {
      ...p.metrics,
      elapsed: s.elapsed,
      samples: s.samples,
      trajectory: sampleTrajectory(
        Number(s.velocity),
        Number(s.angle),
        Number(s.gravity),
      ),
      data: {
        ...s,
        ...p,
        id: n.id,
        launch: {
          angle: s.angle,
          velocity: s.velocity,
          origin: { x: 0, y: 0 },
        },
      },
      configuration: projectileProvider.capture?.(s),
    };
  },
  step: (s, delta) => {
    if (!s.playing) return s;
    const elapsed = Math.min(
      projectile(s).metrics.duration,
      Number(s.elapsed) + delta * (s.slowMo ? 0.25 : 1),
    );
    const next = { ...s, elapsed };
    const samples = [...(s.samples as State[])];
    const last = Number(samples.at(-1)?.time ?? -0.1);
    // Fixed sampling times make data independent of display count and frame partitioning.
    for (
      let time = Math.round((last + 0.1) * 10) / 10;
      time <= elapsed + 1e-9;
      time = Math.round((time + 0.1) * 10) / 10
    ) {
      const p = projectile({ ...s, elapsed: time });
      samples.push({
        time,
        x: p.transform.position.x,
        y: p.transform.position.y,
      });
    }
    return { ...next, samples: samples.slice(-1000) };
  },
  capture: (s) =>
    Object.fromEntries(
      [
        "angle",
        "velocity",
        "gravity",
        "playing",
        "slowMo",
        "trajectoryVisible",
        "showVectors",
      ].map((k) => [k, s[k]]),
    ),
};
function bridgeState(
  s: State,
  inputs: RuntimeInputs,
  n: ComponentInstance,
): State {
  const joints = (inputs.joints ?? []) as Joint[],
    members = (inputs.members ?? []) as Member[],
    load = inputs.load?.[0] as
      | { id: string; position: number; magnitude: number }
      | undefined;
  if (!joints.length || !members.length || !load) return { ...s, ready: false };
  const { truss, response, removed } = bridgeResponseFromParts(
    { spanScale: Number(s.spanScale), dense: Boolean(s.dense) },
    joints,
    members,
    load,
    n.id,
    n.label,
  );
  if (
    s.selectedMember &&
    !response.members.some((m) => m.id === s.selectedMember)
  )
    s = { ...s, selectedMember: null };
  return {
    ...s,
    ready: true,
    truss,
    response,
    loadPos: load.position,
    loadTons: load.magnitude,
    removedMember: removed,
    buildNonce: 0,
  };
}
function townState(
  s: State,
  inputs: RuntimeInputs,
  _n: ComponentInstance,
): State {
  const buildings = (inputs.buildings ?? []) as BuildingData[],
    routines = (inputs.routines ?? []) as (State & {
      id: string;
      homeId: string;
      daytimeId: string;
      squareId: string;
      role: "student" | "worker";
      seed: number;
    })[],
    market = inputs.market?.[0] as
      | { id: string; nearSchool: boolean; busy: boolean }
      | undefined;
  if (!buildings.length || !market) return { ...s, ready: false };
  const signature = JSON.stringify([
    buildings.map(({ color: _color, h: _height, ...b }) => b),
    routines,
    market,
  ]);
  const entities = buildings.map((b) => Building(b.id, b));
  if (s.signature === signature) return { ...s, buildings: entities };
  const entrances = new Map(entities.map((b) => [b.id, b.entrance]));
  const citizens = routines.map((r) => {
    if (
      !entrances.has(r.homeId) ||
      !entrances.has(r.daytimeId) ||
      !entrances.has(r.squareId)
    )
      throw new Error(
        `${r.id}: connect the home, daytime and square buildings to this town`,
      );
    const home = requireValue(entrances.get(r.homeId));
    return {
      ...Citizen(r.id, "h1", r.role, r.seed),
      homeId: r.homeId,
      daytimeId: r.daytimeId,
      squareId: r.squareId,
      marketId: market.id,
      home,
      pos: jitter(home, r.seed),
      speed: WalkingProfile.baseSpeed + r.seed * WalkingProfile.speedVariation,
    };
  });
  const next = {
    ...s,
    ready: true,
    signature,
    buildings: entities,
    citizens,
    market: Market(market.id, market.nearSchool),
    marketNearSchool: market.nearSchool,
    marketBusy: market.busy,
  } as unknown as TownModelState;
  evaluateTown(next, true);
  return next as unknown as State;
}
const townProvider: RuntimeProvider = {
  initialize: (n) => ({ ...n.configuration, ready: false }),
  synchronize: townState,
  apply: (s, c, a) => {
    const next = {
      ...s,
      [c.slice(4)]: c === "set:time" ? Number(a.value) % 24 : a.value,
    };
    if (next.ready)
      evaluateTown(next as unknown as TownModelState, c === "set:roadClosed");
    return next;
  },
  measure: (s, n) => ({
    ...data(s, n),
    time: s.time,
    population: (s.citizens as unknown[] | undefined)?.length ?? 0,
    activity: (
      (s.citizens ?? []) as { id: string; behavior: { activity: string } }[]
    ).map((c) => ({ id: c.id, activity: c.behavior.activity })),
  }),
  step: (s, delta) => {
    if (!s.ready || !s.playing) return s;
    const next = stepTown(s as unknown as TownModelState, delta);
    return { ...s, time: next.time, citizens: next.citizens };
  },
  capture: (s) =>
    Object.fromEntries(
      ["time", "playing", "speed", "roadClosed"].map((k) => [k, s[k]]),
    ),
};
export const spatialProviders = new Map<string, RuntimeProvider>([
  ["models/Projectile", projectileProvider],
  ["models/TrussJoint", plain],
  ["models/TrussMember", plain],
  [
    "models/BridgeLoad",
    {
      ...plain,
      apply: (s, c, a) => ({
        ...s,
        [c === "MOVE_LOAD" ? "position" : "magnitude"]: a.value,
      }),
    },
  ],
  [
    "models/BridgeResponse",
    {
      initialize: (n) => ({
        ...n.configuration,
        selectedMember: null,
        ready: false,
      }),
      synchronize: bridgeState,
      apply: (s, _c, a) => {
        if (
          a.value &&
          !(
            s.response as
              | ReturnType<typeof HeuristicBridgeResponseSystem>
              | undefined
          )?.members.some((m) => m.id === a.value)
        )
          throw new Error("Unknown or absent member");
        return { ...s, selectedMember: a.value || null };
      },
      measure: (s, n) => ({
        ...data(s, n),
        response: s.response,
        selected: s.selectedMember
          ? {
              member: (
                s.response as ReturnType<typeof HeuristicBridgeResponseSystem>
              ).members.find((m) => m.id === s.selectedMember),
              response: (
                s.response as ReturnType<typeof HeuristicBridgeResponseSystem>
              ).responses[String(s.selectedMember)],
            }
          : "Select a bridge member",
      }),
    },
  ],
  ["models/TownBuilding", plain],
  ["models/DailyRoutine", plain],
  [
    "models/Market",
    {
      ...plain,
      apply: (s, c) => ({
        ...s,
        [c === "MOVE_MARKET" ? "nearSchool" : "busy"]: true,
      }),
    },
  ],
  ["models/TownNavigation", townProvider],
]);

const timelines = new Map<string, ReturnType<typeof compileTown>>();
spatialProviders.set("models/ScheduledTrip", {
  initialize: (n) => ({ ...n.configuration, people: [] }),
  synchronize: (s, inputs) => {
    const scene: CompositionScene = {
      version: 2,
      kind: "town",
      canvas: { xMin: -5, xMax: 5, yMin: -5, yMax: 5, grid: true, snap: 0.5 },
      objects: (inputs.objects ?? []) as unknown as CompositionScene["objects"],
      controls: [],
      measurements: [],
      clock: {
        start: Number(s.time),
        playing: Boolean(s.playing),
        speed: Number(s.speed),
        secondsPerHour: Number(s.secondsPerHour),
      },
    };
    const key = JSON.stringify([scene.objects, s.secondsPerHour]);
    let timeline = timelines.get(key);
    if (!timeline) {
      timeline = compileTown(scene);
      if (timelines.size >= 8)
        timelines.delete(requireValue(timelines.keys().next().value));
      timelines.set(key, timeline);
    }
    return { ...s, scene, people: timeline(Number(s.time)) };
  },
  apply: (s, c, a) => ({
    ...s,
    [c.slice(4)]: a.value,
    ...(c === "set:time" ? { playing: false } : {}),
  }),
  measure: (s) => ({ data: s, time: s.time, people: s.people }),
  step: (s, delta) =>
    s.playing
      ? {
          ...s,
          time:
            (Number(s.time) +
              (delta * Number(s.speed)) / Number(s.secondsPerHour)) %
            24,
        }
      : s,
  capture: (s) =>
    Object.fromEntries(
      ["time", "playing", "speed", "secondsPerHour"].map((k) => [k, s[k]]),
    ),
});
