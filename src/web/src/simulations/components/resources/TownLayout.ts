import { immutable } from "../../runtime/definition";
import type { Building } from "../traits/Building";

// Town layout on a ~48x48 plane. Main road runs east-west at z=0.
export const STATIC_BUILDINGS: Building[] = [
  {
    id: "h1",
    label: "House",
    kind: "house",
    x: -18,
    z: -12,
    w: 5,
    d: 5,
    h: 4,
    color: "#d7c9aa",
  },
  {
    id: "h2",
    label: "House",
    kind: "house",
    x: -10,
    z: -13,
    w: 5,
    d: 5,
    h: 4,
    color: "#c7b996",
  },
  {
    id: "h3",
    label: "House",
    kind: "house",
    x: -2,
    z: -12,
    w: 5,
    d: 5,
    h: 4,
    color: "#d7c9aa",
  },
  {
    id: "h4",
    label: "House",
    kind: "house",
    x: -18,
    z: 12,
    w: 5,
    d: 5,
    h: 4,
    color: "#c7b996",
  },
  {
    id: "h5",
    label: "House",
    kind: "house",
    x: -10,
    z: 13,
    w: 5,
    d: 5,
    h: 4,
    color: "#d7c9aa",
  },
  {
    id: "h6",
    label: "House",
    kind: "house",
    x: -2,
    z: 12,
    w: 5,
    d: 5,
    h: 4,
    color: "#c7b996",
  },
  {
    id: "school",
    label: "School",
    kind: "school",
    x: 14,
    z: -12,
    w: 9,
    d: 6,
    h: 5,
    color: "#9eafa1",
  },
  {
    id: "workshop",
    label: "Workshop",
    kind: "workshop",
    x: 16,
    z: 12,
    w: 8,
    d: 6,
    h: 5,
    color: "#be987c",
  },
  {
    id: "square",
    label: "Town square",
    kind: "square",
    x: 6,
    z: 0,
    w: 8,
    d: 8,
    h: 0.15,
    color: "#d5cbb6",
  },
];

export const MARKET_DEFAULT = { x: 14, z: -4 };
export const MARKET_NEAR_SCHOOL = { x: 14, z: -18 };
export const DETOUR_NODE = { x: -22, z: 0 }; // used when main road closed
export const CITIZEN_COUNT = 22;

immutable(STATIC_BUILDINGS);
Object.freeze(MARKET_DEFAULT);
Object.freeze(MARKET_NEAR_SCHOOL);
export const TownLayout = immutable({
  buildings: STATIC_BUILDINGS,
  market: MARKET_DEFAULT,
  marketNearSchool: MARKET_NEAR_SCHOOL,
  bounds: { x: 30, z: 25 },
  streets: [-14, 14],
  plaza: { x: 6, z: 0, width: 8, depth: 8 },
  fountain: { x: 6, z: 0, radius: 2.25 },
  benches: [
    { x: 3, z: -2.4, halfWidth: 0.45, halfDepth: 1.1 },
    { x: 9, z: 2.4, halfWidth: 0.45, halfDepth: 1.1 },
  ],
});
