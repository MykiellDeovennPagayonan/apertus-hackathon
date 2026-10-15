import type { FractionValue } from "../traits/MathBoards";
export const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);
export const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
export const rational = (n: number, d: number): FractionValue => {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
export const compare = (a: FractionValue, b: FractionValue): "=" | "<" | ">" =>
  a.n * b.d === b.n * a.d ? "=" : a.n * b.d < b.n * a.d ? "<" : ">";
export const fractionText = (f: FractionValue) => `${f.n}/${f.d}`;
export const mixedText = (f: FractionValue) => {
  const v = rational(f.n, f.d);
  const whole = Math.floor(v.n / v.d);
  const rest = v.n % v.d;
  return rest === 0
    ? `${whole}`
    : whole
      ? `${whole} ${rest}/${v.d}`
      : fractionText(v);
};
export const validFraction = (
  v: unknown,
  proper = false,
): v is FractionValue => {
  if (!v || typeof v !== "object") return false;
  const f = v as FractionValue;
  return (
    Number.isInteger(f.n) &&
    Number.isInteger(f.d) &&
    f.d >= 1 &&
    f.d <= 12 &&
    f.n >= 0 &&
    f.n <= (proper ? f.d : 3 * f.d)
  );
};
