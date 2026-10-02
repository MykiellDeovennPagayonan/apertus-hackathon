import {
  type CompositionDefinition,
  immutable,
} from "../../runtime/definition";

const defaultsShape = {
  angle: 45,
  velocity: 20,
  gravity: 9.81,
  gravityName: "Earth",
  compareAngle: null as number | null,
  showVectors: false as boolean,
  playing: true as boolean,
  slowMo: false as boolean,
};
export const ProjectileExperiment = immutable({
  id: "ProjectileExperiment",
  demo: "projectile",
  version: 1,
  plane: "xy",
  units: "metres",
  rendering: "svg",
  components: {
    resources: ["GravityPresets", "ProjectileStyles"],
    traits: [
      "Transform2D",
      "VisualBinding",
      "LaunchSettings",
      "BallisticMotion",
      "FlightMetrics",
    ],
    behaviors: [],
    systems: ["BallisticMotionSystem"],
    visuals: [
      "ShapeVisual2D",
      "LauncherVisual",
      "TrajectoryVisual",
      "VelocityArrowVisual",
    ],
    views: [
      "ExperimentView",
      "SVGWorldView",
      "XYGraphView",
      "MetricsView",
      "LegendView",
    ],
    controls: [
      "ParameterSlider",
      "OptionSelect",
      "ActionButton",
      "ToggleControl",
      "PlaybackControls",
      "ProjectileControls",
      "PromptControl",
    ],
    prefabs: ["Projectile"],
    compositions: ["ProjectileExperiment", "AngleComparisonExperiment"],
  },
  systems: ["BallisticMotionSystem"],
  defaults: defaultsShape,

  layout: "scene-and-graph",
  viewSettings: { width: 760, height: 420, groundY: 360, originX: 70 },
  measurements: ["range", "maxHeight", "duration", "gravity"],
  instances: [
    {
      id: "projectile/primary",
      prefab: "Projectile",
      parameters: { angle: 45, velocity: 20, gravity: 9.81 },
    },
  ],
  actions: [
    "SET_ANGLE",
    "SET_VELOCITY",
    "SET_GRAVITY",
    "COMPARE_ANGLE",
    "CLEAR_COMPARE",
    "SHOW_VECTORS",
    "HIDE_VECTORS",
    "SET_PLAYING",
    "SET_SLOW_MO",
    "LAUNCH",
    "RESET",
  ],
  assumptions: [
    "Analytic ground-to-ground motion in seconds; positive uniform gravity.",
    "Velocity arrows show direction with normalized display length.",
  ],
} satisfies CompositionDefinition & { defaults: typeof defaultsShape });
