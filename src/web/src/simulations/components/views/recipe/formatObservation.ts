"use client";

import { formatDataNumber } from "../dataPresentation";

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
