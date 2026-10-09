import type {
  CircuitState,
  CircuitWire,
  PendulumState,
  TimedState,
  TrackState,
} from "../../traits/physical-systems/state";

function bounded(value: number, min: number, max: number, name: string) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name} must be ${min}–${max}`);
}
export function validatePendulum(s: PendulumState) {
  bounded(s.length, 0.1, 20, "Length (m)");
  bounded(s.gravity, 0.1, 30, "Gravity (m/s²)");
  bounded(s.amplitude, 0, 10, "Small-angle amplitude (degrees)");
  bounded(s.elapsed, 0, 86400, "Simulation time (s)");
  if (typeof s.playing !== "boolean") throw new Error("Invalid playback state");
}
export function validateTrack(s: TrackState) {
  bounded(s.height, 0.01, 5, "Ramp height (m)");
  bounded(s.resistance, 0, 1, "Effective rolling resistance");
  bounded(s.gravity, 0.1, 30, "Gravity (m/s²)");
  bounded(s.elapsed, 0, 86400, "Simulation time (s)");
  if (typeof s.playing !== "boolean") throw new Error("Invalid playback state");
}
/** Only the runtime supplies delta. No integration or frame-dependent approximations. */
export function advance<T extends TimedState>(s: T, delta: number): T {
  if (!Number.isFinite(delta) || delta < 0)
    throw new Error("Invalid clock delta");
  if (!s.playing) return { ...s };
  const elapsed = Math.min(86400, s.elapsed + delta);
  return { ...s, elapsed, playing: elapsed < 86400 };
}
export function playback<T extends TimedState>(
  s: T,
  action: string,
  value?: unknown,
): T {
  if (action === "PHYS_PLAY") {
    if (typeof value !== "boolean") throw new Error("Play requires a boolean");
    return { ...s, playing: value };
  }
  if (action === "PHYS_RESTART") return { ...s, elapsed: 0 };
  if (action === "PHYS_STEP") {
    if (s.playing) throw new Error("Pause before stepping");
    return { ...s, elapsed: Math.min(86400, s.elapsed + 0.1) };
  }
  throw new Error(`Unsupported physical action ${action}`);
}
export function pendulumMeasure(s: PendulumState) {
  validatePendulum(s);
  const omega = Math.sqrt(s.gravity / s.length);
  const period = (2 * Math.PI) / omega;
  const angle = s.amplitude * Math.cos(omega * s.elapsed);
  const radians = (angle * Math.PI) / 180;
  return {
    period,
    angle,
    elapsed: s.elapsed,
    cycles: Math.floor(s.elapsed / period),
    lastPeriod: s.elapsed >= period ? period : null,
    x: s.length * Math.sin(radians),
    y: -s.length * Math.cos(radians),
    points: Array.from({ length: 25 }, (_, index) => {
      const x = (index * Math.min(12, 2 * period)) / 24;
      return { x, y: s.amplitude * Math.cos(omega * x) };
    }),
  };
}
export function pendulumApply(
  s: PendulumState,
  action: string,
  value?: unknown,
): PendulumState {
  const fields: Record<string, "length" | "gravity" | "amplitude"> = {
    PEND_SET_LENGTH: "length",
    PEND_SET_GRAVITY: "gravity",
    PEND_SET_AMPLITUDE: "amplitude",
  };
  const next = fields[action]
    ? { ...s, [fields[action]]: value, elapsed: 0 }
    : playback(s, action, value);
  validatePendulum(next);
  return next;
}
export function trackMeasure(s: TrackState) {
  validateTrack(s);
  const entrySpeed = Math.sqrt(2 * s.gravity * s.height);
  const deceleration = s.resistance * s.gravity;
  const stopTime = deceleration > 0 ? entrySpeed / deceleration : null;
  const time = stopTime === null ? s.elapsed : Math.min(s.elapsed, stopTime);
  const distance = entrySpeed * time - (deceleration * time * time) / 2;
  const speed = Math.max(0, entrySpeed - deceleration * time);
  const stoppingDistance = s.resistance > 0 ? s.height / s.resistance : null;
  return {
    entrySpeed,
    deceleration,
    stopTime,
    stoppingDistance,
    distance,
    speed,
    elapsed: s.elapsed,
    stopped: stopTime !== null && s.elapsed >= stopTime,
    points: Array.from({ length: 25 }, (_, index) => ({
      x: (distance * index) / 24,
      y: 0,
    })),
  };
}
export function trackApply(
  s: TrackState,
  action: string,
  value?: unknown,
): TrackState {
  if (action === "ROLL_SCALE_RESISTANCE") {
    if (typeof value !== "number")
      throw new Error("Resistance factor must be numeric");
    bounded(value, 0, 10, "Resistance factor");
    const next = { ...s, resistance: s.resistance * value, elapsed: 0 };
    validateTrack(next);
    return next;
  }
  const fields: Record<string, "height" | "resistance" | "gravity"> = {
    ROLL_SET_HEIGHT: "height",
    ROLL_SET_RESISTANCE: "resistance",
    ROLL_SET_GRAVITY: "gravity",
  };
  const next = fields[action]
    ? { ...s, [fields[action]]: value, elapsed: 0 }
    : playback(s, action, value);
  validateTrack(next);
  return next;
}
export function validateCircuit(s: CircuitState) {
  bounded(s.voltage, 0, 24, "Voltage (V)");
  bounded(s.resistance, 0.1, 1000, "Bulb resistance (Ω)");
  bounded(s.bulbs, 1, 8, "Bulb count");
  if (!Number.isInteger(s.bulbs))
    throw new Error("Bulb count must be an integer");
  if (s.topology !== "series" && s.topology !== "parallel")
    throw new Error("Only series and parallel circuits are supported");
}
/** Trusted finite topology expansion: no arbitrary network solver or inferred wires. */
export function circuitWires(s: CircuitState): CircuitWire[] {
  validateCircuit(s);
  const positive = { component: "source", port: "positive" as const };
  const negative = { component: "source", port: "negative" as const };
  const bulb = (index: number, port: "a" | "b") => ({
    component: `bulb/${index}`,
    port,
  });
  const wire = (
    from: CircuitWire["from"],
    to: CircuitWire["to"],
  ): CircuitWire => ({ type: "electrical-wire", from, to });
  if (s.topology === "parallel")
    return Array.from({ length: s.bulbs }, (_, index) => [
      wire(positive, bulb(index + 1, "a")),
      wire(bulb(index + 1, "b"), negative),
    ]).flat();
  return [
    wire(positive, bulb(1, "a")),
    ...Array.from({ length: s.bulbs - 1 }, (_, index) =>
      wire(bulb(index + 1, "b"), bulb(index + 2, "a")),
    ),
    wire(bulb(s.bulbs, "b"), negative),
  ];
}
export function circuitMeasure(s: CircuitState) {
  validateCircuit(s);
  const equivalentResistance =
    s.topology === "series" ? s.resistance * s.bulbs : s.resistance / s.bulbs;
  const totalCurrent = s.voltage / equivalentResistance;
  const bulbVoltage = s.topology === "series" ? s.voltage / s.bulbs : s.voltage;
  const bulbCurrent = bulbVoltage / s.resistance;
  const bulbPower = bulbVoltage * bulbCurrent;
  return {
    totalCurrent,
    equivalentResistance,
    bulbVoltage,
    bulbCurrent,
    bulbPower,
    totalPower: s.voltage * totalCurrent,
    bulbReadings: Array.from({ length: s.bulbs }, (_, index) => ({
      id: `bulb/${index + 1}`,
      voltage: bulbVoltage,
      current: bulbCurrent,
      power: bulbPower,
    })),
  };
}
export function circuitApply(
  s: CircuitState,
  action: string,
  value?: unknown,
): CircuitState {
  let next: CircuitState;
  switch (action) {
    case "CIRC_ADD_BULB":
      next = { ...s, bulbs: s.bulbs + 1 };
      break;
    case "CIRC_SET_BULBS":
      next = { ...s, bulbs: value as number };
      break;
    case "CIRC_SET_TOPOLOGY":
      next = { ...s, topology: value as CircuitState["topology"] };
      break;
    case "CIRC_SET_VOLTAGE":
      next = { ...s, voltage: value as number };
      break;
    case "CIRC_SET_RESISTANCE":
      next = { ...s, resistance: value as number };
      break;
    default:
      throw new Error("Unsupported circuit operation");
  }
  validateCircuit(next);
  return next;
}
