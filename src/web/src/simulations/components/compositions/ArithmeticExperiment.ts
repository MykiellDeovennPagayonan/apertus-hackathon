import {
  type CompositionDefinition,
  immutable,
} from "../../runtime/definition";
import { mathActions } from "../../runtime/mathModel";
export const ArithmeticExperiment = immutable({
  id: "ArithmeticExperiment",
  demo: "arithmetic",
  version: 1,
  plane: "xy",
  units: "counts",
  rendering: "svg",
  layout: "scene-and-controls",
  defaults: { looping: true, task: { operation: "add", a: 3, b: 2 } },
  viewSettings: { width: 900, height: 450 },
  measurements: ["count", "equation", "feedback"],
  components: {
    resources: ["MathAppearance", "ArithmeticTasks"],
    traits: [
      "VisualBinding",
      "MathSequence",
      "CountableToken",
      "ArithmeticBoard",
    ],
    behaviors: [],
    systems: ["ArithmeticSystem"],
    visuals: ["ShapeVisual2D", "CounterTokenVisual", "OperationZonesVisual"],
    views: [
      "SVGWorldView",
      "ExperimentView",
      "MathReadoutView",
      "MathExperimentView",
      "ArithmeticScene",
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
      "ArithmeticControls",
      "ArithmeticCommands",
    ],
    prefabs: ["CounterToken", "ArithmeticBoard"],
    compositions: ["ArithmeticExperiment"],
  },
  systems: ["ArithmeticSystem"],
  instances: [
    {
      id: "arithmetic/board",
      prefab: "ArithmeticBoard",
      parameters: { looping: true, task: { operation: "add", a: 3, b: 2 } },
    },
  ],
  actions: mathActions.arithmetic,
  assumptions: [
    "Exact bounded integer mathematics; animation is presentation only.",
    "Fractions compare equal-sized wholes.",
  ],
} satisfies CompositionDefinition);
