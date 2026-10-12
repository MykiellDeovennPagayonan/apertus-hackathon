import type { RuntimeProvider } from "../authoring/providers";
import { defaults, inputValues, manifestFor } from "./contract";

export const importedProvider: RuntimeProvider = {
  initialize(node) {
    return {
      source: node.configuration.source,
      settings: JSON.stringify(node.configuration.settings),
      generation: crypto.randomUUID(),
      time: 0,
      inputs: {
        ...defaults(manifestFor(String(node.configuration.source)).inputs),
        ...(node.configuration.inputs as object),
      },
      outputs: {},
      commands: [],
      error: "",
    };
  },
  reinitialize(state, node) {
    return state.source === node.configuration.source &&
      state.settings === JSON.stringify(node.configuration.settings)
      ? state
      : importedProvider.initialize(node);
  },
  synchronize(state, connected, node) {
    const values = Object.fromEntries(
      Object.entries(connected).map(([k, v]) => [k, v[0]]),
    );
    try {
      return {
        ...state,
        inputs: inputValues(
          manifestFor(String(node.configuration.source)),
          node.configuration.inputs as Record<string, unknown>,
          values,
        ),
        missing: "",
      };
    } catch (e) {
      return {
        ...state,
        outputs: {},
        missing: e instanceof Error ? e.message : "Input required",
      };
    }
  },
  apply(state, command, args) {
    if (state.error || state.missing)
      throw new Error(String(state.error || state.missing));
    const commands = [
      ...(state.commands as unknown[]),
      { id: crypto.randomUUID(), name: command, arguments: args },
    ];
    if (commands.length > 64)
      throw new Error("Imported component action queue is full");
    return { ...state, commands };
  },
  measure: (state) =>
    state.error || state.missing
      ? {}
      : (state.outputs as Record<string, unknown>),
  step: (state, delta) => ({ ...state, time: Number(state.time) + delta }),
};
