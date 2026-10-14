/** Bounded single-point pressure signals; time is seconds and phase is degrees. */
export interface SignalParameters {
  amplitude: number;
  frequency: number;
  phase: number;
  duration: number;
}
export interface SignalSample {
  x: number;
  y: number;
}
export function sampleSignal(p: SignalParameters): SignalSample[] {
  if (
    ![p.amplitude, p.frequency, p.phase, p.duration].every(Number.isFinite) ||
    p.amplitude < 0 ||
    p.amplitude > 2 ||
    p.frequency < 20 ||
    p.frequency > 500 ||
    p.phase < 0 ||
    p.phase > 360 ||
    p.duration < 0.004 ||
    p.duration > 0.02
  )
    throw new Error("Signal parameters outside supported bounds");
  return Array.from({ length: 257 }, (_, i) => {
    const x = (p.duration * i) / 256;
    return {
      x,
      y:
        p.amplitude *
        Math.sin(2 * Math.PI * p.frequency * x + (p.phase * Math.PI) / 180),
    };
  });
}
export function sumSignals(first: SignalSample[], second: SignalSample[]) {
  if (first.length !== second.length || first.length < 2 || first.length > 512)
    throw new Error(
      "Superposition requires two bounded signals on the same time grid",
    );
  const points = first.map((a, i) => {
    const b = second[i];
    if (
      ![a.x, a.y, b.x, b.y].every(Number.isFinite) ||
      Math.abs(a.x - b.x) > 1e-12
    )
      throw new Error(
        "Superposition signals must have matching finite sample times",
      );
    const y = a.y + b.y;
    if (!Number.isFinite(y))
      throw new Error("Superposition exceeds finite pressure bounds");
    return { x: a.x, first: a.y, second: b.y, y };
  });
  const residualPeak = Math.max(...points.map((p) => Math.abs(p.y)));
  return {
    points,
    residualPeak,
    // Scale before squaring so finite pressure data cannot overflow the RMS.
    residualRms:
      residualPeak === 0
        ? 0
        : residualPeak *
          Math.sqrt(
            points.reduce((sum, p) => sum + (p.y / residualPeak) ** 2, 0) /
              points.length,
          ),
  };
}
