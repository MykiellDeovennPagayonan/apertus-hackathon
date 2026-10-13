import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import {
  operations,
  templateNames,
  templateParameters,
} from "../../runtime/capabilities";
import { mathActions } from "../../runtime/mathModel";
import { object } from "../../../registry/contracts/parameterSchema";
import type { MathDemo } from "../traits/MathBoards";
import { scopedLearningContracts } from "./scopedLearningContracts";
import { arithmeticTeaching, rectangleTeaching } from "./teaching";

export const learningDefaults: Record<string, Record<string, unknown>> = {
  counting: { task: { mode: "count", target: 5 }, looping: false },
  arithmetic: { task: { operation: "add", a: 3, b: 2 }, looping: false },
  "equal-groups": {
    task: { mode: "build", groups: 3, perGroup: 4, total: 12 },
    looping: false,
  },
  "fraction-builder": {
    bars: [
      { n: 1, d: 2 },
      { n: 2, d: 4 },
    ],
  },
  "fraction-number-line": {
    task: { mode: "add", a: { n: 1, d: 2 }, b: { n: 1, d: 4 } },
  },
  ratio: { numerator: 3, denominator: 4 },
  "area-perimeter": { width: 4, height: 3 },
  coordinates: { x: 2, y: 3 },
  probability: { preset: "coin", seed: 42, trials: 100 },
};
const titles: Record<string, string> = {
  counting: "Counting",
  arithmetic: "Arithmetic",
  "equal-groups": "Equal groups",
  "fraction-builder": "Fraction comparison",
  "fraction-number-line": "Fraction number line",
  ratio: "Ratio",
  "area-perimeter": "Rectangle metrics",
  coordinates: "Coordinates",
  probability: "Random trials",
};
export const learningDefinitions: PublicDefinition[] = Object.keys(
  learningDefaults,
).map((demo) => {
  const scoped =
    scopedLearningContracts[demo as keyof typeof scopedLearningContracts];
  const op = scoped?.commands ?? operations[demo as keyof typeof operations];
  const outputNames =
    demo in mathActions
      ? ["board", "feedback", "playing"]
      : demo === "ratio"
        ? ["ratio", "percentage"]
        : demo === "area-perimeter"
          ? ["area", "perimeter"]
          : demo === "coordinates"
            ? ["x", "y"]
            : ["frequencies"];
  return {
    id: `models/${demo}`,
    version: 1,
    title: titles[demo],
    description: titles[demo],
    category: "models",
    tags: ["mathematics", demo],
    teaching:
      demo === "arithmetic"
        ? arithmeticTeaching
        : demo === "area-perimeter"
          ? rectangleTeaching
          : undefined,
    configuration:
      scoped?.configuration ??
      templateParameters(
        `compositions/${templateNames[demo as keyof typeof templateNames]}`,
      ),
    defaults: learningDefaults[demo],
    inputs: {},
    outputs: {
      ...Object.fromEntries(
        outputNames.map((key) => [
          key,
          {
            kind:
              key === "frequencies" ? ("dataset" as const) : ("value" as const),
            unit:
              key === "area"
                ? "m²"
                : key === "perimeter"
                  ? "m"
                  : key === "percentage"
                    ? "%"
                    : "1",
            crossScope: true,
          },
        ]),
      ),
      appearance: {
        kind: "attachment",
        unit: `models/${demo}`,
        cardinality: "many",
      },
    },
    commands: Object.fromEntries(
      Object.entries(op)
        .filter(
          ([key]) =>
            !(demo in mathActions) ||
            mathActions[demo as MathDemo].includes(key),
        )
        .map(([key, o]) => [
          key,
          {
            ...o,
            ...([
              "SET_LOOPING",
              "SET_TICK_DIVISIONS",
              "MOVE_POINT",
              "SET_RATIO",
              "SET_DIMENSIONS",
            ].includes(key)
              ? { submission: "continuous" as const }
              : {}),
          },
        ]),
    ),
    placement: ["logic"],
    lifecycle: {
      authored: Object.keys(learningDefaults[demo]),
      presentation: [],
      clock: demo in mathActions,
      reset: "authored",
      capture: false,
    },
    assumptions: [
      demo in mathActions
        ? "The board owns tokens and exact fraction state. Token interactions invoke its declared commands."
        : "Uses the existing deterministic educational calculation.",
    ],
    runtimeProvider: `models/${demo}`,
  };
});
export const learningAppearances: PublicDefinition[] = learningDefinitions.map(
  (m) => ({
    ...m,
    id: `appearance/${m.id.slice(7)}`,
    title: `${m.title} appearance`,
    category: "appearance",
    configuration: object({}),
    defaults: {},
    inputs: { model: { kind: "attachment", unit: m.id } },
    outputs: {},
    commands: {},
    runtimeProvider: undefined,
    presentationProvider: `appearance/${m.id.slice(7)}`,
    lifecycle: { ...m.lifecycle, clock: false },
  }),
);
export const resourceDefinitions: PublicDefinition[] = learningDefinitions.map(
  (m) => ({
    ...m,
    id: `resources/${m.id.slice(7)}-preset`,
    title: `${m.title} preset`,
    category: "resources",
    inputs: {},
    outputs: {},
    commands: {},
    runtimeProvider: undefined,
    presentationProvider: "resources/preset",
    application: { target: m.id },
    lifecycle: { ...m.lifecycle, clock: false },
  }),
);
