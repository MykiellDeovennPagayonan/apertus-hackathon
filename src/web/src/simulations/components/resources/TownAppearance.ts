import { immutable } from "../../runtime/definition";
export const TownAppearance = immutable({
  citizenColors: [
    "#d88e60",
    "#688f9e",
    "#b77268",
    "#d0b15b",
    "#76875c",
  ] as const,
  houseColors: ["#e2c9a7", "#e9dbc1", "#c7d2ba"] as const,
  marketColors: ["#b9624d", "#688c73", "#d4a153"] as const,
  daylight: "#e5e3d7",
  moonlight: "#253c50",
});
