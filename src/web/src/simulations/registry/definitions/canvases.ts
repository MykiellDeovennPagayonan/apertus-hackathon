import { boolean, num, object } from "../contracts/parameterSchema";
import type { PublicDefinition } from "../contracts/publicDefinition";
import { base, text } from "./shared";
export const canvasesDefinitions: PublicDefinition[] = [
  ...["cartesian", "diagram", "physical", "town"].map((kind) => ({
    ...base(
      `canvases/${kind}`,
      (
        {
          cartesian: "Cartesian plane",
          diagram: "2D diagram",
          physical: "2D physical canvas",
          town: "3D spatial scene",
        } as Record<string, string>
      )[kind],
      "canvases",
      object(
        {
          xMin: num(-10000, 10000),
          xMax: num(-10000, 10000),
          yMin: num(-10000, 10000),
          yMax: num(-10000, 10000),
          grid: boolean,
          snap: num(0, 100),
          backgroundColor: text,
          borderColor: text,
          showNavigation: boolean,
          showAbout: boolean,
        },
        ["backgroundColor", "borderColor", "showNavigation", "showAbout"],
      ),
      kind === "physical" || kind === "diagram"
        ? { xMin: 0, xMax: 100, yMin: 0, yMax: 70, grid: false, snap: 0.5 }
        : { xMin: -5, xMax: 5, yMin: -5, yMax: 5, grid: true, snap: 0.5 },
    ),
    inputs: {
      objects: {
        kind: "attachment" as const,
        unit: kind,
        cardinality: "many" as const,
        optional: true,
      },
    },
  })),
];
