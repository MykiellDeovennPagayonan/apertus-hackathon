import {
  type CompositionDefinition,
  immutable,
} from "../../../definition";
import { mathActions } from "../../../mathModel";
export const FractionNumberLineExperiment = immutable({
  id: "FractionNumberLineExperiment",
  demo: "fraction-number-line",
  version: 1,
  plane: "xy",
  units: "wholes",
  rendering: "svg",
  layout: "scene-and-controls",
  defaults: { task: { mode: "add", a: { n: 1, d: 2 }, b: { n: 1, d: 4 } } },
  viewSettings: { width: 900, height: 450 },
  measurements: ["count", "equation", "feedback"],
  components: {
    resources: ["MathAppearance", "FractionTasks"],
    traits: [
      "VisualBinding",
      "MathSequence",
      "FractionValue",
      "NumberLineBoard",
    ],
    behaviors: [],
    systems: ["FractionNumberLineSystem"],
    visuals: ["ShapeVisual2D", "NumberLineVisual", "FractionJumpVisual"],
    views: [
      "SVGWorldView",
      "ExperimentView",
      "MathReadoutView",
      "MathExperimentView",
      "FractionNumberLineScene",
    ],
    controls: [
      "ActionButton",
      "OptionSelect",
      "IntegerStepper",
      "PromptControl",
      "MathObjectControl",
      "PlaybackControls",
      "MathPlayback",
      "FractionInputControl",
      "FractionNumberLineControls",
      "FractionNumberLineCommands",
    ],
    prefabs: ["NumberLineBoard"],
    compositions: ["FractionNumberLineExperiment"],
  },
  systems: ["FractionNumberLineSystem"],
  instances: [
    {
      id: "fraction-number-line/board",
      prefab: "NumberLineBoard",
      parameters: {
        task: { mode: "add", a: { n: 1, d: 2 }, b: { n: 1, d: 4 } },
      },
    },
  ],
  actions: mathActions["fraction-number-line"],
  assumptions: [
    "Exact bounded integer mathematics; animation is presentation only.",
    "Fractions compare equal-sized wholes.",
  ],
} satisfies CompositionDefinition);
