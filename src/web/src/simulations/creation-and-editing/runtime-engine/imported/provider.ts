import type { RuntimeProvider } from "../providers";
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
      authoredInputs: JSON.stringify(node.configuration.inputs),
      manual: {},
      outputs: {},
      commands: [],
      error: "",
    };
  },
  reinitialize(state, node) {
    if (
      state.source !== node.configuration.source ||
      state.settings !== JSON.stringify(node.configuration.settings)
    )
      return importedProvider.initialize(node);
    const authoredInputs = JSON.stringify(node.configuration.inputs);
    return state.authoredInputs === authoredInputs
      ? state
      : { ...state, authoredInputs, manual: {} };
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
          {
            ...(node.configuration.inputs as Record<string, unknown>),
            ...(state.manual as object),
          },
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
    if (command.startsWith("set:")) {
      const name = command.slice(4);
      const manifest = manifestFor(String(state.source));
      if (!Object.hasOwn(manifest.inputs, name))
        throw new Error("Unknown component input");
      const manual = { ...(state.manual as object), [name]: args.value };
      inputValues(manifest, { ...(state.inputs as object), ...manual });
      return {
        ...state,
        manual,
        inputs: { ...(state.inputs as object), ...manual },
      };
    }
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
