import { operations } from "../../runtime/capabilities";
import {
  type CompositionDefinition,
  immutable,
} from "../../runtime/definition";
import type { DemoType } from "../../runtime/types";

function experiment(
  demo: DemoType,
  id: string,
  prefab: string,
  trait: string,
  system: string | null,
  visual: string,
  defaults: Record<string, unknown>,
  units: string,
  assumptions: string[],
): CompositionDefinition {
  return immutable({
    id,
    demo,
    version: 1,
    plane: "xy",
    units,
    rendering: "svg",
    layout: "scene-and-controls",
    defaults,
    viewSettings: { width: 640, height: 320 },
    measurements:
      demo === "ratio"
        ? ["ratio", "percentage"]
        : demo === "area-perimeter"
          ? ["area", "perimeter"]
          : demo === "coordinates"
            ? ["x", "y"]
            : ["observed", "expected"],
    components: {
      resources: [],
      traits: [trait],
      behaviors: [],
      systems: system ? [system] : [],
      visuals: [visual],
      views: [
        "SVGWorldView",
        "ResultsTableView",
        "EntityInspectorView",
        ...(demo === "probability" ? ["HistogramView"] : []),
      ],
      controls: [
        "ParameterSlider",
        "ActionButton",
        ...(demo === "coordinates" ? ["DragHandleControl"] : []),
      ],
      prefabs: [prefab],
      compositions: [id],
    },
    systems: system ? [system] : [],
    instances: [{ id: `${demo}/board`, prefab, parameters: defaults }],
    actions: Object.keys(operations[demo]),
    assumptions,
  });
}
export const RatioExperiment = experiment(
  "ratio",
  "RatioExperiment",
  "RatioBoard",
  "RatioState",
  "RatioSystem",
  "RatioBarVisual",
  { numerator: 3, denominator: 4 },
  "parts",
  [
    "Numerator is the selected quantity; denominator is the reference whole and must be positive.",
    "Ratios may exceed one (100%); whole multiples and the remaining fraction are shown separately.",
  ],
);
export const AreaPerimeterExperiment = experiment(
  "area-perimeter",
  "AreaPerimeterExperiment",
  "RectangleBoard",
  "RectangleDimensions",
  "RectangleMetricsSystem",
  "DimensionLabelVisual",
  { width: 4, height: 3 },
  "metres",
  [
    "Positive rectangular side lengths in metres; area is m² and perimeter is m.",
  ],
);
export const CoordinateExperiment = experiment(
  "coordinates",
  "CoordinateExperiment",
  "CoordinatePoint",
  "Transform2D",
  null,
  "CoordinateAxesVisual",
  { x: 2, y: 3 },
  "math units",
  [
    "Dimensionless Cartesian coordinates; x increases right and y increases up. No physical motion.",
  ],
);
export const ProbabilityExperiment = experiment(
  "probability",
  "ProbabilityExperiment",
  "RandomTrialBoard",
  "RandomTrialState",
  "RandomTrialSystem",
  "HistogramBarsVisual",
  { preset: "coin", seed: 42, trials: 100 },
  "trials",
  [
    "Seeded uniform coin or six-sided die trials. Observed counts and theoretical expected counts are distinct.",
  ],
);
export const elementaryCompositions = {
  ratio: RatioExperiment,
  "area-perimeter": AreaPerimeterExperiment,
  coordinates: CoordinateExperiment,
  probability: ProbabilityExperiment,
};
