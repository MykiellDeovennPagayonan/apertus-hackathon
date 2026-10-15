import { gasParticles } from "../systems/GasParticleIllustrationSystem";
import { IdealGasSystem } from "../systems/IdealGasSystem";
import type { GasState } from "../traits/GasState";
export function GasSample(id: string, containerId: string, inputs: GasState) {
  return {
    id,
    containerId,
    inputs: structuredClone(inputs),
    metrics: IdealGasSystem(inputs),
  };
}
export function GasContainer(id: string, inputs: GasState) {
  return {
    id,
    sample: GasSample(`${id}/sample`, id, inputs),
    particles: gasParticles(inputs.amount),
  };
}
