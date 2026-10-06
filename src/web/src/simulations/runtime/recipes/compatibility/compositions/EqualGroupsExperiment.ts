import {
  type CompositionDefinition,
  immutable,
} from "../../../definition";
import { mathActions } from "../../../mathModel";
export const EqualGroupsExperiment = immutable({
  id: "EqualGroupsExperiment",
  demo: "equal-groups",
  version: 1,
  plane: "xy",
  units: "counts",
  rendering: "svg",
  layout: "scene-and-controls",
  defaults: {
    looping: true,
    task: { mode: "build", groups: 3, perGroup: 4, total: 12 },
  },
  viewSettings: { width: 900, height: 450 },
  measurements: ["count", "equation", "feedback"],
  components: {
    resources: ["MathAppearance", "EqualGroupsTasks"],
    traits: [
      "VisualBinding",
      "MathSequence",
      "CountableToken",
      "TokenGroup",
      "GroupingBoard",
    ],
    behaviors: [],
    systems: ["EqualGroupingSystem"],
    visuals: ["ShapeVisual2D", "CounterTokenVisual", "BasketVisual"],
    views: [
      "SVGWorldView",
      "ExperimentView",
      "MathReadoutView",
      "MathExperimentView",
      "EqualGroupsScene",
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
      "EqualGroupsControls",
      "EqualGroupsCommands",
    ],
    prefabs: ["CounterToken", "TokenGroup", "GroupingBoard"],
    compositions: ["EqualGroupsExperiment"],
  },
  systems: ["EqualGroupingSystem"],
  instances: [
    {
      id: "equal-groups/board",
      prefab: "GroupingBoard",
      parameters: {
        looping: true,
        task: { mode: "build", groups: 3, perGroup: 4, total: 12 },
      },
    },
  ],
  actions: mathActions["equal-groups"],
  assumptions: [
    "Exact bounded integer mathematics; animation is presentation only.",
    "Fractions compare equal-sized wholes.",
  ],
} satisfies CompositionDefinition);
