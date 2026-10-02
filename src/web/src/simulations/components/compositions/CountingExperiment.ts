import {
  type CompositionDefinition,
  immutable,
} from "../../runtime/definition";
import { mathActions } from "../../runtime/mathModel";
export const CountingExperiment = immutable({
  id: "CountingExperiment",
  demo: "counting",
  version: 1,
  plane: "xy",
  units: "counts",
  rendering: "svg",
  layout: "scene-and-controls",
  defaults: { looping: true, task: { mode: "count", target: 5 } },
  viewSettings: { width: 900, height: 450 },
  measurements: ["count", "equation", "feedback"],
  components: {
    resources: ["MathAppearance", "CountingTasks"],
    traits: [
      "VisualBinding",
      "MathSequence",
      "CountableToken",
      "CountingBoard",
    ],
    behaviors: [],
    systems: ["CountingSystem"],
    visuals: ["ShapeVisual2D", "CounterTokenVisual", "CountingBoxVisual"],
    views: [
      "SVGWorldView",
      "ExperimentView",
      "MathReadoutView",
      "MathExperimentView",
      "CountingScene",
    ],
    controls: [
      "ActionButton",
      "OptionSelect",
      "IntegerStepper",
      "PromptControl",
      "MathObjectControl",
      "PlaybackControls",
      "ToggleControl",
      "MathPlayback",
      "GrownUpControls",
      "CountingControls",
      "CountingCommands",
    ],
    prefabs: ["CounterToken", "CountingBoard"],
    compositions: ["CountingExperiment"],
  },
  systems: ["CountingSystem"],
  instances: [
    {
      id: "counting/board",
      prefab: "CountingBoard",
      parameters: { looping: true, task: { mode: "count", target: 5 } },
    },
  ],
  actions: mathActions.counting,
  assumptions: [
    "Exact bounded integer mathematics; animation is presentation only.",
    "Fractions compare equal-sized wholes.",
  ],
} satisfies CompositionDefinition);
