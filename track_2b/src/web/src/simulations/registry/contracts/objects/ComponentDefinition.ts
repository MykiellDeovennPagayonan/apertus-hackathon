import type { ParameterSchema } from "../parameterSchema";
import type { ObjectKind, SceneObject } from "../../../legacy/components/traits/SceneObjects";
import type { ObservationContext, ObservationValue } from "./Observation";
import type { OutputSpec } from "./OutputContract";
import type { Property } from "./PropertyContract";
export interface ComponentDefinition<K extends ObjectKind = ObjectKind> {
  id: string;
  kind: K;
  label: string;
  description: string;
  space: "cartesian" | "town" | "physical" | "diagram";
  schema: ParameterSchema;
  properties: Record<string, Property>;
  outputContracts: Record<string, OutputSpec>;
  observe: (
    object: Extract<SceneObject, { kind: K }>,
    output: string,
    context: ObservationContext,
  ) => ObservationValue;
  readProperty?: (
    object: Extract<SceneObject, { kind: K }>,
    key: string,
  ) => number | boolean;
  writeProperty?: (
    object: Extract<SceneObject, { kind: K }>,
    key: string,
    value: number | boolean,
  ) => void;
  actions?: Record<string, import("./ActionContract").ActionSpec>;
  applyAction?: (
    object: Extract<SceneObject, { kind: K }>,
    key: string,
    args: unknown,
  ) => void;
  create: (id: string) => Extract<SceneObject, { kind: K }>;
  /** Fields excluded from the authored configuration reset key. */
  presentation: readonly string[];
  /** Fields whose accepted experimental values survive presentation edits. */
  state: readonly string[];
  visual: string;
  view: string;
}
