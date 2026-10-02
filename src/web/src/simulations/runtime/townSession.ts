import { create, type StateCreator } from "zustand";
import { TownExperiment } from "../components/compositions/TownExperiment";
import { Building } from "../components/prefabs/Building";
import { Citizen as createCitizen } from "../components/prefabs/Citizen";
import { Market } from "../components/prefabs/Market";
import { TownLayout } from "../components/resources/TownLayout";
import { BehaviorRunnerSystem } from "../components/systems/BehaviorRunnerSystem";
import { NavigationSystem } from "../components/systems/NavigationSystem";
import { PathFollowingSystem } from "../components/systems/PathFollowingSystem";
import { townObstacles } from "../components/systems/townNavigation";
import type { Citizen } from "../components/traits/Resident";
import {
  type ActionResult,
  accepted,
  rejected,
  type SimulationCommand,
  validNumber,
} from "./commands";

const defaults = TownExperiment.defaults;
interface TownState {
  initial: ReturnType<typeof initial>;
  activate: (state: ReturnType<typeof initial>) => void;
  time: number;
  playing: boolean;
  speed: number;
  roadClosed: boolean;
  marketBusy: boolean;
  marketNearSchool: boolean;
  citizens: Citizen[];
  buildings: ReturnType<typeof Building>[];
  market: ReturnType<typeof Market>;
  reset: () => void;
  dispatch: (c: SimulationCommand) => ActionResult;
  step: (delta: number) => void;
}
function evaluate(
  s: Pick<
    TownState,
    | "citizens"
    | "time"
    | "marketBusy"
    | "marketNearSchool"
    | "roadClosed"
    | "buildings"
    | "market"
  >,
  invalidated = false,
) {
  const entrances = Object.fromEntries(
    s.buildings.map((b) => [b.id, b.entrance]),
  );
  const obstacles = townObstacles(
    s.marketNearSchool,
    s.buildings.map((b) => b.building),
    s.market.building,
  );
  for (const c of s.citizens) {
    const request = BehaviorRunnerSystem(
      c,
      s.time,
      s.marketBusy,
      s.marketNearSchool,
      invalidated,
      { entrances, market: s.market.entrance },
    );
    if (request) {
      c.progress = 0;
      c.arrivedTaskId = undefined;
      NavigationSystem(c, request, {
        ...s,
        context: { obstacles, streets: TownLayout.streets },
      });
    }
  }
}
function initial() {
  const buildings = TownExperiment.instances
    .filter((i) => i.prefab === "Building")
    .map((i) =>
      Building(
        i.id,
        i.parameters as unknown as import("../components/traits/Building").Building,
      ),
    );
  const citizens = TownExperiment.instances
    .filter((i) => i.prefab === "Citizen")
    .map((i) => {
      const p = i.parameters as {
        homeId: string;
        role: "student" | "worker";
        seed: number;
      };
      return createCitizen(i.id, p.homeId, p.role, p.seed);
    });
  const state = {
    ...defaults,
    buildings,
    market: Market("market", defaults.marketNearSchool),
    citizens,
  };
  evaluate(state);
  return state;
}
export const townInitializer: StateCreator<TownState> = (set, get) => ({
  ...initial(),
  initial: initial(),
  activate: (state) => {
    const candidate = structuredClone(state);
    evaluate(candidate, true);
    set({ ...candidate, initial: structuredClone(candidate) });
  },
  reset: () => set(structuredClone(get().initial)),
  step: (delta) => {
    const s = get();
    if (!s.playing || !validNumber(delta, 0, 60)) return;
    const d = Math.min(delta, TownExperiment.clock.deltaCap) * s.speed;
    const next = {
      ...s,
      time: (s.time + d / TownExperiment.clock.secondsPerHour) % 24,
      citizens: structuredClone(s.citizens),
    };
    evaluate(next);
    const obstacles = townObstacles(
      next.marketNearSchool,
      next.buildings.map((b) => b.building),
      next.market.building,
    );
    for (const c of next.citizens) PathFollowingSystem(c, d, obstacles);
    set({ time: next.time, citizens: next.citizens });
  },
  dispatch: (c) => {
    const s = get(),
      patch: Partial<TownState> = {};
    let invalidated = false;
    switch (c.type) {
      case "SET_TIME":
        if (!validNumber(c.value, 0, 24))
          return rejected("Time must be 0–24 hours");
        patch.time = c.value % 24;
        break;
      case "SET_SPEED":
        if (![1, 2, 4].includes(Number(c.value)) || typeof c.value !== "number")
          return rejected("Speed must be 1×, 2× or 4×");
        patch.speed = c.value;
        patch.playing = true;
        break;
      case "SET_PLAYING":
        if (typeof c.value !== "boolean") return rejected("Expected boolean");
        patch.playing = c.value;
        break;
      case "CLOSE_ROAD":
        patch.roadClosed = true;
        invalidated = true;
        break;
      case "OPEN_ROAD":
        patch.roadClosed = false;
        invalidated = true;
        break;
      case "MOVE_MARKET":
        patch.marketNearSchool = true;
        patch.market = Market(s.market.id, true);
        invalidated = true;
        break;
      case "MARKET_BUSY":
        patch.marketBusy = true;
        break;
      case "RESET":
        s.reset();
        return accepted;
      default:
        return rejected(`Unsupported town command: ${c.type}`);
    }
    const next = { ...s, ...patch, citizens: structuredClone(s.citizens) };
    evaluate(next, invalidated);
    set({ ...patch, citizens: next.citizens });
    return accepted;
  },
});
export const useTownStore = create<TownState>(townInitializer);
