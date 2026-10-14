import type { DomainModel } from "../../registry/contracts/domainContribution";
import {
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { buttonAction, geometryDependencies, valueAction } from "./common";

export const placeColumns = [
  "hundreds",
  "tens",
  "ones",
  "tenths",
  "hundredths",
  "thousandths",
] as const;
/** Column weights in thousandths: all place-value arithmetic stays in integers. */
const weights = [100000, 10000, 1000, 100, 10, 1];
const maximumThousandths = 999999;
const maximumBlocks = 99;
const counts: ParameterSchema = {
  type: "array",
  items: num(0, maximumBlocks, "blocks", true),
  minItems: 6,
  maxItems: 6,
};
const start = num(0, 999.99);
const parameters = object(
  {
    start,
    counts,
    before: num(0, maximumThousandths, "thousandths", true),
    lastAction: choice("start", "times", "divide", "break", "tidy"),
  },
  ["counts", "before", "lastAction"],
);

function toHundredths(value: number) {
  const hundredths = Math.round(value * 100);
  if (Math.abs(value * 100 - hundredths) > 1e-6)
    throw new Error("Start numbers may have at most two decimal places");
  return hundredths;
}
const total = (values: readonly number[]) =>
  values.reduce((sum, count, i) => sum + count * weights[i], 0);
const digits = (thousandths: number) =>
  weights.map((weight) => Math.floor(thousandths / weight) % 10);
/** Exact decimal text from integer thousandths; trailing zeros are not place-value content. */
export function decimalText(thousandths: number) {
  const whole = Math.floor(thousandths / 1000);
  const fraction = String(thousandths % 1000)
    .padStart(3, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  const startValue = Number(input.start);
  const startThousandths = toHundredths(startValue) * 10;
  const blocks = input.counts
    ? [...(input.counts as number[])]
    : digits(startThousandths);
  const value = total(blocks);
  if (value > maximumThousandths)
    throw new Error("The board supports numbers below 1000");
  const lastAction = (input.lastAction as string | undefined) ?? "start";
  return {
    start: startValue,
    counts: blocks,
    ...(input.before !== undefined && lastAction !== "start"
      ? { before: input.before }
      : {}),
    lastAction,
  };
}

function apply(
  state: Record<string, unknown>,
  action: string,
  value?: unknown,
) {
  const current = accepted(state);
  const blocks = current.counts;
  const before = total(blocks);
  const next = (counts: number[], lastAction: string) =>
    accepted({ start: current.start, counts, before, lastAction });
  switch (action) {
    case "PLACE_TIMES_TEN":
      if (blocks[0] > 0)
        throw new Error("Multiplying by ten would need a thousands column");
      return next([...blocks.slice(1), 0], "times");
    case "PLACE_DIVIDE_TEN":
      if (blocks[5] > 0)
        throw new Error("Dividing by ten would need a ten-thousandths column");
      return next([0, ...blocks.slice(0, 5)], "divide");
    case "PLACE_BREAK_ONE":
    case "PLACE_BREAK_TENTH": {
      const column = action === "PLACE_BREAK_ONE" ? 2 : 3;
      if (blocks[column] === 0)
        throw new Error(
          `There is no ${placeColumns[column].slice(0, -1)} to break`,
        );
      if (blocks[column + 1] + 10 > maximumBlocks)
        throw new Error(`The ${placeColumns[column + 1]} column is full`);
      const counts = [...blocks];
      counts[column] -= 1;
      counts[column + 1] += 10;
      return next(counts, "break");
    }
    case "PLACE_TIDY":
      return next(digits(before), "tidy");
    case "set:placeStart":
      return accepted({ start: value });
    default:
      throw new Error("Unsupported place-value operation");
  }
}

export const placeValueModel: DomainModel = {
  ref: "prefabs/math-geometry/PlaceValue",
  version: 1,
  name: "Decimal place value with base-ten blocks",
  description:
    "A place-value board with base-ten blocks. Multiplying or dividing by ten moves every block one column; breaking a block into ten smaller ones keeps the number the same.",
  tags: ["decimal", "place value", "base-ten blocks", "multiply by ten"],
  assumptions: [
    "Columns from hundreds to thousandths; values are held exactly as whole numbers of thousandths. Start numbers have at most two decimal places and are below 1000.",
    "Multiplying by ten is rejected when hundreds are present and dividing by ten is rejected when thousandths are present; negative numbers are unsupported.",
  ],
  parameters,
  defaults: { start: 12.34 },
  outputs: {
    value: { unit: "number", description: "Number shown by the board" },
    text: { unit: "text", description: "Exact decimal text of the board" },
    counts: {
      unit: "blocks",
      description:
        "Blocks in hundreds, tens, ones, tenths, hundredths and thousandths",
    },
    before: {
      unit: "text",
      description: "Exact number before the last change, empty at the start",
    },
    change: {
      unit: "text",
      description: "start, ten times larger, ten times smaller or same value",
    },
  },
  actions: {
    PLACE_TIMES_TEN: buttonAction(
      "Multiply by ten: every block becomes worth ten times more and moves one column left",
    ),
    PLACE_DIVIDE_TEN: buttonAction(
      "Divide by ten: every block moves one column right",
    ),
    PLACE_BREAK_ONE: buttonAction(
      "Break one ones block into ten tenths; the number stays the same",
    ),
    PLACE_BREAK_TENTH: buttonAction(
      "Break one tenth into ten hundredths; the number stays the same",
    ),
    PLACE_TIDY: buttonAction(
      "Regroup every ten blocks into one larger block; the number stays the same",
    ),
    "set:placeStart": valueAction(
      start,
      "Start the board at a new number with up to two decimal places",
    ),
  },
  dependencies: geometryDependencies("math-geometry/PlaceValue"),
  presentation: "math-place-value",
  requiredObservations: ["text"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: (state) => accepted(state),
  apply,
  measure: (state) => {
    const accepted_ = accepted(state);
    const value = total(accepted_.counts);
    const before = accepted_.before as number | undefined;
    return {
      value: value / 1000,
      text: decimalText(value),
      counts: [...accepted_.counts],
      before: before === undefined ? "" : decimalText(before),
      change:
        accepted_.lastAction === "times"
          ? "ten times larger"
          : accepted_.lastAction === "divide"
            ? "ten times smaller"
            : accepted_.lastAction === "start"
              ? "start"
              : "same value",
    };
  },
};
