"use client";

import { formatDataNumber } from "../../../registry/contracts/dataPresentation";

export const display = (v: unknown, precision = 3): string =>
  typeof v === "number"
    ? Number.isFinite(v)
      ? formatDataNumber(v, precision)
      : "Unavailable"
    : typeof v === "string"
      ? v
      : typeof v === "boolean"
        ? v
          ? "Yes"
          : "No"
        : v === undefined || v === null
          ? "Unavailable"
          : Array.isArray(v)
            ? `${v.length} items`
            : "Structured observation";

/** Structured line outputs are mathematical notation, not an internal property table. */
export function lineEquation(
  value: unknown,
  precision = 3,
): string | undefined {
  if (
    !value ||
    typeof value !== "object" ||
    !("kind" in value) ||
    value.kind !== "line-equation"
  )
    return undefined;
  const equation = value as {
    vertical?: unknown;
    x?: unknown;
    slope?: unknown;
    intercept?: unknown;
  };
  if (equation.vertical === true)
    return typeof equation.x === "number" && Number.isFinite(equation.x)
      ? `x = ${display(equation.x, precision)}`
      : "Unavailable";
  const { slope, intercept } = equation;
  if (
    equation.vertical !== false ||
    typeof slope !== "number" ||
    typeof intercept !== "number" ||
    !Number.isFinite(slope) ||
    !Number.isFinite(intercept)
  )
    return "Unavailable";
  if (slope === 0) return `y = ${display(intercept, precision)}`;
  const coefficient =
    slope === 1 ? "" : slope === -1 ? "−" : display(slope, precision);
  const constant =
    intercept === 0
      ? ""
      : ` ${intercept < 0 ? "−" : "+"} ${display(Math.abs(intercept), precision)}`;
  return `y = ${coefficient}x${constant}`;
}
