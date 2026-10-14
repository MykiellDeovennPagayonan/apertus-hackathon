import { useMathStore } from "../../runtime/mathSession";
import { dispatchCommand } from "../../runtime/session";
import type { CommandResult, UIAction } from "../../runtime/types";
import type { MathDemo } from "../traits/MathBoards";
export function parseMathCommand(
  demo: MathDemo,
  prompt: string,
): CommandResult {
  const text = prompt.toLowerCase().trim();
  let action: UIAction | undefined;
  const numbers = Array.from(text.matchAll(/-?\d+(?:\.\d+)?/g), (m) =>
    Number(m[0]),
  );
  if (/^(reset|start again|start over)$/.test(text)) action = { type: "RESET" };
  else if (/^(replay|restart)$/.test(text)) action = { type: "REPLAY" };
  else if (/^(next|next step)$/.test(text)) action = { type: "NEXT_STEP" };
  else if (/^(play|pause)$/.test(text))
    action = { type: "SET_PLAYING", value: text === "play" };
  else if (demo === "counting") {
    if (/^(count|show) /.test(text) && numbers.length === 1)
      action = {
        type: "SET_COUNTING_TASK",
        value: { mode: "count", target: numbers[0] },
      };
    else if (/^(place|put|fill) /.test(text) && numbers.length === 1)
      action = {
        type: "SET_COUNTING_TASK",
        value: { mode: "place", target: numbers[0] },
      };
  } else if (demo === "arithmetic" && numbers.length === 2) {
    if (/^add /.test(text))
      action = {
        type: "SET_ARITHMETIC_TASK",
        value: { operation: "add", a: numbers[0], b: numbers[1] },
      };
    else if (/^subtract /.test(text))
      action = {
        type: "SET_ARITHMETIC_TASK",
        value: {
          operation: "subtract",
          a: / from /.test(text) ? numbers[1] : numbers[0],
          b: / from /.test(text) ? numbers[0] : numbers[1],
        },
      };
  } else if (demo === "equal-groups" && numbers.length === 2) {
    if (/^(make|build) /.test(text))
      action = {
        type: "SET_GROUPING_TASK",
        value: {
          mode: "build",
          groups: numbers[0],
          perGroup: numbers[1],
          total: 0,
        },
      };
    else if (/^share /.test(text))
      action = {
        type: "SET_GROUPING_TASK",
        value: {
          mode: "share",
          total: numbers[0],
          groups: numbers[1],
          perGroup: 0,
        },
      };
  } else if (demo === "fraction-builder") {
    const comparison = text.match(/^compare (\d+)\/(\d+) and (\d+)\/(\d+)$/);
    if (comparison)
      action = {
        type: "SET_FRACTION_COMPARISON",
        value: {
          a: { n: Number(comparison[1]), d: Number(comparison[2]) },
          b: { n: Number(comparison[3]), d: Number(comparison[4]) },
        },
      };
    const match = text.match(/^show (\d+)\/(\d+)(?: (?:on|in) bar ([ab]))?$/);
    const split = text.match(
      /^split(?: bar ([ab]))? (?:each piece )?(?:into )?(\d+)$/,
    );
    if (match)
      action = {
        type: "SET_BAR_FRACTION",
        value: {
          bar: match[3] === "b" ? 1 : 0,
          fraction: { n: Number(match[1]), d: Number(match[2]) },
        },
      };
    else if (split)
      action = {
        type: "SUBDIVIDE_FRACTION",
        value: { bar: split[1] === "b" ? 1 : 0, factor: Number(split[2]) },
      };
  } else if (demo === "fraction-number-line") {
    const place = text.match(/^place (\d+)\/(\d+)$/);
    const pair = text.match(
      /^(add|subtract) (\d+)\/(\d+) (and|from) (\d+)\/(\d+)$/,
    );
    const board = useMathStore.getState().board;
    if (place)
      action = {
        type: "SET_NUMBER_LINE_TASK",
        value: {
          mode: "place",
          a: { n: Number(place[1]), d: Number(place[2]) },
          b: { n: 0, d: 1 },
        },
      };
    else if (pair) {
      const first = { n: Number(pair[2]), d: Number(pair[3]) },
        second = { n: Number(pair[5]), d: Number(pair[6]) };
      action = {
        type: "SET_NUMBER_LINE_TASK",
        value: {
          mode: pair[1] === "add" ? "add" : "subtract",
          a: pair[4] === "from" ? second : first,
          b: pair[4] === "from" ? first : second,
        },
      };
    } else if (/^use \d+ divisions$/.test(text) && board.demo === demo)
      action = { type: "SET_TICK_DIVISIONS", value: numbers[0] };
  }
  if (!action)
    return {
      handled: false,
      confirmation:
        "Try a suggested prompt or use the controls beside the diagram.",
    };
  const result = dispatchCommand(demo, action);
  return result.accepted
    ? {
        handled: true,
        action,
        confirmation: "Updated. Explore the diagram or take the next step.",
      }
    : { handled: false, confirmation: result.error };
}
export const CountingCommands = (prompt: string) =>
  parseMathCommand("counting", prompt);
export const ArithmeticCommands = (prompt: string) =>
  parseMathCommand("arithmetic", prompt);
export const EqualGroupsCommands = (prompt: string) =>
  parseMathCommand("equal-groups", prompt);
export const FractionBuilderCommands = (prompt: string) =>
  parseMathCommand("fraction-builder", prompt);
export const FractionNumberLineCommands = (prompt: string) =>
  parseMathCommand("fraction-number-line", prompt);
