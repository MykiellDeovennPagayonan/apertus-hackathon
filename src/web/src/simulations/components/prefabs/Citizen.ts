import {
  CITIZEN_COUNT,
  MARKET_DEFAULT,
  MARKET_NEAR_SCHOOL,
  STATIC_BUILDINGS,
} from "../resources/TownLayout";
import { WalkingProfile } from "../resources/WalkingProfile";
import type { Citizen as CitizenData, P2 } from "../traits/Resident";
export function buildingPos(id: string): P2 {
  const b = STATIC_BUILDINGS.find((b) => b.id === id);
  if (!b) throw new Error(`Unknown town building: ${id}`);
  return b.kind === "square"
    ? { x: b.x, z: 3.4 }
    : { x: b.x, z: b.z + (b.z > 0 ? -1 : 1) * (b.d / 2 + 1.1) };
}

export function marketPos(nearSchool: boolean): P2 {
  const market = nearSchool ? MARKET_NEAR_SCHOOL : MARKET_DEFAULT;
  return { x: market.x, z: market.z + 1.5 };
}

export function jitter(p: P2, seed: number, r = 0.4): P2 {
  return {
    x: p.x + Math.sin(seed * 12.9898) * r,
    z: p.z + Math.cos(seed * 78.233) * r,
  };
}

export function Citizen(
  id: string,
  homeId: string,
  role: CitizenData["role"],
  seed: number,
): CitizenData {
  const home = buildingPos(homeId);
  return {
    id,
    homeId,
    daytimeId: role === "student" ? "school" : "workshop",
    marketId: "market",
    squareId: "square",
    home,
    role,
    seed,
    pos: jitter(home, seed),
    path: [],
    progress: 0,
    binding: { behavior: "DailyRoutine", schedule: "DailySchedule" },
    speed: WalkingProfile.baseSpeed + seed * WalkingProfile.speedVariation,
    heading: 0,
    status: "arrived",
    taskId: 0,
    behavior: { requestId: 0 },
  };
}
export function createCitizens(namespace = "town") {
  const homes = STATIC_BUILDINGS.filter((b) => b.kind === "house");
  return Array.from({ length: CITIZEN_COUNT }, (_, i) =>
    Citizen(
      `${namespace}/citizen-${i}`,
      homes[i % homes.length].id,
      i % 3 === 0 ? "student" : "worker",
      (i * 0.6180339887) % 1,
    ),
  );
}
