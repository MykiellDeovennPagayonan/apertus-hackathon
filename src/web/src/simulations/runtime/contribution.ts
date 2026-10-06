import type { Selections } from "./definition";
import type { ParameterSchema } from "./parameterSchema";

/** Frozen domain boundary: exports are data/providers; imports never register globals. */
export interface DomainModel {
  ref: string;
  version: 1;
  name: string;
  description: string;
  assumptions: readonly string[];
  parameters: ParameterSchema;
  defaults: Record<string, unknown>;
  outputs: Record<string, { unit: string; description: string }>;
  actions: Record<
    string,
    {
      arguments: ParameterSchema;
      description: string;
      timing: "live" | "relaunch" | "rebuild";
      target: "instance";
    }
  >;
  dependencies: Selections;
  /** Adapter ID must have a concrete registered client implementation before advertisement. */
  presentation: string;
  requiredObservations: readonly string[];
  maximumInstances: number;
  graphOutput?: string;
  /** Educational structure defaults, still selected and configured by the models. */
  creationDefaults?: {
    structure: "single" | "comparison";
    objects: readonly { label: string; parameters: Record<string, unknown> }[];
    explanation: string;
  };
  /** Domain-owned mapping; equation steps retain original configuration. */
  configuration?(state: Record<string, unknown>): Record<string, unknown>;
  initialize(parameters: Record<string, unknown>): Record<string, unknown>;
  apply(
    state: Record<string, unknown>,
    action: string,
    value?: unknown,
  ): Record<string, unknown>;
  measure(state: Record<string, unknown>): Record<string, unknown>;
  /** Optional dynamics run only on the existing authoritative runtime clock. */
  step?(state: Record<string, unknown>, delta: number): Record<string, unknown>;
}
export interface DomainContribution {
  namespace: string;
  version: 1;
  models: readonly DomainModel[];
  validateInstances?(instances: readonly ModelInstance[]): void;
}
export interface Assembly {
  version: 1;
  title: string;
  learningGoal: string;
  instances: {
    id: string;
    label: string;
    prefab: { ref: string; version: 1 };
    parameters: Record<string, unknown>;
  }[];
  observations: {
    id: string;
    instance: string;
    output: string;
    unit: string;
  }[];
  /** Only implemented output → observation links; no executable links. */
  connections: {
    type: "observation-source";
    from: { instance: string; output: string };
    to: string;
  }[];
  controls: { instance: string; action: string }[];
  views: {
    ref: "views/AssemblyScene" | "views/AssemblyTable" | "views/AssemblyGraph";
    observations: string[];
  }[];
}
export interface ModelInstance {
  id: string;
  label: string;
  provider: string;
  parameters: Record<string, unknown>;
  state: Record<string, unknown>;
  outputs: Record<string, unknown>;
}
