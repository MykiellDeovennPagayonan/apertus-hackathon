import {
  type CompositionDefinition,
  immutable,
} from "../../runtime/definition";
import { CITIZEN_COUNT, STATIC_BUILDINGS } from "../resources/TownLayout";

const defaultsShape = {
  time: 8,
  playing: true as boolean,
  speed: 1,
  roadClosed: false as boolean,
  marketBusy: false as boolean,
  marketNearSchool: false as boolean,
};
export const TownExperiment = immutable({
  id: "TownExperiment",
  demo: "town",
  version: 1,
  plane: "xz",
  units: "model units",
  rendering: "three",
  components: {
    resources: [
      "TownAppearance",
      "TownLayout",
      "DailySchedule",
      "WalkingProfile",
    ],
    traits: [
      "Transform2D",
      "VisualBinding",
      "Building",
      "NavigationObstacle",
      "NavigationAgent",
      "Resident",
      "BehaviorBinding",
      "BehaviorState",
    ],
    behaviors: ["DailyRoutine"],
    systems: [
      "BehaviorRunnerSystem",
      "NavigationSystem",
      "PathFollowingSystem",
    ],
    visuals: [
      "CitizenVisual3D",
      "BuildingVisual3D",
      "MarketVisual3D",
      "RoadVisual3D",
      "TownSceneryVisual3D",
    ],
    views: ["ExperimentView", "ThreeWorldView", "MetricsView"],
    controls: [
      "ParameterSlider",
      "ActionButton",
      "ToggleControl",
      "PlaybackControls",
      "OrbitCameraControl",
      "TownControls",
      "PromptControl",
    ],
    prefabs: ["Citizen", "Building", "Market"],
    compositions: ["TownExperiment"],
  },
  systems: ["BehaviorRunnerSystem", "NavigationSystem", "PathFollowingSystem"],
  defaults: defaultsShape,
  clock: { deltaCap: 0.1, secondsPerHour: 5 },
  layout: "scene-and-controls",
  viewSettings: {
    cameraPosition: [40, 43, 52] as [number, number, number],
    fov: 43,
    maxPolarAngle: Math.PI / 2.5,
    minDistance: 25,
    maxDistance: 100,
    target: [0, 0, 0] as [number, number, number],
  },
  measurements: ["population", "time", "activity"],
  instances: [
    ...STATIC_BUILDINGS.map((b) => ({
      id: b.id,
      prefab: "Building",
      parameters: { ...b },
    })),
    { id: "market", prefab: "Market", parameters: { nearSchool: false } },
    ...Array.from({ length: CITIZEN_COUNT }, (_, i) => ({
      id: `town/citizen-${i}`,
      prefab: "Citizen",
      parameters: {
        homeId: `h${(i % 6) + 1}`,
        role: i % 3 === 0 ? "student" : "worker",
        seed: (i * 0.6180339887) % 1,
      },
    })),
  ],
  actions: [
    "SET_TIME",
    "SET_SPEED",
    "SET_PLAYING",
    "CLOSE_ROAD",
    "OPEN_ROAD",
    "MOVE_MARKET",
    "MARKET_BUSY",
    "RESET",
  ],
  assumptions: [
    "Planar scheduled navigation with procedural 3D presentation.",
    "Walking speed uses model units/second; simulated time uses five real seconds per hour.",
    "Street preference and obstacle detours are specific to this town layout.",
  ],
} satisfies CompositionDefinition & {
  defaults: typeof defaultsShape;
  clock: { deltaCap: number; secondsPerHour: number };
});
