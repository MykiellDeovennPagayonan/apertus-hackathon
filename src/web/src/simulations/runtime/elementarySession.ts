import { create, type StateCreator } from "zustand";
import {
  RandomTrialSystem,
  RatioSystem,
  RectangleMetricsSystem,
} from "../components/systems/ElementarySystems";
import type {
  RandomTrialState,
  RatioState,
  RectangleDimensions,
} from "../components/traits/ElementaryBoards";
import {
  templateNames,
  templateParameters,
  validateCommand,
} from "./capabilities";
import { type ActionResult, accepted, rejected } from "./commands";
import { validateValue } from "./parameterSchema";
import type { UIAction } from "./types";
export type ElementaryDemo =
  | "ratio"
  | "area-perimeter"
  | "coordinates"
  | "probability";
export const isElementaryDemo = (demo: string): demo is ElementaryDemo =>
  ["ratio", "area-perimeter", "coordinates", "probability"].includes(demo);
export function elementaryOutputs(
  demo: ElementaryDemo,
  parameters: Record<string, unknown>,
) {
  if (demo === "ratio") return RatioSystem(parameters as unknown as RatioState);
  if (demo === "area-perimeter")
    return RectangleMetricsSystem(parameters as unknown as RectangleDimensions);
  if (demo === "probability")
    return {
      frequencies: RandomTrialSystem(parameters as unknown as RandomTrialState),
    };
  return { x: Number(parameters.x), y: Number(parameters.y) };
}
interface ElementarySession {
  demo: ElementaryDemo;
  id: string;
  parameters: Record<string, unknown>;
  initial: Record<string, unknown>;
  outputs: ReturnType<typeof elementaryOutputs>;
  activate: (
    demo: ElementaryDemo,
    id: string,
    parameters: Record<string, unknown>,
  ) => void;
  dispatch: (command: UIAction) => ActionResult;
}
export const elementaryInitializer: StateCreator<ElementarySession> = (
  set,
  get,
) => ({
  demo: "ratio",
  id: "ratio/board",
  parameters: { numerator: 3, denominator: 4 },
  initial: { numerator: 3, denominator: 4 },
  outputs: { ratio: 0.75, percentage: 75 },
  activate: (demo, id, parameters) =>
    set({
      demo,
      id,
      parameters: structuredClone(parameters),
      initial: structuredClone(parameters),
      outputs: elementaryOutputs(demo, parameters),
    }),
  dispatch: (command) => {
    const s = get();
    try {
      validateCommand(s.demo, command);
      const parameters =
        command.type === "RESET"
          ? structuredClone(s.initial)
          : command.type === "RUN_TRIALS"
            ? { ...s.parameters, trials: command.value }
            : {
                ...s.parameters,
                ...(command.value as Record<string, unknown>),
              };
      validateValue(
        templateParameters(`compositions/${templateNames[s.demo]}`),
        parameters,
        "parameters",
      );
      set({ parameters, outputs: elementaryOutputs(s.demo, parameters) });
      return accepted;
    } catch (error) {
      return rejected(
        error instanceof Error ? error.message : "Invalid parameters",
      );
    }
  },
});
export const useElementaryStore = create<ElementarySession>(
  elementaryInitializer,
);
