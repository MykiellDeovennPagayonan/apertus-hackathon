import { boolean, num, object } from "../../../registry/contracts/parameterSchema";
export const gasInputSchema = object({
  amount: num(0.1, 5, "mmol"),
  temperature: num(100, 600, "K"),
  volume: num(0.25, 2, "L"),
  playing: boolean,
});
export interface GasState {
  amount: number;
  temperature: number;
  volume: number;
  playing: boolean;
}
export interface GasMetrics {
  pressurePa: number;
  pressureKPa: number;
}
export interface GasParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  contact: number;
}
