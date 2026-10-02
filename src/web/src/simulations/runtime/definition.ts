import type { DemoType } from "./types";
export type ComponentKind =
  | "resources"
  | "traits"
  | "behaviors"
  | "systems"
  | "visuals"
  | "views"
  | "controls"
  | "prefabs"
  | "compositions";
export type Selections = Record<ComponentKind, readonly string[]>;
export interface CompositionDefinition {
  defaults: Record<string, unknown>;
  layout: "scene-and-graph" | "scene-and-inspector" | "scene-and-controls";
  viewSettings: Record<string, number | number[]>;
  measurements: string[];
  id: string;
  demo: DemoType;
  version: 1;
  plane: "xy" | "xz";
  units: string;
  rendering: "svg" | "three";
  components: Selections;
  systems: readonly string[];
  instances: readonly {
    id: string;
    prefab: string;
    parameters: Record<string, unknown>;
  }[];
  actions: readonly string[];
  assumptions: readonly string[];
}
export function immutable<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) immutable(child);
  }
  return value;
}

export interface FieldContract {
  unit: string;
  role: "configuration" | "state" | "output";
  writer: string;
  timing: "construction" | "live" | "model-step" | "relaunch" | "rebuild";
  range?: readonly [number, number];
  default?: number | string | boolean;
}
