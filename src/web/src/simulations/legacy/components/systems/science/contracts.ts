export type ScienceKind =
  | "cell"
  | "immune"
  | "genome"
  | "pollination"
  | "invasive"
  | "earth"
  | "plates"
  | "volcano"
  | "water";
export interface Setting {
  key: string;
  label: string;
  initial: number;
  min: number;
  max: number;
  help: string;
  options?: readonly string[];
  advanced?: boolean;
  restart?: boolean;
}
export interface ScienceSpec {
  kind: ScienceKind;
  name: string;
  slug: string;
  title: string;
  question: string;
  invitation: string;
  step: string;
  unit: string;
  limit: number;
  settings: readonly Setting[];
  assumptions: readonly string[];
}
export interface Offspring {
  id: number;
  alleles: number[];
  sources: string[];
  mutation: boolean;
}
export interface ImmuneData {
  burden: number;
  antibodies: number;
  memory: number[];
  exposure: number;
  firstPeak: number;
  firstClearance: number;
  challengeMemory: boolean;
  clearance: number;
}
export interface PollenData {
  loads: number[];
  origins: number[];
  visits: number[];
  transfers: number[];
  fertilized: number[];
  fruits: number[];
}
export interface InvasiveData {
  origin: number;
  cover: number[];
  native: number[];
  propagules: number[];
  sources: number[];
  treated: number[];
  effort: number;
}
export interface VolcanoData {
  reservoir: number;
  supplied: number;
  lava: number;
  ash: number;
  activity: number;
}
export interface WaterData {
  tracer: number;
  trace: number[];
  atmosphere: number;
  surface: number;
  soil: number;
  ground: number;
  river: number;
  input: number;
  output: number;
  runoff: number;
  infiltration: number;
  evaporation: number;
  discharge: number;
}
export interface Baseline {
  snapshot?: ScienceState;
  time: number;
  settings: Record<string, number>;
  seed: number;
  metrics: string[];
  caption: string;
}
export interface ScienceState {
  kind: ScienceKind;
  time: number;
  playing: boolean;
  speed: number;
  selected: number;
  overlay: boolean;
  fraction: number;
  seed: number;
  settings: Record<string, number>;
  events: string[];
  baseline?: Baseline;
  immune?: ImmuneData;
  pollen?: PollenData;
  invasive?: InvasiveData;
  volcano?: VolcanoData;
  water?: WaterData;
  offspring?: Offspring[];
}
export interface ScienceObject {
  name: string;
  state: string;
  why: string;
}
export interface ScienceObservation {
  stage: string;
  metrics: string[];
  explanation: string;
  objects: ScienceObject[];
}
export const clamp = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));
export const randomAt = (seed: number, time: number, slot: number) => {
  let x = (seed + time * 374761393 + slot * 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
export const event = (s: ScienceState, text: string): ScienceState => ({
  ...s,
  events: [...s.events.slice(-5), `${s.time} · ${text}`],
});
