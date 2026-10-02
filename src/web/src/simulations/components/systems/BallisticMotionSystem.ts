// Physics helpers — deterministic equations, no engine.
export const rad = (deg: number) => (deg * Math.PI) / 180;

export function flightTime(v: number, angle: number, g: number) {
  return (2 * v * Math.sin(rad(angle))) / g;
}

export function range(v: number, angle: number, g: number) {
  return (v * v * Math.sin(2 * rad(angle))) / g;
}

export function maxHeight(v: number, angle: number, g: number) {
  const vy = v * Math.sin(rad(angle));
  return (vy * vy) / (2 * g);
}

export function posAt(v: number, angle: number, g: number, t: number) {
  return {
    x: v * Math.cos(rad(angle)) * t,
    y: v * Math.sin(rad(angle)) * t - 0.5 * g * t * t,
  };
}

export function velocityAt(v: number, angle: number, g: number, t: number) {
  return { x: v * Math.cos(rad(angle)), y: v * Math.sin(rad(angle)) - g * t };
}
export function sampleTrajectory(
  v: number,
  angle: number,
  g: number,
  count = 60,
) {
  const duration = flightTime(v, angle, g);
  return Array.from({ length: count + 1 }, (_, i) =>
    posAt(v, angle, g, (duration * i) / count),
  );
}
export function sampleRange(v: number, g: number) {
  return Array.from({ length: 46 }, (_, i) => ({
    x: i * 2,
    y: range(v, i * 2, g),
  }));
}
export function BallisticMotionSystem(
  settings: import("../traits/LaunchSettings").LaunchSettings,
  gravity: number,
  elapsed: number,
) {
  const duration = flightTime(settings.velocity, settings.angle, gravity),
    t = Math.min(elapsed, duration);
  const p = posAt(settings.velocity, settings.angle, gravity, t);
  return {
    transform: {
      position: {
        x: settings.origin.x + p.x,
        y: settings.origin.y + Math.max(0, p.y),
      },
      heading: 0,
    },
    motion: {
      elapsed: t,
      velocity: velocityAt(settings.velocity, settings.angle, gravity, t),
      status: t >= duration ? ("landed" as const) : ("flying" as const),
    },
    metrics: {
      range: range(settings.velocity, settings.angle, gravity),
      maxHeight: maxHeight(settings.velocity, settings.angle, gravity),
      duration,
    },
  };
}
