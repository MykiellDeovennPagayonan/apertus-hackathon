import { registeredAssemblyActions } from "./assembly";
import {
  boolean,
  choice,
  identity,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "./parameterSchema";
import type { DemoType, UIAction } from "./types";
export interface OperationMetadata {
  arguments: ParameterSchema;
  timing: "live" | "relaunch" | "rebuild";
  target: "session" | "instance";
  description: string;
}
const operation = (
  value?: ParameterSchema,
  timing: OperationMetadata["timing"] = "live",
  target: OperationMetadata["target"] = "session",
  description = "",
): OperationMetadata => ({
  arguments: object(value ? { value } : {}),
  timing,
  target,
  description,
});
const playback = {
  NEXT_STEP: operation(),
  SET_PLAYING: operation(boolean),
  REPLAY: operation(),
  RESET: operation(undefined, "rebuild"),
};
const fraction = object({
  n: num(0, 36, "parts", true),
  d: num(1, 12, "parts", true),
});
export const taskSchemas = {
  counting: object({
    mode: choice("count", "place"),
    target: num(0, 20, "circles", true),
  }),
  arithmetic: object({
    operation: choice("add", "subtract"),
    a: num(0, 20, "circles", true),
    b: num(0, 20, "circles", true),
  }),
  "equal-groups": object({
    mode: choice("build", "share"),
    groups: num(1, 6, "baskets", true),
    perGroup: num(0, 10, "circles", true),
    total: num(0, 60, "circles", true),
  }),
  "fraction-number-line": object({
    mode: choice("place", "add", "subtract"),
    a: fraction,
    b: fraction,
  }),
};
export const operations: Record<DemoType, Record<string, OperationMetadata>> = {
  assembly: {
    ...registeredAssemblyActions(),
    RESET: playback.RESET,
  },
  gas: {
    SET_VOLUME: operation(num(0.25, 2, "L")),
    SET_TEMPERATURE: operation(num(100, 600, "K")),
    SET_AMOUNT: operation(num(0.1, 5, "mmol")),
    SET_PLAYING: operation(boolean),
    RESET: playback.RESET,
  },
  projectile: {
    SET_ANGLE: operation(num(0, 90, "degrees"), "relaunch", "instance"),
    COMPARE_ANGLE: operation(num(0, 90, "degrees"), "relaunch"),
    SET_VELOCITY: operation(num(5, 40, "m/s"), "relaunch", "instance"),
    SET_GRAVITY: operation(
      choice("Moon", "Earth", "Mars", "Jupiter"),
      "relaunch",
    ),
    SET_PLAYING: operation(boolean),
    SET_SLOW_MO: operation(boolean),
    SET_TRAJECTORY_VISIBLE: operation(boolean, "live", "instance"),
    CLEAR_COMPARE: operation(undefined, "rebuild"),
    SHOW_VECTORS: operation(),
    HIDE_VECTORS: operation(),
    LAUNCH: operation(undefined, "relaunch"),
    RESET: operation(undefined, "rebuild"),
  },
  bridge: {
    MOVE_LOAD: operation(
      num(0.05, 0.95, "fraction of span"),
      "live",
      "instance",
    ),
    SET_LOAD: operation(num(2, 30, "t"), "live", "instance"),
    DOUBLE_LENGTH: operation(undefined, "rebuild"),
    NORMAL_LENGTH: operation(undefined, "rebuild"),
    MORE_TRIANGLES: operation(undefined, "rebuild"),
    REMOVE_MIDDLE: operation(undefined, "rebuild"),
    REBUILD: operation(undefined, "rebuild"),
    RESET: operation(undefined, "rebuild"),
    SELECT_MEMBER: operation(choice(null), "live"),
  },
  town: {
    SET_TIME: operation(num(0, 24, "hour")),
    SET_SPEED: operation(choice(1, 2, 4)),
    SET_PLAYING: operation(boolean),
    CLOSE_ROAD: operation(),
    OPEN_ROAD: operation(),
    MOVE_MARKET: operation(undefined, "rebuild"),
    MARKET_BUSY: operation(),
    RESET: operation(undefined, "rebuild"),
  },
  counting: {
    ...playback,
    SET_LOOPING: operation(boolean),
    SET_COUNTING_TASK: operation(taskSchemas.counting, "rebuild"),
    COUNT_TOKEN: operation(identity),
    PLACE_TOKEN: operation(identity),
    REMOVE_TOKEN: operation(identity),
    CHECK_COUNT: operation(),
  },
  arithmetic: {
    ...playback,
    SET_LOOPING: operation(boolean),
    SET_ARITHMETIC_TASK: operation(taskSchemas.arithmetic, "rebuild"),
    MOVE_TOKEN: operation(identity),
  },
  "equal-groups": {
    ...playback,
    SET_LOOPING: operation(boolean),
    SET_GROUPING_TASK: operation(taskSchemas["equal-groups"], "rebuild"),
    DISTRIBUTE_NEXT: operation(),
  },
  "fraction-builder": {
    RESET: playback.RESET,
    SET_FRACTION_COMPARISON: operation(
      object({ a: fraction, b: fraction }),
      "rebuild",
    ),
    SET_BAR_FRACTION: operation(
      object({ bar: choice(0, 1), fraction }),
      "rebuild",
    ),
    TOGGLE_FRACTION_PIECE: operation(
      object({ bar: choice(0, 1), piece: num(0, 11, "piece", true) }),
    ),
    SUBDIVIDE_FRACTION: operation(
      object({ bar: choice(0, 1), factor: num(2, 12, "factor", true) }),
      "rebuild",
    ),
  },
  "fraction-number-line": {
    ...playback,
    SET_NUMBER_LINE_TASK: operation(
      taskSchemas["fraction-number-line"],
      "rebuild",
    ),
    SET_TICK_DIVISIONS: operation(choice(1, 2, 3, 4, 6, 12)),
    PLACE_FRACTION: operation(num(0, 36, "tick", true)),
    CHECK_PLACEMENT: operation(),
  },
  ratio: {
    SET_RATIO: operation(
      object({
        numerator: num(0, 1000, "parts"),
        denominator: num(1, 1000, "whole"),
      }),
      "rebuild",
    ),
    RESET: playback.RESET,
  },
  "area-perimeter": {
    SET_DIMENSIONS: operation(
      object({ width: num(0.1, 100, "m"), height: num(0.1, 100, "m") }),
      "rebuild",
    ),
    RESET: playback.RESET,
  },
  coordinates: {
    MOVE_POINT: operation(
      object({ x: num(-10, 10, "math units"), y: num(-10, 10, "math units") }),
      "live",
      "instance",
    ),
    RESET: playback.RESET,
  },
  probability: {
    RUN_TRIALS: operation(num(1, 10000, "trials", true), "rebuild"),
    SET_DISTRIBUTION: operation(
      object({
        preset: choice("coin", "die"),
        seed: num(0, 4294967295, "seed", true),
        trials: num(1, 10000, "trials", true),
      }),
      "rebuild",
    ),
    RESET: playback.RESET,
  },
};
// Member identity is checked against actual topology by the handler.
operations.bridge.SELECT_MEMBER = operation({ type: "string", maxLength: 100 });
export function validateCommand(demo: DemoType, command: UIAction) {
  const op = operations[demo]?.[command.type];
  if (!op) throw new Error(`${demo}.${command.type}: unsupported action`);
  if (
    Object.keys(command).some((k) => !["type", "value", "target"].includes(k))
  )
    throw new Error("Unknown command field");
  validateValue(
    op.arguments,
    command.value === undefined ? {} : { value: command.value },
    command.type,
  );
}
export const templateNames: Record<Exclude<DemoType, "assembly">, string> = {
  gas: "GasPressureExperiment",
  projectile: "ProjectileExperiment",
  bridge: "BridgeExperiment",
  town: "TownExperiment",
  counting: "CountingExperiment",
  arithmetic: "ArithmeticExperiment",
  "equal-groups": "EqualGroupsExperiment",
  "fraction-builder": "FractionBuilderExperiment",
  "fraction-number-line": "FractionNumberLineExperiment",
  ratio: "RatioExperiment",
  "area-perimeter": "AreaPerimeterExperiment",
  coordinates: "CoordinateExperiment",
  probability: "ProbabilityExperiment",
};
export function templateDemo(ref: string): DemoType {
  if (ref === "assemblies/GeneratedExperiment") return "assembly";
  const entry = Object.entries(templateNames).find(
    ([, id]) => ref === `compositions/${id}`,
  );
  if (entry) return entry[0] as DemoType;
  if (
    [
      "compositions/AngleComparisonExperiment",
      "compositions/ProjectileSweepExperiment",
    ].includes(ref)
  )
    return "projectile";
  throw new Error(`${ref}: unknown composition`);
}
export function templateParameters(ref: string): ParameterSchema {
  const demo = templateDemo(ref);
  if (demo === "assembly") return object({});
  if (demo === "gas")
    return object(
      {
        amount: num(0.1, 5, "mmol"),
        temperature: num(100, 600, "K"),
        volume: num(0.25, 2, "L"),
        playing: boolean,
      },
      ["amount", "temperature", "volume", "playing"],
    );
  if (demo === "projectile") {
    const props = {
      playing: boolean,
      angle: num(0, 90, "degrees"),
      speed: num(5, 40, "m/s"),
      gravityPreset: choice("Moon", "Earth", "Mars", "Jupiter"),
      angles: {
        type: "array",
        items: num(0, 90, "degrees"),
        minItems: 2,
        maxItems: 2,
      } as ParameterSchema,
    };
    if (ref === "compositions/AngleComparisonExperiment") {
      const { angle: _angle, ...comparisonProps } = props;
      return object(comparisonProps, Object.keys(comparisonProps));
    }
    return object(props, Object.keys(props));
  }
  if (demo === "bridge")
    return object(
      {
        loadPos: num(0.05, 0.95),
        loadTons: num(2, 30, "t"),
        spanScale: choice(1, 2),
        dense: boolean,
      },
      ["loadPos", "loadTons", "spanScale", "dense"],
    );
  if (demo === "town")
    return object(
      {
        time: num(0, 24, "hour"),
        speed: choice(1, 2, 4),
        playing: {
          type: "boolean",
          description: "false pauses the clock; true advances time",
        },
      },
      ["time", "speed", "playing"],
    );
  if (demo === "fraction-builder")
    return object(
      { bars: { type: "array", items: fraction, minItems: 2, maxItems: 2 } },
      ["bars"],
    );
  if (demo in taskSchemas)
    return object(
      {
        task: taskSchemas[demo as keyof typeof taskSchemas],
        ...(demo !== "fraction-number-line" ? { looping: boolean } : {}),
      },
      demo === "fraction-number-line" ? ["task"] : ["task", "looping"],
    );
  const action =
    demo === "ratio"
      ? "SET_RATIO"
      : demo === "area-perimeter"
        ? "SET_DIMENSIONS"
        : demo === "coordinates"
          ? "MOVE_POINT"
          : "SET_DISTRIBUTION";
  const schema = operations[demo][action].arguments;
  const value = schema.type === "object" ? schema.properties.value : object({});
  return value.type === "object"
    ? object(value.properties, Object.keys(value.properties))
    : value;
}

for (const demo of Object.keys(operations) as DemoType[])
  if (operations[demo].SET_PLAYING)
    operations[demo].SET_PLAYING.description =
      "true advances the model clock; false pauses the model clock";
