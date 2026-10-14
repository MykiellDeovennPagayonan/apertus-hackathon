import type { Definition } from "./catalog";
import type { ComponentKind } from "./definition";

const rows: [string, ComponentKind][] = [
  ["GrownUpControls", "controls"],
  ["MathExperimentView", "views"],
  ["MathPlayback", "controls"],
  ["MathAppearance", "resources"],
  ["CountingTasks", "resources"],
  ["MathSequence", "traits"],
  ["CountableToken", "traits"],
  ["CountingBoard", "traits"],
  ["CountingSystem", "systems"],
  ["CounterTokenVisual", "visuals"],
  ["CountingBoxVisual", "visuals"],
  ["MathReadoutView", "views"],
  ["CountingScene", "views"],
  ["IntegerStepper", "controls"],
  ["MathObjectControl", "controls"],
  ["CountingControls", "controls"],
  ["CountingCommands", "controls"],
  ["CounterToken", "prefabs"],
  ["CountingBoard", "prefabs"],
  ["CountingExperiment", "compositions"],
  ["ArithmeticTasks", "resources"],
  ["ArithmeticBoard", "traits"],
  ["ArithmeticSystem", "systems"],
  ["OperationZonesVisual", "visuals"],
  ["ArithmeticScene", "views"],
  ["ArithmeticControls", "controls"],
  ["ArithmeticCommands", "controls"],
  ["ArithmeticBoard", "prefabs"],
  ["ArithmeticExperiment", "compositions"],
  ["EqualGroupsTasks", "resources"],
  ["TokenGroup", "traits"],
  ["GroupingBoard", "traits"],
  ["EqualGroupingSystem", "systems"],
  ["BasketVisual", "visuals"],
  ["EqualGroupsScene", "views"],
  ["EqualGroupsControls", "controls"],
  ["EqualGroupsCommands", "controls"],
  ["TokenGroup", "prefabs"],
  ["GroupingBoard", "prefabs"],
  ["EqualGroupsExperiment", "compositions"],
  ["FractionTasks", "resources"],
  ["FractionValue", "traits"],
  ["FractionBar", "traits"],
  ["FractionComparisonBoard", "traits"],
  ["FractionBuilderSystem", "systems"],
  ["FractionBarVisual", "visuals"],
  ["FractionBuilderScene", "views"],
  ["FractionInputControl", "controls"],
  ["FractionBuilderControls", "controls"],
  ["FractionBuilderCommands", "controls"],
  ["FractionBar", "prefabs"],
  ["FractionComparisonBoard", "prefabs"],
  ["FractionBuilderExperiment", "compositions"],
  ["NumberLineBoard", "traits"],
  ["FractionNumberLineSystem", "systems"],
  ["NumberLineVisual", "visuals"],
  ["FractionJumpVisual", "visuals"],
  ["FractionNumberLineScene", "views"],
  ["FractionNumberLineControls", "controls"],
  ["FractionNumberLineCommands", "controls"],
  ["NumberLineBoard", "prefabs"],
  ["FractionNumberLineExperiment", "compositions"],
];
export function registerMathDefinitions(definitions: Map<string, Definition>) {
  for (const [id, kind] of rows)
    definitions.set(`${kind}/${id}`, {
      id,
      kind,
      version: 1,
      ...(["visuals", "views"].includes(kind)
        ? { target: "svg" as const }
        : {}),
    });
  const dependencies: Record<string, string[]> = {
    CountingSystem: [
      "traits/MathSequence",
      "traits/CountableToken",
      "traits/CountingBoard",
    ],
    ArithmeticSystem: [
      "traits/MathSequence",
      "traits/CountableToken",
      "traits/ArithmeticBoard",
    ],
    EqualGroupingSystem: [
      "traits/MathSequence",
      "traits/CountableToken",
      "traits/TokenGroup",
      "traits/GroupingBoard",
    ],
    FractionBuilderSystem: [
      "traits/FractionValue",
      "traits/FractionBar",
      "traits/FractionComparisonBoard",
    ],
    FractionNumberLineSystem: [
      "traits/MathSequence",
      "traits/FractionValue",
      "traits/NumberLineBoard",
    ],
  };
  for (const [id, required] of Object.entries(dependencies))
    Object.assign(definitions.get(`systems/${id}`) ?? {}, {
      required,
      reads: ["task", "clock", "commands"],
      writes: ["math.board", "math.tokens", "math.sequence"],
    });
}
