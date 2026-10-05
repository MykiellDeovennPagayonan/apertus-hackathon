import type { FieldPresentation } from "./SchemaForm";

/** Presentation metadata never changes command names, arguments, or validation. */
export function commandPresentation(command: string, definition: string) {
  const labels: Record<string, string> = {
    NEXT_STEP: "Next step",
    RESET: "Restart activity",
    reset: "Restore starting values",
    REPLAY: "Replay activity",
    SET_PLAYING: "Playback",
    SET_LOOPING: "Repeat activity",
    SET_ARITHMETIC_TASK: "Choose a calculation",
    SET_COUNTING_TASK: "Choose a counting task",
    SET_GROUPING_TASK: "Choose an equal groups task",
    SET_FRACTION_COMPARISON: "Compare two fractions",
    SET_BAR_FRACTION: "Change one fraction",
    TOGGLE_FRACTION_PIECE: "Shade or unshade a piece",
    SUBDIVIDE_FRACTION: "Divide a bar into smaller parts",
    SET_NUMBER_LINE_TASK: "Choose a fraction task",
    SET_TICK_DIVISIONS: "Number line divisions",
    PLACE_FRACTION: "Move the marker",
    CHECK_PLACEMENT: "Check placement",
    CHECK_COUNT: "Check your count",
    MOVE_TOKEN: "Move a circle",
    COUNT_TOKEN: "Count a circle",
    PLACE_TOKEN: "Place a circle",
    REMOVE_TOKEN: "Remove a circle",
    DISTRIBUTE_NEXT: "Share the next circle",
  };
  const presentation: FieldPresentation = {
    "value.bar": { label: "Bar", choices: { "0": "Bar A", "1": "Bar B" } },
    "value.piece": { label: "Piece number" },
    "value.factor": { label: "Subdivision factor" },
    "value.operation": {
      label: "Operation",
      choices: { add: "Addition", subtract: "Subtraction" },
    },
    "value.target": { label: "Number of circles" },
    "value.perGroup": { label: "Circles per group" },
    "value.n": { label: "Shaded parts" },
    "value.d": { label: "Total parts" },
  };
  if (definition.includes("fraction")) {
    if (command === "SET_FRACTION_COMPARISON")
      presentation.value = {
        help: "Shaded parts cannot exceed total parts. Applying replaces both bars; changing a denominator creates a new partition.",
      };
    presentation["value.a"] = { label: "First fraction" };
    presentation["value.b"] = { label: "Second fraction" };
    for (const fraction of ["a", "b", "fraction"]) {
      presentation[`value.${fraction}.n`] = { label: "Shaded parts" };
      presentation[`value.${fraction}.d`] = { label: "Total parts" };
    }
  } else {
    presentation["value.a"] = { label: "First number" };
    presentation["value.b"] = { label: "Second number" };
  }
  if (/SET_.*TASK/.test(command))
    presentation.value = {
      help: "Starting a new activity clears the current progress.",
    };
  return {
    label: labels[command],
    presentation,
    submitLabel: /SET_.*TASK/.test(command)
      ? "Start this activity"
      : command === "SET_FRACTION_COMPARISON"
        ? "Compare fractions"
        : undefined,
  };
}
