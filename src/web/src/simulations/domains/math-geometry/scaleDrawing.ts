import type { DomainModel } from "../../runtime/contribution";
import {
  choice,
  num,
  object,
  validateValue,
} from "../../runtime/parameterSchema";
import { geometryDependencies, valueAction } from "./common";

const side = num(1, 20, "m");
const factor = num(0.25, 4);
const shape = choice("rectangle", "L");
const parameters = object({
  roomWidth: side,
  roomLength: side,
  scaleFactor: factor,
  roomShape: shape,
});
const fields: Record<string, string> = {
  "set:scaleFactor": "scaleFactor",
  "set:roomWidth": "roomWidth",
  "set:roomLength": "roomLength",
  "set:roomShape": "roomShape",
};
function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  return {
    roomWidth: input.roomWidth,
    roomLength: input.roomLength,
    scaleFactor: input.scaleFactor,
    roomShape: input.roomShape,
  };
}
/** Outline in metres, anticlockwise from the shared corner used as the centre of dilation. */
export function roomOutline(width: number, length: number, shape: string) {
  return shape === "L"
    ? [
        [0, 0],
        [width, 0],
        [width, length / 2],
        [width / 2, length / 2],
        [width / 2, length],
        [0, length],
      ]
    : [
        [0, 0],
        [width, 0],
        [width, length],
        [0, length],
      ];
}
export function polygonArea(points: number[][]) {
  return (
    Math.abs(
      points.reduce((sum, [x, y], i) => {
        const [nx, ny] = points[(i + 1) % points.length];
        return sum + x * ny - nx * y;
      }, 0),
    ) / 2
  );
}
export function polygonPerimeter(points: number[][]) {
  return points.reduce((sum, [x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    return sum + Math.hypot(nx - x, ny - y);
  }, 0);
}

export const scaleDrawingModel: DomainModel = {
  ref: "prefabs/math-geometry/ScaleDrawing",
  version: 1,
  name: "Scaling a floor plan",
  description:
    "Enlarge a room's floor plan by a scale factor about a shared corner. Every length is multiplied by the factor while the area is multiplied by the factor squared.",
  tags: ["scale drawing", "similar shapes", "dilation", "area factor"],
  assumptions: [
    "Uniform scaling about the room's bottom-left corner; angles are preserved. Lengths in metres, scale factor 0.25–4.",
    "Display zoom never changes physical lengths or areas. Different horizontal and vertical factors (a stretch) are unsupported.",
  ],
  parameters,
  defaults: {
    roomWidth: 3,
    roomLength: 4,
    scaleFactor: 1,
    roomShape: "rectangle",
  },
  outputs: {
    scaleFactor: { unit: "×", description: "Length scale factor" },
    areaFactor: {
      unit: "×",
      description: "Area scale factor (factor squared)",
    },
    originalArea: { unit: "m²", description: "Area of the original plan" },
    scaledArea: { unit: "m²", description: "Area of the scaled plan" },
    originalPerimeter: {
      unit: "m",
      description: "Perimeter of the original plan",
    },
    scaledPerimeter: { unit: "m", description: "Perimeter of the scaled plan" },
    scaledWidth: { unit: "m", description: "Width of the scaled plan" },
    scaledLength: { unit: "m", description: "Length of the scaled plan" },
    outline: { unit: "m", description: "Original outline vertices in metres" },
  },
  actions: {
    "set:scaleFactor": valueAction(factor, "Scale every length by this factor"),
    "set:roomWidth": valueAction(side, "Original room width in metres"),
    "set:roomLength": valueAction(side, "Original room length in metres"),
    "set:roomShape": valueAction(shape, "Rectangle or L-shaped room"),
  },
  dependencies: geometryDependencies("math-geometry/ScaleDrawing"),
  presentation: "math-scale-drawing",
  requiredObservations: ["scaledArea"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action, value) => {
    const field = fields[action];
    if (!field) throw new Error("Unsupported floor plan operation");
    return accepted({ ...state, [field]: value });
  },
  measure: (state) => {
    const s = accepted(state);
    const k = Number(s.scaleFactor),
      width = Number(s.roomWidth),
      length = Number(s.roomLength);
    const outline = roomOutline(width, length, String(s.roomShape));
    const scaled = outline.map(([x, y]) => [k * x, k * y]);
    return {
      scaleFactor: k,
      areaFactor: k * k,
      originalArea: polygonArea(outline),
      scaledArea: polygonArea(scaled),
      originalPerimeter: polygonPerimeter(outline),
      scaledPerimeter: polygonPerimeter(scaled),
      scaledWidth: k * width,
      scaledLength: k * length,
      outline,
    };
  },
};
