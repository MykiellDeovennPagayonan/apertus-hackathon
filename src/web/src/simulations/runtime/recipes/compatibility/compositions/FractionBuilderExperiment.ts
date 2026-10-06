import {
  type CompositionDefinition,
  immutable,
} from "../../../definition";
import { mathActions } from "../../../mathModel";
export const FractionBuilderExperiment = immutable({
  id: "FractionBuilderExperiment",
  demo: "fraction-builder",
  version: 1,
  plane: "xy",
  units: "wholes",
  rendering: "svg",
  layout: "scene-and-controls",
  defaults: {
    bars: [
      { n: 1, d: 2 },
      { n: 2, d: 4 },
    ],
  },
  viewSettings: { width: 900, height: 450 },
  measurements: ["count", "equation", "feedback"],
  components: {
    resources: ["MathAppearance", "FractionTasks"],
    traits: [
      "VisualBinding",
      "FractionValue",
      "FractionBar",
      "FractionComparisonBoard",
    ],
    behaviors: [],
    systems: ["FractionBuilderSystem"],
    visuals: ["FractionBarVisual"],
    views: [
      "SVGWorldView",
      "ExperimentView",
      "MathReadoutView",
      "MathExperimentView",
      "FractionBuilderScene",
    ],
    controls: [
      "ActionButton",
      "OptionSelect",
      "IntegerStepper",
      "PromptControl",
      "MathObjectControl",
      "FractionInputControl",
      "FractionBuilderControls",
      "FractionBuilderCommands",
    ],
    prefabs: ["FractionBar", "FractionComparisonBoard"],
    compositions: ["FractionBuilderExperiment"],
  },
  systems: ["FractionBuilderSystem"],
  instances: [
    {
      id: "fraction-builder/board",
      prefab: "FractionComparisonBoard",
      parameters: {
        bars: [
          { n: 1, d: 2 },
          { n: 2, d: 4 },
        ],
      },
    },
  ],
  actions: mathActions["fraction-builder"],
  assumptions: [
    "Exact bounded integer mathematics; animation is presentation only.",
    "Fractions compare equal-sized wholes.",
  ],
} satisfies CompositionDefinition);
