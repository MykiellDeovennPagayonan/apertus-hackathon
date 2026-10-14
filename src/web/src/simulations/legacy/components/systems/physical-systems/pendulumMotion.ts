const samples = 2048;
const trajectories = new Map<
  number,
  { times: Float64Array; quarter: number }
>();

/** Nonlinear ideal pendulum, released at rest. Integrate the elliptic time
 * coordinate once, then invert it at an absolute runtime time. NIST DLMF 22.19.
 * This is independent of frame rate and never accumulates integration drift. */
function trajectory(amplitude: number) {
  const cached = trajectories.get(amplitude);
  if (cached) return cached;
  const k = Math.sin((amplitude * Math.PI) / 360);
  const step = Math.PI / (2 * samples);
  const integrand = (phi: number) =>
    1 / Math.sqrt(1 - (k * Math.cos(phi)) ** 2);
  const times = new Float64Array(samples + 1);
  for (let i = 1; i <= samples; i++) {
    const start = (i - 1) * step;
    times[i] =
      times[i - 1] +
      (step / 6) *
        (integrand(start) +
          4 * integrand(start + step / 2) +
          integrand(start + step));
  }
  const result = { times, quarter: times[samples] };
  if (trajectories.size >= 32)
    trajectories.delete(trajectories.keys().next().value ?? 0);
  trajectories.set(amplitude, result);
  return result;
}

export function pendulumPeriod(
  length: number,
  gravity: number,
  amplitude: number,
) {
  return 4 * trajectory(amplitude).quarter * Math.sqrt(length / gravity);
}

export function pendulumAngle(
  amplitude: number,
  elapsed: number,
  period: number,
) {
  if (amplitude === 0) return 0;
  const { times, quarter } = trajectory(amplitude);
  const phase = ((((elapsed % period) + period) % period) / period) * 4;
  const quadrant = Math.floor(phase);
  const fraction = phase - quadrant;
  const target = (quadrant % 2 ? 1 - fraction : fraction) * quarter;
  let low = 0,
    high = samples;
  while (high - low > 1) {
    const middle = (low + high) >>> 1;
    if (times[middle] < target) low = middle;
    else high = middle;
  }
  const index = low + (target - times[low]) / (times[high] - times[low]);
  const phi = (index * Math.PI) / (2 * samples);
  const angle =
    (2 *
      Math.asin(Math.sin((amplitude * Math.PI) / 360) * Math.cos(phi)) *
      180) /
    Math.PI;
  return quadrant === 1 || quadrant === 2 ? -angle : angle;
}
