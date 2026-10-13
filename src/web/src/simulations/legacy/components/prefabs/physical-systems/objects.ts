import { physicalDefaults } from "../../resources/physical-systems/defaults";
import {
  validateCircuit,
  validatePendulum,
  validateTrack,
} from "../../systems/physical-systems/models";
import type {
  CircuitState,
  PendulumParameters,
  PendulumState,
  TrackParameters,
  TrackState,
} from "../../traits/physical-systems/state";

export function createPendulum(parameters: PendulumParameters): PendulumState {
  const state = { ...physicalDefaults.pendulum, ...parameters, elapsed: 0 };
  validatePendulum(state);
  return state;
}
export function createTrack(parameters: TrackParameters): TrackState {
  const state = { ...physicalDefaults.track, ...parameters, elapsed: 0 };
  validateTrack(state);
  return state;
}
export function createCircuit(parameters: CircuitState): CircuitState {
  const state = { ...physicalDefaults.circuit, ...parameters };
  validateCircuit(state);
  return state;
}
