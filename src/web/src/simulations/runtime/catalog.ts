import { measurementProbeSchema } from "../components/traits/MeasurementProbe";
import type { OperationMetadata } from "./capabilities";
import { operations, templateNames, templateParameters } from "./capabilities";
import type { ComponentKind } from "./definition";
import { registerMathDefinitions } from "./mathCatalog";
import type { ParameterSchema } from "./parameterSchema";
import type { DemoType } from "./types";
export interface Definition {
  id: string;
  kind: ComponentKind;
  version: number;
  target?: "svg" | "three";
  required?: string[];
  description?: string;
  defaults?: Record<string, unknown>;
  modelSpace?: string;
  coordinates?: string;
  parameters?: ParameterSchema;
  operations?: Record<string, OperationMetadata>;
  limitations?: string[];
  outputs?: { name: string; unit: string; fidelity: string }[];
  reads?: string[];
  writes?: string[];
  entityPrefabs?: readonly string[];
}
const rows: [string, ComponentKind][] = [
  ["GravityPresets", "resources"],
  ["ProjectileStyles", "resources"],
  ["Transform2D", "traits"],
  ["VisualBinding", "traits"],
  ["LaunchSettings", "traits"],
  ["BallisticMotion", "traits"],
  ["FlightMetrics", "traits"],
  ["BallisticMotionSystem", "systems"],
  ["ShapeVisual2D", "visuals"],
  ["LauncherVisual", "visuals"],
  ["TrajectoryVisual", "visuals"],
  ["VelocityArrowVisual", "visuals"],
  ["ExperimentView", "views"],
  ["SVGWorldView", "views"],
  ["XYGraphView", "views"],
  ["MetricsView", "views"],
  ["LegendView", "views"],
  ["ParameterSlider", "controls"],
  ["OptionSelect", "controls"],
  ["ActionButton", "controls"],
  ["ToggleControl", "controls"],
  ["PlaybackControls", "controls"],
  ["ProjectileControls", "controls"],
  ["PromptControl", "controls"],
  ["Projectile", "prefabs"],
  ["ProjectileExperiment", "compositions"],
  ["AngleComparisonExperiment", "compositions"],
  ["BridgeStyles", "resources"],
  ["TrussSettings", "traits"],
  ["MemberEndpoints", "traits"],
  ["MemberResponse", "traits"],
  ["BridgeLoad", "traits"],
  ["HeuristicBridgeResponseSystem", "systems"],
  ["BeamVisual", "visuals"],
  ["LoadTruckVisual", "visuals"],
  ["BridgeSupportVisual", "visuals"],
  ["MemberInspector", "views"],
  ["SelectionControl", "controls"],
  ["BridgeControls", "controls"],
  ["Joint", "prefabs"],
  ["Member", "prefabs"],
  ["BridgeLoad", "prefabs"],
  ["TrussAssembly", "prefabs"],
  ["BridgeExperiment", "compositions"],
  ["TownAppearance", "resources"],
  ["TownLayout", "resources"],
  ["DailySchedule", "resources"],
  ["WalkingProfile", "resources"],
  ["Building", "traits"],
  ["NavigationObstacle", "traits"],
  ["NavigationAgent", "traits"],
  ["Resident", "traits"],
  ["BehaviorBinding", "traits"],
  ["BehaviorState", "traits"],
  ["DailyRoutine", "behaviors"],
  ["BehaviorRunnerSystem", "systems"],
  ["NavigationSystem", "systems"],
  ["PathFollowingSystem", "systems"],
  ["CitizenVisual3D", "visuals"],
  ["BuildingVisual3D", "visuals"],
  ["MarketVisual3D", "visuals"],
  ["RoadVisual3D", "visuals"],
  ["TownSceneryVisual3D", "visuals"],
  ["ThreeWorldView", "views"],
  ["OrbitCameraControl", "controls"],
  ["TownControls", "controls"],
  ["Citizen", "prefabs"],
  ["Building", "prefabs"],
  ["Market", "prefabs"],
  ["TownExperiment", "compositions"],
];
export const definitions = new Map<string, Definition>(
  rows.map(([id, kind]) => [
    `${kind}/${id}`,
    {
      id,
      kind,
      version: 1,
      ...(((kind === "visuals" || kind === "views") && id.includes("3D")) ||
      id === "ThreeWorldView"
        ? { target: "three" as const }
        : {}),
    },
  ]),
);
const ownership: Record<string, { reads: string[]; writes: string[] }> = {
  BallisticMotionSystem: {
    reads: ["LaunchSettings", "gravity", "clock"],
    writes: ["projectile.position", "projectile.motion", "projectile.metrics"],
  },
  HeuristicBridgeResponseSystem: {
    reads: ["MemberEndpoints", "BridgeLoad", "TrussSettings"],
    writes: ["bridge.responses", "bridge.supportShares"],
  },
  BehaviorRunnerSystem: {
    reads: ["Resident", "clock", "DailyRoutine"],
    writes: ["citizen.behavior"],
  },
  NavigationSystem: {
    reads: ["NavigationObstacle", "citizen.position", "MoveTo"],
    writes: ["citizen.route", "citizen.destination", "citizen.taskId"],
  },
  PathFollowingSystem: {
    reads: ["citizen.route", "clock"],
    writes: ["citizen.position", "citizen.heading", "citizen.arrival"],
  },
};
for (const [id, fields] of Object.entries(ownership))
  Object.assign(definitions.get(`systems/${id}`) ?? {}, fields);
for (const id of [
  "ShapeVisual2D",
  "LauncherVisual",
  "TrajectoryVisual",
  "VelocityArrowVisual",
  "BeamVisual",
  "LoadTruckVisual",
  "BridgeSupportVisual",
  "SVGWorldView",
  "XYGraphView",
]) {
  const d = definitions.get(
    `${id.endsWith("View") ? "views" : "visuals"}/${id}`,
  );
  if (d) d.target = "svg";
}

const dependencies: Record<string, string[]> = {
  BallisticMotionSystem: [
    "traits/LaunchSettings",
    "traits/Transform2D",
    "traits/BallisticMotion",
    "traits/FlightMetrics",
  ],
  HeuristicBridgeResponseSystem: [
    "traits/TrussSettings",
    "traits/MemberEndpoints",
    "traits/MemberResponse",
    "traits/BridgeLoad",
  ],
  BehaviorRunnerSystem: [
    "traits/Resident",
    "traits/BehaviorState",
    "behaviors/DailyRoutine",
    "resources/DailySchedule",
  ],
  NavigationSystem: [
    "traits/NavigationAgent",
    "traits/NavigationObstacle",
    "resources/TownLayout",
  ],
  PathFollowingSystem: [
    "traits/NavigationAgent",
    "traits/Transform2D",
    "resources/WalkingProfile",
  ],
};
for (const [id, required] of Object.entries(dependencies)) {
  const definition = definitions.get(`systems/${id}`);
  if (definition) definition.required = required;
}

registerMathDefinitions(definitions);

const additions: [string, ComponentKind][] = [
  ["ResultsTableView", "views"],
  ["ComparisonView", "views"],
  ["TimeSeriesView", "views"],
  ["EntityInspectorView", "views"],
  ["MeasurementProbe", "traits"],
  ["MeasurementSamplingSystem", "systems"],
  ["DragHandleControl", "controls"],
  ["RatioState", "traits"],
  ["RatioSystem", "systems"],
  ["RatioBoard", "prefabs"],
  ["RatioBarVisual", "visuals"],
  ["RectangleDimensions", "traits"],
  ["RectangleMetricsSystem", "systems"],
  ["DimensionLabelVisual", "visuals"],
  ["RectangleBoard", "prefabs"],
  ["CoordinatePoint", "prefabs"],
  ["CoordinateAxesVisual", "visuals"],
  ["RandomTrialState", "traits"],
  ["RandomTrialSystem", "systems"],
  ["RandomTrialBoard", "prefabs"],
  ["HistogramView", "views"],
  ["HistogramBarsVisual", "visuals"],
  ["DistributionPresets", "resources"],
  ["ProjectileSweepExperiment", "compositions"],
];
for (const [id, kind] of additions)
  definitions.set(`${kind}/${id}`, {
    id,
    kind,
    version: 1,
    ...(kind === "visuals" || kind === "views"
      ? { target: "svg" as const }
      : {}),
  });
const descriptions: Record<DemoType, string> = {
  projectile:
    "Analytic ground-to-ground projectile launches, independent comparisons and angle sweeps",
  bridge: "Truss bridge load placement and heuristic response scores",
  town: "Daily schedules and planar citizen navigation with 3D presentation",
  counting: "Count or place 0–20 circles",
  arithmetic: "Add or subtract bounded whole numbers",
  "equal-groups": "Build equal groups or share with a remainder",
  "fraction-builder": "Show or compare fractions of equal wholes",
  "fraction-number-line": "Place, add or subtract fractions on a number line",
  ratio:
    "Ratios and percentages with explicit numerator and reference denominator",
  "area-perimeter": "Area and perimeter of a rectangle in metres",
  coordinates: "Place and drag Cartesian points in dimensionless math units",
  probability:
    "Seeded coin or die trials with observed and expected frequencies",
};
for (const [demo, id] of Object.entries(templateNames)) {
  const ref = `compositions/${id}`;
  const definition = definitions.get(ref) ?? {
    id,
    kind: "compositions" as const,
    version: 1,
  };
  Object.assign(definition, {
    description: descriptions[demo as DemoType],
    parameters: templateParameters(ref),
    operations: operations[demo as DemoType],
  });
  definitions.set(ref, definition);
}
for (const id of ["AngleComparisonExperiment", "ProjectileSweepExperiment"])
  Object.assign(definitions.get(`compositions/${id}`) ?? {}, {
    description: descriptions.projectile,
    parameters: templateParameters(`compositions/${id}`),
    operations: operations.projectile,
  });
for (const [id, required, writes] of [
  ["RatioSystem", ["traits/RatioState"], ["ratio.outputs"]],
  [
    "RectangleMetricsSystem",
    ["traits/RectangleDimensions"],
    ["rectangle.outputs"],
  ],
  ["RandomTrialSystem", ["traits/RandomTrialState"], ["trials.frequencies"]],
  [
    "MeasurementSamplingSystem",
    ["traits/MeasurementProbe"],
    ["measurement.dataset"],
  ],
] as const)
  Object.assign(definitions.get(`systems/${id}`) ?? {}, {
    required: [...required],
    writes: [...writes],
  });

const outputContracts: Record<
  string,
  { name: string; unit: string; fidelity: string }[]
> = {
  projectile: [
    { name: "range", unit: "m", fidelity: "analytic ground-to-ground" },
    { name: "maxHeight", unit: "m", fidelity: "analytic" },
    { name: "duration", unit: "s", fidelity: "analytic" },
  ],
  bridge: [
    {
      name: "maxResponseScore",
      unit: "dimensionless",
      fidelity: "heuristic, not engineering stress",
    },
    {
      name: "supportShares",
      unit: "t",
      fidelity: "heuristic display load allocation",
    },
  ],
  town: [
    {
      name: "traveling",
      unit: "citizens",
      fidelity: "planar scheduled navigation",
    },
  ],
  ratio: [
    { name: "ratio", unit: "parts per whole", fidelity: "exact arithmetic" },
    { name: "percentage", unit: "%", fidelity: "100 times ratio" },
  ],
  "area-perimeter": [
    { name: "area", unit: "m²", fidelity: "rectangle geometry" },
    { name: "perimeter", unit: "m", fidelity: "rectangle geometry" },
  ],
  coordinates: [
    { name: "x", unit: "math units", fidelity: "user input" },
    { name: "y", unit: "math units", fidelity: "user input" },
  ],
  probability: [
    { name: "observed", unit: "trials", fidelity: "seeded uniform trials" },
    { name: "expected", unit: "trials", fidelity: "theoretical expectation" },
  ],
};
for (const [demo, id] of Object.entries(templateNames)) {
  const definition = definitions.get(`compositions/${id}`);
  if (definition)
    Object.assign(definition, {
      outputs: outputContracts[demo] ?? [
        {
          name: "result",
          unit: demo.includes("fraction") ? "wholes" : "counts",
          fidelity: "exact bounded mathematics",
        },
      ],
      modelSpace:
        demo === "town"
          ? "xz plane"
          : demo === "projectile" || demo === "coordinates"
            ? "xy plane"
            : "nonspatial or diagram",
      coordinates:
        demo === "town"
          ? "(x,z) model → (x,height,z) three presentation"
          : "x right, y up; SVG y is inverted",
      limitations:
        demo === "projectile"
          ? ["No drag, collisions, variable gravity or elevated launch origins"]
          : demo === "bridge"
            ? ["Heuristic score only; no structural engineering solver"]
            : demo === "town"
              ? ["No purchases, queues or volumetric physics"]
              : demo === "ratio"
                ? ["Positive denominator required; no zero-denominator result"]
                : ["Bounded educational inputs only"],
    });
}
for (const id of ["AngleComparisonExperiment", "ProjectileSweepExperiment"])
  Object.assign(definitions.get(`compositions/${id}`) ?? {}, {
    outputs: outputContracts.projectile,
    modelSpace: "xy plane",
    coordinates: "x right, y up; SVG y inverted",
    limitations: ["Analytic ground-to-ground motion, no drag or collisions"],
  });
Object.assign(definitions.get("prefabs/Projectile") ?? {}, {
  description: "Independent ballistic launch with stable identity",
  parameters: templateParameters("compositions/ProjectileExperiment"),
  required: [
    "traits/LaunchSettings",
    "traits/Transform2D",
    "systems/BallisticMotionSystem",
  ],
  outputs: outputContracts.projectile,
});
for (const definition of definitions.values())
  if (!definition.description)
    definition.description = `${definition.id}: trusted ${definition.kind} capability, version ${definition.version}`;

const scopes: Record<string, string[]> = {
  BallisticMotionSystem: ["Projectile"],
  MeasurementSamplingSystem: ["Projectile"],
  HeuristicBridgeResponseSystem: ["TrussAssembly"],
  BehaviorRunnerSystem: ["Citizen"],
  NavigationSystem: ["Citizen"],
  PathFollowingSystem: ["Citizen"],
  CountingSystem: ["CountingBoard"],
  ArithmeticSystem: ["ArithmeticBoard"],
  EqualGroupingSystem: ["GroupingBoard"],
  FractionBuilderSystem: ["FractionComparisonBoard"],
  FractionNumberLineSystem: ["NumberLineBoard"],
  RatioSystem: ["RatioBoard"],
  RectangleMetricsSystem: ["RectangleBoard"],
  RandomTrialSystem: ["RandomTrialBoard"],
};
for (const [id, entityPrefabs] of Object.entries(scopes))
  Object.assign(definitions.get(`systems/${id}`) ?? {}, { entityPrefabs });

Object.assign(definitions.get("traits/MeasurementProbe") ?? {}, {
  description:
    "Entity-attached selection of x, y or speed; analytic model-time samples, no source ownership",
  parameters: measurementProbeSchema,
  outputs: [
    { name: "time", unit: "s", fidelity: "model time" },
    {
      name: "value",
      unit: "m or m/s according to observable",
      fidelity: "read-only analytic sample",
    },
  ],
  limitations: [
    "Pause adds no samples; relaunch/reset starts at time zero; keeps the first bounded samples",
  ],
});
