import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import {
  boolean,
  choice,
  identity,
  num,
  object,
} from "../../../registry/contracts/parameterSchema";
export const arithmeticTask = object({
  operation: choice("add", "subtract"),
  a: num(0, 20, "circles", true),
  b: num(0, 20, "circles", true),
});
export const rectangleDimensions = object({
  width: num(0.1, 100, "m"),
  height: num(0.1, 100, "m"),
});
const action = (
  arguments_: PublicDefinition["configuration"],
  timing: "live" | "rebuild" = "live",
): PublicDefinition["commands"][string] => ({
  arguments: arguments_,
  timing,
  description: "",
});
export const scopedLearningContracts = {
  arithmetic: {
    configuration: object({ task: arithmeticTask, looping: boolean }, [
      "task",
      "looping",
    ]),
    commands: {
      NEXT_STEP: action(object({})),
      SET_PLAYING: action(object({ value: boolean })),
      REPLAY: action(object({})),
      RESET: action(object({}), "rebuild"),
      SET_LOOPING: action(object({ value: boolean })),
      SET_ARITHMETIC_TASK: action(object({ value: arithmeticTask }), "rebuild"),
      MOVE_TOKEN: action(object({ value: identity })),
    },
  },
  "area-perimeter": {
    configuration: object(
      rectangleDimensions.type === "object"
        ? rectangleDimensions.properties
        : {},
      ["width", "height"],
    ),
    commands: {
      SET_DIMENSIONS: {
        ...action(object({ value: rectangleDimensions }), "rebuild"),
        description: "Set this rectangle's width and height in metres; recalculate its area, perimeter and proportional drawing independently of other rectangles",
      },
      RESET: {
        ...action(object({}), "rebuild"),
        description: "Restore this rectangle's authored starting width and height",
      },
    },
  },
} satisfies Record<
  string,
  {
    configuration: PublicDefinition["configuration"];
    commands: PublicDefinition["commands"];
  }
>;
