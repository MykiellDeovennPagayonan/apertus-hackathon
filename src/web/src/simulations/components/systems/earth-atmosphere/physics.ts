/** Pure teaching calculations. Drawing coordinates never enter these functions. */
export const gravity = 9.81;
export const sigma = 5.670374419e-8;
export const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
export function faultState(
  phase: number,
  progress: number,
  strength: number,
  fault: number,
) {
  const loading = phase === 0 ? 0 : phase === 1 ? 0.65 + progress * 0.35 : 1;
  const ruptured = phase >= 2;
  const slip = ruptured ? strength / 2 : 0;
  return {
    stress: ruptured ? strength * 0.25 : strength * loading,
    deformation: ruptured ? strength * 0.125 : (strength * loading) / 2,
    slip,
    releasedEnergy: ruptured ? strength ** 2 * 0.1875 : 0,
    ruptureFraction:
      phase < 2
        ? 0
        : phase === 2
          ? 0.2
          : phase === 3
            ? 0.6 + progress * 0.4
            : 1,
    slipVector: fault === 0 ? [slip, 0, 0] : [0, fault === 1 ? -slip : slip, 0],
    pArrival: 10 / 6,
    sArrival: 10 / 3.5,
  };
}
export const waveSpeed = (depth: number) => Math.sqrt(gravity * depth);
/** Offshore long-wave speed/amplitude only. Coastal inundation is prescribed, not solved. */
export function tsunamiState(
  depth: number,
  displacement: number,
  phase: number,
  progress: number,
) {
  const speed = waveSpeed(depth),
    shelfSpeed = waveSpeed(100);
  return {
    speed,
    shelfSpeed,
    offshoreAmplitude: displacement,
    shelfAmplitude: displacement * (depth / 100) ** 0.25,
    offshoreWavelength: speed * 600,
    shelfWavelength: shelfSpeed * 600,
    crest:
      phase < 2
        ? 0
        : phase === 2
          ? 0.2 + progress * 0.35
          : phase === 3
            ? 0.6 + progress * 0.2
            : 0.9,
    arrivals: displacement === 0 || phase < 4 ? 0 : phase === 4 ? 1 : 2,
  };
}
export const layerNames = [
  "Troposphere",
  "Stratosphere",
  "Mesosphere",
  "Thermosphere",
  "Exosphere",
];
export function atmosphereState(altitude: number, ozone: number) {
  const layer =
    altitude < 12
      ? 0
      : altitude < 50
        ? 1
        : altitude < 85
          ? 2
          : altitude < 600
            ? 3
            : 4;
  const temperature =
    altitude < 12
      ? 15 - 6.5 * altitude
      : altitude < 50
        ? -63 + 1.66 * (altitude - 12)
        : altitude < 85
          ? 0 - 2.5 * (altitude - 50)
          : -87.5 + Math.min(900, (altitude - 85) * 3);
  // Relative qualitative transmission, NOT a measured exposure or health-risk model.
  return {
    layer,
    layerName: layerNames[layer],
    temperature,
    density: Math.exp(-altitude / 8.5),
    ozoneConcentration: ozone * Math.exp(-(((altitude - 25) / 12) ** 2)),
    uvA: 0.9,
    uvB: Math.exp(-3 * ozone),
    uvC: 0.001,
  };
}
export interface EnergyState {
  surface: number;
  air: number;
  elapsed: number;
  residual: number;
}
export function energyFlux(
  s: EnergyState,
  absorption: number,
  albedo: number,
  solar: number,
) {
  const incoming = (solar * (1 - albedo)) / 4;
  const surfaceIR = sigma * s.surface ** 4,
    airIR = absorption * sigma * s.air ** 4;
  const outgoing = (1 - absorption) * surfaceIR + airIR;
  return {
    incoming,
    surfaceIR,
    airIR,
    outgoing,
    imbalance: incoming - outgoing,
  };
}
export function initializeEnergy(
  absorption: number,
  albedo: number,
  solar: number,
): EnergyState {
  const incoming = (solar * (1 - albedo)) / 4;
  const surface = (incoming / (sigma * (1 - absorption / 2))) ** 0.25;
  return { surface, air: surface / 2 ** 0.25, elapsed: 0, residual: 0 };
}
/** Two gray-body reservoirs; exact discrete budget checked at every substep. Model time is compressed. */
export function integrateEnergy(
  s: EnergyState,
  absorption: number,
  albedo: number,
  solar: number,
  seconds: number,
) {
  let n = { ...s };
  const surfaceCapacity = 1e6,
    airCapacity = 2e5;
  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(1000, remaining),
      f = energyFlux(n, absorption, albedo, solar);
    const ds = ((f.incoming + f.airIR - f.surfaceIR) * dt) / surfaceCapacity;
    const da = ((absorption * f.surfaceIR - 2 * f.airIR) * dt) / airCapacity;
    n = {
      surface: n.surface + ds,
      air: n.air + da,
      elapsed: n.elapsed + dt,
      residual:
        n.residual + ds * surfaceCapacity + da * airCapacity - f.imbalance * dt,
    };
    remaining -= dt;
  }
  return n;
}
/** Rainbow scattering: stationary ray through a sphere, one or two partial internal reflections. */
export function rainbowRay(index: number, reflections = 1) {
  const incidence = Math.acos(
    Math.sqrt((index ** 2 - 1) / ((reflections + 1) ** 2 - 1)),
  );
  const refraction = Math.asin(Math.sin(incidence) / index);
  const deviation =
    reflections * Math.PI + 2 * incidence - 2 * (reflections + 1) * refraction;
  const radius = (Math.abs(Math.PI - deviation) * 180) / Math.PI;
  return {
    index,
    incidence,
    refraction,
    deviation,
    radius,
    reflections,
    snellResidual: Math.sin(incidence) - index * Math.sin(refraction),
    totalInternalReflection: refraction > Math.asin(1 / index),
  };
}
export const wavelengths = [
  { color: "#bd493c", name: "Red", index: 1.331 },
  { color: "#d68b35", name: "Orange", index: 1.333 },
  { color: "#b5a12e", name: "Yellow", index: 1.335 },
  { color: "#4e855a", name: "Green", index: 1.337 },
  { color: "#467cb2", name: "Blue", index: 1.34 },
  { color: "#865aa0", name: "Violet", index: 1.343 },
];
export function rainbowState(
  elevation: number,
  observer: number,
  secondary: boolean,
) {
  const rays = wavelengths.map((w) => ({
    ...w,
    ...rainbowRay(w.index, secondary ? 2 : 1),
  }));
  return {
    rays,
    visible: elevation < rays[0].radius,
    arcHeight: Math.max(0, rays[0].radius - elevation),
    center: [observer, -Math.tan((elevation * Math.PI) / 180) * 12, -12],
    contributingDroplets: Array.from({ length: 18 }, (_, i) => ({
      x: observer + Math.cos((i / 17) * Math.PI) * 8,
      y:
        Math.sin((i / 17) * Math.PI) * 8 -
        Math.tan((elevation * Math.PI) / 180) * 12,
      z: -12,
    })).filter((p) => p.y > 0),
  };
}
export function lightningState(
  phase: number,
  progress: number,
  distance: number,
  intracloud: boolean,
) {
  const separated = phase >= 1,
    connected = phase >= 4;
  return {
    upperCharge: separated ? 12 : 0,
    lowerCharge: separated ? -12 : 0,
    netCloudCharge: 0,
    connected,
    leaderFraction: phase < 3 ? 0 : phase === 3 ? 0.25 + 0.75 * progress : 1,
    returnFraction: phase < 5 ? 0 : phase === 5 ? progress : 1,
    groundConnection: connected && !intracloud,
    thunderDelay: distance / 343,
  };
}
/** Parcel lapse rates in °C/km; simplified saturation and water accounting, not a forecast. */
export function weatherState(
  phase: number,
  moisture: number,
  scenario: number,
) {
  const initialT = 28,
    dewPoint = initialT - (100 - moisture) / 5;
  const cloudBase = Math.max(0, ((initialT - dewPoint) / (9.8 - 2)) * 1000);
  const height = phase < 2 ? 0 : Math.min(3500, (phase - 1) * 700);
  const temperature =
    initialT -
    (Math.min(height, cloudBase) / 1000) * 9.8 -
    (Math.max(0, height - cloudBase) / 1000) * 6;
  const condensate =
    (Math.max(0, (height - cloudBase) / 3500) * moisture) / 100;
  const rain = phase >= 6 ? condensate * 0.5 : 0;
  return {
    height,
    temperature,
    cloudBase,
    saturated: height >= cloudBase && height > 0,
    vapor: moisture / 100 - condensate,
    cloudWater: condensate - rain,
    rain,
    waterTotal: moisture / 100,
    scenario,
  };
}
