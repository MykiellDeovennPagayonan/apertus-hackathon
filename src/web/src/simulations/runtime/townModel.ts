import { TownExperiment } from "../components/compositions/TownExperiment";
import { Building } from "../components/prefabs/Building";
import { Citizen as createCitizen } from "../components/prefabs/Citizen";
import { Market } from "../components/prefabs/Market";
import { TownLayout } from "../components/resources/TownLayout";
import { BehaviorRunnerSystem } from "../components/systems/BehaviorRunnerSystem";
import { NavigationSystem } from "../components/systems/NavigationSystem";
import { PathFollowingSystem } from "../components/systems/PathFollowingSystem";
import { townObstacles } from "../components/systems/townNavigation";
import { validNumber } from "./commands";

const defaults = TownExperiment.defaults;
export type TownModelState = ReturnType<typeof initialTown>;
export function evaluateTown(
  s: Pick<
    TownModelState,
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
export function initialTown() {
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
  evaluateTown(state);
  return state;
}

export function stepTown(s: TownModelState, delta: number): TownModelState {
  if (!s.playing || !validNumber(delta, 0, 60)) return s;
  const d = Math.min(delta, TownExperiment.clock.deltaCap) * s.speed;
  const next = {
    ...s,
    time: (s.time + d / TownExperiment.clock.secondsPerHour) % 24,
    citizens: structuredClone(s.citizens),
  };
  evaluateTown(next);
  const obstacles = townObstacles(
    next.marketNearSchool,
    next.buildings.map((b) => b.building),
    next.market.building,
  );
  for (const c of next.citizens) PathFollowingSystem(c, d, obstacles);
  return next;
}
