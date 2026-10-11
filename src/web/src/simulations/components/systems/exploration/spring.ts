export interface SpringParameters {
  mass: number;
  stiffness: number;
  damping: number;
  amplitude: number;
}
export interface SpringState extends SpringParameters {
  displacement: number;
  velocity: number;
  playing: boolean;
}

/** Exact propagation of m*x'' + c*x' + k*x = 0, including critical/overdamping. */
export function stepSpring(state: SpringState, delta: number): SpringState {
  if (!Number.isFinite(delta) || delta < 0 || delta > 1)
    throw new Error("Spring time step must be between 0 and 1 second");
  if (!state.playing || delta === 0) return { ...state };
  const { mass, stiffness, damping, displacement: x, velocity: v } = state;
  const alpha = damping / (2 * mass);
  const omegaSquared = stiffness / mass;
  const discriminant = omegaSquared - alpha * alpha;
  const decay = Math.exp(-alpha * delta);
  let position: number;
  let velocity: number;
  if (Math.abs(discriminant) < 1e-10 * Math.max(1, omegaSquared)) {
    const b = v + alpha * x;
    position = decay * (x + b * delta);
    velocity = decay * (v - alpha * b * delta);
  } else if (discriminant > 0) {
    const omega = Math.sqrt(discriminant);
    const cos = Math.cos(omega * delta),
      sin = Math.sin(omega * delta);
    position = decay * (x * cos + ((v + alpha * x) / omega) * sin);
    velocity =
      decay * (v * cos - ((alpha * v + omegaSquared * x) / omega) * sin);
  } else {
    const beta = Math.sqrt(-discriminant);
    const r1 = -alpha + beta,
      r2 = -alpha - beta;
    const a = (v - r2 * x) / (r1 - r2),
      b = x - a;
    position = a * Math.exp(r1 * delta) + b * Math.exp(r2 * delta);
    velocity = a * r1 * Math.exp(r1 * delta) + b * r2 * Math.exp(r2 * delta);
  }
  return { ...state, displacement: position, velocity };
}

export function springFrequency(parameters: SpringParameters) {
  return Math.sqrt(parameters.stiffness / parameters.mass) / (2 * Math.PI);
}
