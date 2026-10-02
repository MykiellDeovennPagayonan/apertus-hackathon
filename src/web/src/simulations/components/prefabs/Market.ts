import { MARKET_DEFAULT, MARKET_NEAR_SCHOOL } from "../resources/TownLayout";
import { Building } from "./Building";
export function Market(id: string, nearSchool = false) {
  const position = nearSchool ? MARKET_NEAR_SCHOOL : MARKET_DEFAULT;
  const base = Building(id, {
    id,
    label: "Market",
    kind: "market",
    ...position,
    w: 7,
    d: 1.4,
    h: 3,
    color: "#ac855e",
  });
  return {
    ...base,
    entrance: { x: position.x, z: position.z + 1.5 },
    obstacle: { ...position, halfWidth: 3.5, halfDepth: 0.7 },
    visual: "MarketVisual3D",
  };
}
