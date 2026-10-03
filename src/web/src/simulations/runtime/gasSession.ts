import { create, type StateCreator } from "zustand";
import { GasContainer } from "../components/prefabs/GasContainer";
import { learningPolicies } from "../components/resources/LearningPolicies";
import {
  GasParticleIllustrationSystem,
  gasParticles,
} from "../components/systems/GasParticleIllustrationSystem";
import { IdealGasSystem } from "../components/systems/IdealGasSystem";
import type {
  GasMetrics,
  GasParticle,
  GasState,
} from "../components/traits/GasState";
import { validateCommand } from "./capabilities";
import { type ActionResult, accepted, rejected } from "./commands";
import type { UIAction } from "./types";

interface GasSession {
  id: string;
  inputs: GasState;
  initial: GasState;
  metrics: GasMetrics;
  particles: GasParticle[];
  activate: (id: string, inputs: GasState) => void;
  dispatch: (command: UIAction) => ActionResult;
  step: (delta: number) => void;
}
export const gasInitializer: StateCreator<GasSession> = (set, get) => ({
  id: "gas/container",
  inputs: { ...learningPolicies.gas },
  initial: { ...learningPolicies.gas },
  metrics: IdealGasSystem(learningPolicies.gas),
  particles: gasParticles(1),
  activate: (id, inputs) => {
    const staged = GasContainer(id, inputs);
    set({
      id,
      inputs: staged.sample.inputs,
      initial: structuredClone(inputs),
      metrics: staged.sample.metrics,
      particles: staged.particles,
    });
  },
  dispatch: (command) => {
    try {
      validateCommand("gas", command);
      const s = get();
      const inputs =
        command.type === "RESET" ? structuredClone(s.initial) : { ...s.inputs };
      const inputKeys: Partial<Record<string, keyof GasState>> = {
        SET_VOLUME: "volume",
        SET_TEMPERATURE: "temperature",
        SET_AMOUNT: "amount",
        SET_PLAYING: "playing",
      };
      const key = inputKeys[command.type];
      if (key) Object.assign(inputs, { [key]: command.value });
      const metrics = IdealGasSystem(inputs);
      set({
        inputs,
        metrics,
        particles:
          command.type === "RESET" || inputs.amount !== s.inputs.amount
            ? gasParticles(inputs.amount)
            : s.particles,
      });
      return accepted;
    } catch (error) {
      return rejected(
        error instanceof Error ? error.message : "Invalid gas input",
      );
    }
  },
  step: (delta) => {
    const s = get(),
      particles = GasParticleIllustrationSystem(s.particles, s.inputs, delta);
    if (particles !== s.particles) set({ particles });
  },
});
export const useGasStore = create<GasSession>(gasInitializer);
