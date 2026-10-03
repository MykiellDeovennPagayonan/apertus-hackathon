/** Exact signed rationals; unsafe arithmetic fails before candidate state commits. */
export interface Rational {
  n: number;
  d: number;
}
export function rational(n: number, d = 1): Rational {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
    throw new Error("Expected safe integer rational with nonzero denominator");
  let a = BigInt(n),
    b = BigInt(d);
  if (b < BigInt(0)) {
    a = -a;
    b = -b;
  }
  let x = a < BigInt(0) ? -a : a,
    y = b;
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return { n: Number(a / x), d: Number(b / x) };
}
function checked(n: bigint, d: bigint): Rational {
  let a = n < BigInt(0) ? -n : n,
    b = d < BigInt(0) ? -d : d;
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  const numerator = n / a,
    denominator = d / a;
  if (
    numerator > BigInt(Number.MAX_SAFE_INTEGER) ||
    numerator < -BigInt(Number.MAX_SAFE_INTEGER) ||
    denominator > BigInt(Number.MAX_SAFE_INTEGER) ||
    denominator < -BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("Exact arithmetic exceeds safe rational budget");
  return rational(Number(numerator), Number(denominator));
}
export const subtract = (a: Rational, b: Rational) =>
  checked(
    BigInt(a.n) * BigInt(b.d) - BigInt(b.n) * BigInt(a.d),
    BigInt(a.d) * BigInt(b.d),
  );
export const divide = (a: Rational, b: Rational) => {
  if (!b.n) throw new Error("Cannot divide both sides by zero");
  return checked(BigInt(a.n) * BigInt(b.d), BigInt(a.d) * BigInt(b.n));
};
export const multiply = (a: Rational, b: Rational) =>
  checked(BigInt(a.n) * BigInt(b.n), BigInt(a.d) * BigInt(b.d));
export const formatRational = (q: Rational) =>
  q.d === 1 ? String(q.n) : `${q.n}/${q.d}`;
export interface EquationState {
  a: Rational;
  b: Rational;
  c: Rational;
  original: { a: Rational; b: Rational; c: Rational };
  history: { a: Rational; b: Rational; c: Rational; equation: string }[];
}
export function equationText(s: Pick<EquationState, "a" | "b" | "c">) {
  const coefficient =
    s.a.n === 0
      ? "0"
      : s.a.n === s.a.d
        ? "x"
        : s.a.n === -s.a.d
          ? "−x"
          : `${formatRational(s.a)}x`;
  const constant =
    s.b.n === 0
      ? ""
      : s.b.n < 0
        ? ` − ${formatRational({ ...s.b, n: -s.b.n })}`
        : ` + ${formatRational(s.b)}`;
  return `${coefficient}${constant} = ${formatRational(s.c)}`;
}
export function equationInitial(p: Record<string, unknown>): EquationState {
  const original = {
    a: rational(Number(p.coefficient)),
    b: rational(Number(p.constant)),
    c: rational(Number(p.right)),
  };
  return { ...original, original: structuredClone(original), history: [] };
}
export function equationApply(
  s: EquationState,
  action: string,
  value?: unknown,
): EquationState {
  if (action === "UNDO") {
    const previous = s.history.at(-1);
    if (!previous) return s;
    return {
      ...s,
      a: previous.a,
      b: previous.b,
      c: previous.c,
      history: s.history.slice(0, -1),
    };
  }
  if (s.history.length >= 24)
    throw new Error("Step history is full; undo or reset to continue");
  const q = rational(Number(value));
  const next =
    action === "SUBTRACT_BOTH"
      ? { ...s, b: subtract(s.b, q), c: subtract(s.c, q) }
      : action === "DIVIDE_BOTH"
        ? { ...s, a: divide(s.a, q), b: divide(s.b, q), c: divide(s.c, q) }
        : (() => {
            throw new Error("Unsupported equation operation");
          })();
  return {
    ...next,
    history: [
      ...s.history,
      { a: s.a, b: s.b, c: s.c, equation: equationText(s) },
    ],
  };
}
export function equationMeasure(s: EquationState) {
  const solution = s.a.n ? divide(subtract(s.c, s.b), s.a) : null;
  const substitution = solution
    ? subtract(
        multiply(s.original.a, solution),
        subtract(s.original.c, s.original.b),
      ).n === 0
    : false;
  return {
    equation: equationText(s),
    solution: solution
      ? formatRational(solution)
      : s.b.n * s.c.d === s.c.n * s.b.d
        ? "Every x"
        : "No solution",
    substitution,
    leftCoefficient: formatRational(s.a),
    leftConstant: formatRational(s.b),
    right: formatRational(s.c),
    steps: s.history.map((h) => h.equation),
  };
}
export function lineMeasure(p: Record<string, unknown>) {
  const slope = Number(p.slope),
    intercept = Number(p.intercept),
    xMin = Number(p.xMin),
    xMax = Number(p.xMax);
  if (xMin >= xMax)
    throw new Error("Line domain minimum must be below its maximum");
  const points = Array.from({ length: 21 }, (_, i) => {
    const x = xMin + ((xMax - xMin) * i) / 20;
    return { x, y: slope * x + intercept };
  });
  return {
    equation: `${slope === 0 ? "y" : `y = ${slope === 1 ? "" : slope === -1 ? "−" : slope}x`}${
      slope === 0
        ? ` = ${intercept}`
        : intercept === 0
          ? ""
          : ` ${intercept < 0 ? "−" : "+"} ${Math.abs(intercept)}`
    }`,
    points,
    yAtZero: intercept,
    yAtOne: slope + intercept,
    rise: slope,
    run: 1,
    marker: [
      { x: 0, y: intercept },
      { x: 1, y: intercept },
      { x: 1, y: intercept + slope },
    ],
    xMin,
    xMax,
  };
}
export function circleMeasure(p: Record<string, unknown>) {
  const radius = Number(p.radius);
  if (!(radius > 0) || !Number.isFinite(radius))
    throw new Error("Radius must be positive");
  const diameter = 2 * radius,
    circumference = 2 * Math.PI * radius;
  return { radius, diameter, circumference, ratio: circumference / diameter };
}
