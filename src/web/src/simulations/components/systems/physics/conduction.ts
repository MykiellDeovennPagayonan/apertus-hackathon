import {
  choice,
  num,
  object,
  validateValue,
} from "../../../runtime/parameterSchema";
export const conductionParameters = object({
  conductivity: num(0.1, 400, "W/(m·K)"),
  density: num(100, 10000, "kg/m³"),
  capacity: num(100, 5000, "J/(kg·K)"),
  length: num(0.05, 0.5, "m"),
  area: num(0.00001, 0.001, "m²"),
  initial: num(0, 100, "°C"),
  bath: num(0, 100, "°C"),
  time: num(0, 7200, "s"),
  boundary: choice("bath", "insulated"),
});
export const conductionDefaults = {
  conductivity: 100,
  density: 8000,
  capacity: 500,
  length: 0.2,
  area: 0.0001,
  initial: 20,
  bath: 80,
  time: 0,
  boundary: "bath",
};
export function conductionState(p: Record<string, unknown>) {
  const s = { ...conductionDefaults, ...p };
  validateValue(conductionParameters, s);
  if (
    (s.time * s.conductivity) /
      (s.density * s.capacity) /
      (0.2 * (s.length / 32) ** 2) >
    200000
  )
    throw new Error("Transient conduction exceeds supported work budget");
  return s;
}
// Cell-centred finite volumes; explicit fluxes, Fourier number <= 0.2 including half-cell bath boundary.
export function conductionProfile(
  s: ReturnType<typeof conductionState>,
  cells = 32,
  initial?: readonly number[],
) {
  validateValue(num(8, 128, "cells", true), cells);
  if (
    initial &&
    (initial.length !== cells ||
      initial.some((v) => !Number.isFinite(v) || v < 0 || v > 100))
  )
    throw new Error("Invalid initial temperature field");
  let temperatures = initial
    ? [...initial]
    : (Array(cells).fill(s.initial) as number[]);
  const alpha = s.conductivity / (s.density * s.capacity),
    dx = s.length / cells;
  const steps = Math.max(1, Math.ceil((s.time * alpha) / (0.2 * dx * dx)));
  if (steps > 200000)
    throw new Error(
      "Transient conduction exceeds supported work budget; use a longer rod, shorter time or lower diffusivity",
    );
  const r = (s.time * alpha) / (steps * dx * dx);
  for (let step = 0; step < steps; step++) {
    temperatures = temperatures.map(
      (t, i) =>
        t +
        r *
          ((i === 0
            ? s.boundary === "bath"
              ? 2 * (s.bath - t)
              : 0
            : temperatures[i - 1] - t) +
            (i === cells - 1 ? 0 : temperatures[i + 1] - t)),
    );
  }
  return temperatures;
}
export function conductionMeasure(s: ReturnType<typeof conductionState>) {
  const temperatures = conductionProfile(s),
    mean = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
  return {
    // Runtime output arrays are limited to 30 entries; retain all 32 cells.
    temperatures: {
      firstHalf: temperatures.slice(0, 16),
      secondHalf: temperatures.slice(16),
    },
    diffusivity: s.conductivity / (s.density * s.capacity),
    handle: temperatures[temperatures.length - 1],
    mean,
    energyChange:
      s.density * s.capacity * s.area * s.length * (mean - s.initial),
    heatInput:
      s.boundary === "bath"
        ? (s.conductivity * s.area * 2 * (s.bath - temperatures[0])) /
          (s.length / temperatures.length)
        : 0,
  };
}
