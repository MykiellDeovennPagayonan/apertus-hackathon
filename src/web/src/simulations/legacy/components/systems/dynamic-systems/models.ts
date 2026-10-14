import type {
  DynamicState,
  GrowthState,
  QueueCustomer,
  QueueState,
  TrafficState,
  TrafficVehicle,
} from "../../traits/dynamic-systems/state";

function finite(value: unknown, min: number, max: number, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${label}: expected a finite value from ${min} to ${max}`);
  return value;
}
function integer(value: unknown, min: number, max: number, label: string) {
  const result = finite(value, min, max, label);
  if (!Number.isInteger(result))
    throw new Error(`${label}: expected an integer`);
  return result;
}

export function growthInitial(p: DynamicState): GrowthState {
  return {
    principal: finite(p.principal, 0.01, 1_000_000, "Starting balance"),
    annualRate: finite(p.annualRate, 0, 1, "Annual rate"),
    years: integer(p.years, 0, 25, "Whole annual periods"),
  };
}
export function growthApply(
  state: DynamicState,
  action: string,
  value?: unknown,
): GrowthState {
  const current = growthInitial(state);
  if (action === "GROW_SET_PRINCIPAL")
    return growthInitial({ ...current, principal: value });
  if (action === "GROW_SET_RATE")
    return growthInitial({ ...current, annualRate: value });
  if (action === "GROW_SET_YEARS")
    return growthInitial({ ...current, years: value });
  if (action === "GROW_SET_SCENARIO") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Growth scenario requires annualRate and years");
    const scenario = value as Record<string, unknown>;
    return growthInitial({
      ...current,
      annualRate: scenario.annualRate,
      years: scenario.years,
    });
  }
  throw new Error("Unsupported compound-growth operation");
}
export function growthMeasure(state: DynamicState): DynamicState {
  const p = growthInitial(state);
  const compoundPoints = Array.from({ length: p.years + 1 }, (_, year) => ({
    x: year,
    y: p.principal * (1 + p.annualRate) ** year,
  }));
  const simplePoints = compoundPoints.map(({ x }) => ({
    x,
    y: p.principal * (1 + p.annualRate * x),
  }));
  return {
    principal: p.principal,
    annualRate: p.annualRate,
    years: p.years,
    compoundTotal: compoundPoints.at(-1)?.y ?? p.principal,
    simpleTotal: simplePoints.at(-1)?.y ?? p.principal,
    compoundInterest: (compoundPoints.at(-1)?.y ?? p.principal) - p.principal,
    simpleInterest: (simplePoints.at(-1)?.y ?? p.principal) - p.principal,
    compoundPoints,
    simplePoints,
  };
}

function seededUnit(seed: number, index: number) {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
}
export function trafficInitial(p: DynamicState): TrafficState {
  const vehicleCount = integer(p.vehicleCount, 6, 28, "Vehicle count");
  const roadLength = finite(p.roadLength, 100, 1000, "Road length (m)");
  const desiredSpeed = finite(p.desiredSpeed, 2, 40, "Desired speed (m/s)");
  const desiredHeadway = finite(
    p.desiredHeadway,
    0.5,
    3,
    "Desired headway (s)",
  );
  const minimumGap = finite(p.minimumGap, 1, 10, "Minimum gap (m)");
  const maximumAcceleration = finite(
    p.maximumAcceleration,
    0.2,
    5,
    "Maximum acceleration (m/s²)",
  );
  const comfortableBraking = finite(
    p.comfortableBraking,
    0.5,
    6,
    "Comfortable braking (m/s²)",
  );
  const seed = integer(p.seed, 1, 2_147_483_647, "Traffic seed");
  if (roadLength / vehicleCount <= minimumGap + 4)
    throw new Error(
      "Road is too crowded for the supported collision-free setup",
    );
  const spacing = roadLength / vehicleCount;
  const vehicles = Array.from({ length: vehicleCount }, (_, id) => ({
    id,
    position: id * spacing,
    speed: desiredSpeed * (0.84 + 0.06 * seededUnit(seed, id)),
  }));
  return {
    vehicleCount,
    roadLength,
    desiredSpeed,
    desiredHeadway,
    minimumGap,
    maximumAcceleration,
    comfortableBraking,
    seed,
    playing: Boolean(p.playing),
    elapsed: 0,
    disturbanceRemaining: 0,
    vehicles,
    speedHistory: [{ x: 0, y: averageSpeed(vehicles) }],
  };
}
function trafficConfiguration(state: DynamicState) {
  const s = state as TrafficState;
  return {
    vehicleCount: s.vehicleCount,
    roadLength: s.roadLength,
    desiredSpeed: s.desiredSpeed,
    desiredHeadway: s.desiredHeadway,
    minimumGap: s.minimumGap,
    maximumAcceleration: s.maximumAcceleration,
    comfortableBraking: s.comfortableBraking,
    seed: s.seed,
    playing: s.playing,
  };
}
export { trafficConfiguration };
function averageSpeed(vehicles: readonly TrafficVehicle[]) {
  return (
    vehicles.reduce((sum, vehicle) => sum + vehicle.speed, 0) / vehicles.length
  );
}
export function trafficApply(
  state: DynamicState,
  action: string,
  value?: unknown,
): TrafficState {
  const s = state as TrafficState;
  if (action === "TRAFFIC_SET_PLAYING") {
    if (typeof value !== "boolean")
      throw new Error("Playing must be a boolean");
    return { ...s, playing: value };
  }
  if (action === "TRAFFIC_BRAKE")
    return { ...s, disturbanceRemaining: 2.5, playing: true };
  if (action === "TRAFFIC_SET_HEADWAY") {
    const desiredHeadway = finite(value, 0.5, 3, "Desired headway (s)");
    return { ...s, desiredHeadway };
  }
  if (action === "TRAFFIC_RESTART")
    return trafficInitial(trafficConfiguration(s));
  if (action === "TRAFFIC_STEP") {
    if (s.playing) throw new Error("Pause traffic before stepping");
    return advanceTraffic({ ...s, playing: true }, 0.25, true);
  }
  throw new Error("Unsupported traffic operation");
}
function advanceTraffic(
  source: TrafficState,
  delta: number,
  forceOneStep = false,
): TrafficState {
  if (!Number.isFinite(delta) || delta < 0) throw new Error("Invalid timestep");
  if (!source.playing && !forceOneStep) return source;
  const s = { ...source, vehicles: source.vehicles.map((v) => ({ ...v })) };
  let remaining = Math.min(delta, 5);
  while (remaining > 1e-12) {
    const dt = Math.min(0.05, remaining);
    const accelerations = s.vehicles.map((vehicle, index) => {
      const leader = s.vehicles[(index + 1) % s.vehicles.length];
      const rawGap =
        ((leader.position - vehicle.position + s.roadLength) % s.roadLength) -
        4;
      const gap = Math.max(0.1, rawGap);
      const closingSpeed = vehicle.speed - leader.speed;
      const desiredGap =
        s.minimumGap +
        Math.max(
          0,
          vehicle.speed * s.desiredHeadway +
            (vehicle.speed * closingSpeed) /
              (2 * Math.sqrt(s.maximumAcceleration * s.comfortableBraking)),
        );
      let acceleration =
        s.maximumAcceleration *
        (1 - (vehicle.speed / s.desiredSpeed) ** 4 - (desiredGap / gap) ** 2);
      if (index === 0 && s.disturbanceRemaining > 0)
        acceleration = Math.min(acceleration, -3.5);
      return Math.max(-8, Math.min(s.maximumAcceleration, acceleration));
    });
    const speeds = s.vehicles.map((v, i) =>
      Math.max(0, v.speed + accelerations[i] * dt),
    );
    const positions = s.vehicles.map(
      (v, i) => (v.position + ((v.speed + speeds[i]) / 2) * dt) % s.roadLength,
    );
    // The ordered ring identity is preserved. Clamp followers before overlap.
    for (let i = s.vehicles.length - 1; i >= 0; i--) {
      const leaderIndex = (i + 1) % s.vehicles.length;
      const gap =
        ((positions[leaderIndex] - positions[i] + s.roadLength) %
          s.roadLength) -
        4;
      if (gap < 0.05) speeds[i] = Math.min(speeds[i], speeds[leaderIndex]);
    }
    s.vehicles = s.vehicles.map((v, i) => ({
      id: v.id,
      position: positions[i],
      speed: speeds[i],
    }));
    s.elapsed += dt;
    s.disturbanceRemaining = Math.max(0, s.disturbanceRemaining - dt);
    remaining -= dt;
  }
  const history = [
    ...s.speedHistory,
    { x: s.elapsed, y: averageSpeed(s.vehicles) },
  ];
  s.speedHistory = history.slice(-24);
  return forceOneStep ? { ...s, playing: false } : s;
}
export function trafficStep(state: DynamicState, delta: number): DynamicState {
  return advanceTraffic(state as TrafficState, delta);
}
export function trafficMeasure(state: DynamicState): DynamicState {
  const s = state as TrafficState;
  const gaps = s.vehicles.map((vehicle, index) => {
    const leader = s.vehicles[(index + 1) % s.vehicles.length];
    return (
      ((leader.position - vehicle.position + s.roadLength) % s.roadLength) - 4
    );
  });
  const speeds = s.vehicles.map((v) => v.speed);
  return {
    elapsed: s.elapsed,
    playing: s.playing,
    vehicleCount: s.vehicles.length,
    averageSpeed: averageSpeed(s.vehicles),
    minimumSpeed: Math.min(...speeds),
    slowVehicles: speeds.filter((speed) => speed < s.desiredSpeed * 0.5).length,
    minimumGap: Math.min(...gaps),
    desiredHeadway: s.desiredHeadway,
    density: (s.vehicles.length / s.roadLength) * 1000,
    disturbanceActive: s.disturbanceRemaining > 0,
    vehicles: s.vehicles.map((v) => ({ ...v })),
    points: s.speedHistory.map((point) => ({ ...point })),
  };
}

function exponential(rate: number, unit: number) {
  return -Math.log(Math.max(1e-12, 1 - unit)) / rate;
}
export function generateQueueCustomers(
  arrivalRate: number,
  serviceRate: number,
  duration: number,
  seed: number,
): QueueCustomer[] {
  const customers: QueueCustomer[] = [];
  let arrival = exponential(arrivalRate, seededUnit(seed, 0));
  for (let id = 0; arrival <= duration && id < 200; id++) {
    customers.push({
      id,
      arrival,
      service: exponential(serviceRate, seededUnit(seed + 7919, id)),
    });
    arrival += exponential(arrivalRate, seededUnit(seed, id + 1));
  }
  return customers;
}
export type QueueResult = {
  rows: {
    id: number;
    arrival: number;
    service: number;
    start: number;
    finish: number;
    wait: number;
    cashier: number;
  }[];
  completed: number;
  waiting: number;
  inService: number;
  averageWait: number;
  maximumQueue: number;
};
/** Trusted FIFO event scheduler. Equal-time arrivals retain customer ID order. */
export function simulateQueue(
  customers: readonly QueueCustomer[],
  cashiers: number,
  horizon: number,
): QueueResult {
  if (!Number.isInteger(cashiers) || cashiers < 1 || cashiers > 2)
    throw new Error("Cashiers must be one or two");
  const available = Array.from({ length: cashiers }, () => 0);
  const rows = customers.map((customer) => {
    let cashier = 0;
    for (let i = 1; i < available.length; i++)
      if (available[i] < available[cashier]) cashier = i;
    const start = Math.max(customer.arrival, available[cashier]);
    const finish = start + customer.service;
    available[cashier] = finish;
    return {
      ...customer,
      start,
      finish,
      wait: start - customer.arrival,
      cashier,
    };
  });
  const completed = rows.filter((row) => row.finish <= horizon).length;
  const inService = rows.filter(
    (row) => row.start <= horizon && row.finish > horizon,
  ).length;
  const waiting = rows.filter((row) => row.start > horizon).length;
  let maximumQueue = 0;
  for (const row of rows) {
    const queued = rows.filter(
      (candidate) =>
        candidate.arrival <= row.arrival && candidate.start > row.arrival,
    ).length;
    maximumQueue = Math.max(maximumQueue, queued);
  }
  return {
    rows,
    completed,
    waiting,
    inService,
    averageWait: rows.length
      ? rows.reduce((sum, row) => sum + row.wait, 0) / rows.length
      : 0,
    maximumQueue,
  };
}
export function queueInitial(p: DynamicState): QueueState {
  const arrivalRate = finite(p.arrivalRate, 0.05, 2, "Arrival rate (/min)");
  const serviceRate = finite(p.serviceRate, 0.1, 3, "Service rate (/min)");
  const duration = finite(p.duration, 5, 240, "Horizon (min)");
  const cashiers = integer(p.cashiers, 1, 2, "Cashiers");
  const seed = integer(p.seed, 1, 2_147_483_647, "Queue seed");
  return {
    arrivalRate,
    serviceRate,
    duration,
    cashiers,
    seed,
    customers: generateQueueCustomers(arrivalRate, serviceRate, duration, seed),
  };
}
export function queueApply(
  state: DynamicState,
  action: string,
  value?: unknown,
): QueueState {
  const s = state as QueueState;
  if (action === "QUEUE_SET_CASHIERS")
    return { ...s, cashiers: integer(value, 1, 2, "Cashiers") };
  if (action === "QUEUE_SET_ARRIVAL_RATE")
    return queueInitial({ ...s, arrivalRate: value });
  if (action === "QUEUE_SET_SERVICE_RATE")
    return queueInitial({ ...s, serviceRate: value });
  throw new Error("Unsupported queue operation");
}
export function queueMeasure(state: DynamicState): DynamicState {
  const s = state as QueueState;
  const result = simulateQueue(s.customers, s.cashiers, s.duration);
  return {
    arrivals: s.customers.length,
    completed: result.completed,
    waiting: result.waiting,
    inService: result.inService,
    averageWait: result.averageWait,
    maximumQueue: result.maximumQueue,
    cashiers: s.cashiers,
    duration: s.duration,
    arrivalRate: s.arrivalRate,
    serviceRate: s.serviceRate,
    seed: s.seed,
    customers: result.rows.slice(0, 24),
    points: result.rows
      .slice(0, 24)
      .map((row) => ({ x: row.arrival, y: row.wait })),
  };
}
