import { fractionAction } from "../../../legacy/components/systems/ComposedFractionSystem";
import {
  RandomTrialSystem,
  RatioSystem,
  RectangleMetricsSystem,
} from "../../../legacy/components/systems/ElementarySystems";
import type {
  RandomTrialState,
  RatioState,
  RectangleDimensions,
} from "../../../legacy/components/traits/ElementaryBoards";
import type { MathBoard } from "../../../legacy/components/traits/MathBoards";
import type { SceneObject } from "../../../legacy/components/traits/SceneObjects";
import { assemblyModels, measureModel } from "../../../legacy/runtime/assembly";
import {
  mathDemos,
  stageMathBoard,
  stepMathBoard,
  updateMathBoard,
} from "../../../legacy/runtime/mathModel";
import { publicDefinition } from "../../../registry/index";
import {
  componentDefinitions,
  propertyValue,
  setProperty,
} from "../../../registry/objects/registry";
import { learningConfiguration } from "../../../registry/recipes/learningConfiguration";
import type { ComponentInstance } from "../../authoring-engine/document";
import { assertData } from "../../validator/document";
import { agentProviders } from "../agents/providers";
import { IMPORTED_HTML } from "../imported/contract";
import { importedProvider } from "../imported/provider";
import { dataProviders } from "./data";
import { explorationProviders } from "./exploration";
import { type RuntimeInputs, spatialProviders } from "./spatial";
export type RuntimeProvider = {
  reinitialize?(
    state: Record<string, unknown>,
    node: ComponentInstance,
  ): Record<string, unknown>;
  initialize(node: ComponentInstance): Record<string, unknown>;
  apply(
    state: Record<string, unknown>,
    command: string,
    args: Record<string, unknown>,
    node: ComponentInstance,
  ): Record<string, unknown>;
  measure(
    state: Record<string, unknown>,
    node: ComponentInstance,
  ): Record<string, unknown>;
  step?(state: Record<string, unknown>, delta: number): Record<string, unknown>;
  synchronize?(
    state: Record<string, unknown>,
    inputs: RuntimeInputs,
    node: ComponentInstance,
  ): Record<string, unknown>;
  capture?(state: Record<string, unknown>): Record<string, unknown>;
};
export const runtimeProviders = new Map<string, RuntimeProvider>([
  ...agentProviders,
  ...spatialProviders,
  ...dataProviders,
  ...explorationProviders,
]);
for (const m of assemblyModels)
  runtimeProviders.set(m.ref, {
    initialize: (n) =>
      m.initialize({
        ...structuredClone(m.defaults),
        ...structuredClone(n.configuration),
      }),
    reinitialize: m.reconfigure
      ? (s, n) =>
          m.reconfigure?.(s, {
            ...structuredClone(m.defaults),
            ...structuredClone(n.configuration),
          }) ?? m.initialize(n.configuration)
      : undefined,
    apply: (s, command, args) => m.apply(s, command, args.value),
    measure: (s, n) => ({
      ...measureModel(m, s),
      configuration: m.configuration ? m.configuration(s) : n.configuration,
    }),
    step: m.step,
    capture: m.configuration,
  });
for (const m of Object.values(componentDefinitions))
  runtimeProviders.set(m.id, {
    initialize: (n) => ({ ...structuredClone(n.configuration), id: n.id }),
    apply: (s, command, args) => {
      const o = s as unknown as SceneObject;
      if (command === "togglePiece" && o.kind === "fraction-bar") {
        if (!o.interactive)
          throw new Error("Direct shading is disabled for this lesson");
        fractionAction(o, "TOGGLE_FRACTION_PIECE", {
          bar: 0,
          piece: args.index,
        });
      } else if (command.startsWith("set:"))
        setProperty(o, command.slice(4), args.value as number | boolean);
      else {
        if (!m.applyAction)
          throw new Error(`${command}: unavailable operation`);
        (m.applyAction as (o: SceneObject, c: string, a: unknown) => void)(
          o,
          command,
          args,
        );
      }
      return s;
    },
    measure: (s) => ({
      data: s,
      ...Object.fromEntries(
        Object.keys(m.outputContracts).map((key) => [
          key,
          (
            m.observe as (
              o: SceneObject,
              key: string,
              ctx: import("../../../registry/contracts/objects/Observation").ObservationContext,
            ) => unknown
          )(s as unknown as SceneObject, key, {
            objects: [s as unknown as SceneObject],
            other: "",
            people: [],
            time: 0,
          }),
        ]),
      ),
    }),
    capture: (s) => {
      const { id: _id, ...configuration } = s;
      return configuration;
    },
  });
for (const demo of mathDemos)
  runtimeProviders.set(`models/${demo}`, {
    initialize: (n) =>
      stageMathBoard(demo, n.id, n.configuration) as unknown as Record<
        string,
        unknown
      >,
    apply: (s, command, args) => {
      const result = updateMathBoard(s as unknown as MathBoard, {
        type: command,
        value: args.value,
      });
      if (!result.result.accepted) throw new Error(result.result.error);
      return result.board as unknown as Record<string, unknown>;
    },
    measure: (s) => ({
      board: s,
      feedback: s.feedback,
      playing: (s.sequence as { playing: boolean }).playing,
    }),
    step: (s, delta) =>
      stepMathBoard(s as unknown as MathBoard, delta) as unknown as Record<
        string,
        unknown
      >,
    capture: (s) => learningConfiguration(s as unknown as MathBoard),
  });
for (const demo of ["ratio", "area-perimeter", "coordinates", "probability"])
  runtimeProviders.set(`models/${demo}`, {
    initialize: (n) => structuredClone(n.configuration),
    apply: (s, command, args) => {
      const next =
        command === "RUN_TRIALS"
          ? { ...s, trials: args.value }
          : { ...s, ...(args.value as Record<string, unknown>) };
      return next;
    },
    measure: (s) =>
      demo === "ratio"
        ? RatioSystem(s as unknown as RatioState)
        : demo === "area-perimeter"
          ? RectangleMetricsSystem(s as unknown as RectangleDimensions)
          : demo === "probability"
            ? {
                frequencies: RandomTrialSystem(
                  s as unknown as RandomTrialState,
                ),
              }
            : { x: s.x, y: s.y },
    capture: (s) => s,
  });
runtimeProviders.set("resources/Dataset", {
  initialize: (n) => {
    const rows: unknown = JSON.parse(String(n.configuration.rows));
    assertData(rows);
    if (!Array.isArray(rows) || rows.length > 512)
      throw new Error(`${n.id}: expected a bounded dataset`);
    const keys = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row))
        throw new Error(`${n.id}: rows must be records`);
      const key = String(row[String(n.configuration.key)] ?? "");
      if (!key || keys.has(key))
        throw new Error(`${n.id}: dataset rows need unique stable keys`);
      keys.add(key);
    }
    return { rows };
  },
  apply: () => {
    throw new Error("Datasets are read-only runtime resources");
  },
  measure: (s) => s,
});
for (const id of [
  "operations/LineIntersection",
  "operations/FractionComparison",
])
  runtimeProviders.set(id, {
    initialize: () => ({}),
    apply: () => {
      throw new Error("Pure operations are read-only");
    },
    measure: () => ({}),
  });
export function runtimeProvider(node: ComponentInstance) {
  if (node.definition === IMPORTED_HTML) return importedProvider;
  const id = publicDefinition(node).runtimeProvider;
  if (!id) return undefined;
  const provider = runtimeProviders.get(id);
  if (!provider) throw new Error(`${node.id}: missing runtime provider ${id}`);
  return provider;
}
export function readRuntimeProperty(
  _node: ComponentInstance,
  state: Record<string, unknown>,
  property: string,
) {
  return propertyValue(state as unknown as SceneObject, property);
}
