import { create, type StateCreator } from "zustand";
import {
  compileAssembly,
  instantiateModel,
  measureModel,
  modelProvider,
} from "./assembly";
import type { ActionResult } from "../../creation-and-editing/runtime-engine/commands";
import type { Assembly, ModelInstance } from "../../registry/contracts/domainContribution";
import { validateValue } from "../../registry/contracts/parameterSchema";
import type { UIAction } from "./types";
export interface AssemblyState {
  resetCount: number;
  assembly: Assembly | null;
  instances: ModelInstance[];
  initial: ModelInstance[];
  activate(assembly: Assembly): void;
  dispatch(command: UIAction): ActionResult;
  step(delta: number): void;
}
export const assemblyInitializer: StateCreator<AssemblyState> = (set, get) => ({
  resetCount: 0,
  assembly: null,
  instances: [],
  initial: [],
  activate: (assembly) => {
    const { instances } = compileAssembly(assembly);
    set({
      resetCount: 0,
      assembly: structuredClone(assembly),
      instances,
      initial: structuredClone(instances),
    });
  },
  dispatch: (c) => {
    try {
      if (c.type === "RESET") {
        if (c.target && c.target !== "session")
          throw new Error("Reset requires session target");
        set({
          instances: structuredClone(get().initial),
          resetCount: get().resetCount + 1,
        });
        return { accepted: true };
      }
      const target =
        c.target ??
        (get().instances.length === 1 ? get().instances[0].id : undefined);
      const current = get().instances.find((i) => i.id === target);
      if (!current)
        throw new Error("Choose an existing uniquely identified object");
      const model = modelProvider(current.provider),
        op = model.actions[c.type];
      if (
        !op ||
        !get().assembly?.controls.some(
          (b) => b.instance === target && b.action === c.type,
        )
      )
        throw new Error("Operation is not bound to this object");
      validateValue(
        op.arguments,
        c.value === undefined ? {} : { value: c.value },
        c.type,
      );
      const nextState = model.apply(
        structuredClone(current.state),
        c.type,
        c.value,
      );
      const outputs = measureModel(model, nextState);
      let parameters = current.parameters;
      // Configuration models expose their accepted editable fields as state.
      if (model.configuration) {
        parameters = model.configuration(nextState);
        instantiateModel(
          current.id,
          current.label,
          current.provider,
          parameters,
        );
      }
      set({
        instances: get().instances.map((i) =>
          i.id === target ? { ...i, parameters, state: nextState, outputs } : i,
        ),
      });
      return { accepted: true };
    } catch (e) {
      return {
        accepted: false,
        error: e instanceof Error ? e.message : "Invalid assembly command",
      };
    }
  },
  step: (delta) => {
    if (!(delta > 0) || !Number.isFinite(delta)) return;
    set({
      instances: get().instances.map((i) => {
        const model = modelProvider(i.provider);
        if (!model.step) return i;
        const state = model.step(structuredClone(i.state), delta);
        return { ...i, state, outputs: measureModel(model, state) };
      }),
    });
  },
});
export const useAssemblyStore = create(assemblyInitializer);
