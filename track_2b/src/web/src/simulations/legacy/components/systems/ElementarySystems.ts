import type {
  RandomTrialState,
  RatioState,
  RectangleDimensions,
} from "../traits/ElementaryBoards";
export function RatioSystem(s: RatioState) {
  return {
    ratio: s.numerator / s.denominator,
    percentage: (100 * s.numerator) / s.denominator,
  };
}
export function RectangleMetricsSystem(s: RectangleDimensions) {
  return { area: s.width * s.height, perimeter: 2 * (s.width + s.height) };
}
/** Reproducible uint32 LCG. Educational uniform trials, not cryptographic randomness. */
export function RandomTrialSystem(s: RandomTrialState) {
  let seed = s.seed >>> 0;
  const count = s.preset === "coin" ? 2 : 6,
    frequencies = Array<number>(count).fill(0);
  for (let i = 0; i < s.trials; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    frequencies[Math.floor((seed / 4294967296) * count)]++;
  }
  return frequencies.map((observed, i) => ({
    outcome: s.preset === "coin" ? ["Heads", "Tails"][i] : String(i + 1),
    observed,
    expected: s.trials / count,
  }));
}
