import { create, type StateCreator } from "zustand";
import { BridgeExperiment } from "../components/compositions/BridgeExperiment";
import { buildTruss } from "../components/prefabs/TrussAssembly";
import { HeuristicBridgeResponseSystem } from "../components/systems/HeuristicBridgeResponseSystem";
import {
  type ActionResult,
  accepted,
  rejected,
  type SimulationCommand,
  validNumber,
} from "./commands";

const defaults = BridgeExperiment.defaults;
const initialTruss = () => buildTruss(defaults.spanScale, defaults.dense);
interface BridgeState {
  initial: typeof defaults;
  activate: (
    parameters: typeof defaults,
    truss: ReturnType<typeof buildTruss>,
  ) => void;
  spanScale: number;
  dense: boolean;
  loadPos: number;
  loadTons: number;
  removedMember: string | null;
  selectedMember: string | null;
  buildNonce: number;
  truss: ReturnType<typeof buildTruss>;
  response: ReturnType<typeof HeuristicBridgeResponseSystem>;
  dispatch: (c: SimulationCommand) => ActionResult;
  reset: () => void;
}
const response = (
  s: Pick<
    BridgeState,
    "truss" | "loadPos" | "loadTons" | "removedMember" | "dense" | "spanScale"
  >,
) =>
  HeuristicBridgeResponseSystem(
    s.truss,
    s.loadPos,
    s.loadTons,
    s.removedMember,
    s.dense,
    s.spanScale,
  );
export const bridgeInitializer: StateCreator<BridgeState> = (set, get) => ({
  ...defaults,
  initial: { ...defaults },
  activate: (parameters, truss) =>
    set({
      ...parameters,
      initial: structuredClone(parameters),
      truss,
      response: response({ ...parameters, truss }),
      buildNonce: get().buildNonce + 1,
    }),
  truss: initialTruss(),
  response: response({ ...defaults, truss: initialTruss() }),
  reset: () => {
    const s = get(),
      truss = buildTruss(
        s.initial.spanScale,
        s.initial.dense,
        s.truss.id,
        s.initial.loadPos,
        s.initial.loadTons,
      );
    set({
      ...s.initial,
      truss,
      response: response({ ...s.initial, truss }),
      buildNonce: s.buildNonce + 1,
    });
  },
  dispatch: (c) => {
    const s = get(),
      patch: Partial<BridgeState> = {};
    let topology = false;
    switch (c.type) {
      case "MOVE_LOAD":
        if (!validNumber(c.value, 0.05, 0.95))
          return rejected("Load position must be 0.05–0.95");
        patch.loadPos = c.value;
        break;
      case "SET_LOAD":
        if (!validNumber(c.value, 2, 30))
          return rejected("Load must be 2–30 t");
        patch.loadTons = c.value;
        break;
      case "DOUBLE_LENGTH":
        patch.spanScale = 2;
        topology = true;
        break;
      case "NORMAL_LENGTH":
        patch.spanScale = 1;
        topology = true;
        break;
      case "MORE_TRIANGLES":
        patch.dense = true;
        topology = true;
        break;
      case "REMOVE_MIDDLE":
        patch.removedMember =
          s.removedMember ??
          `${s.truss.id}/diag${Math.floor(s.truss.panels / 2)}`;
        patch.selectedMember = null;
        patch.truss = {
          ...s.truss,
          members: s.truss.members.map((m) => ({
            ...m,
            present: m.id !== patch.removedMember,
          })),
        };
        break;
      case "SELECT_MEMBER":
        if (
          c.value !== null &&
          (typeof c.value !== "string" ||
            !s.response.members.some((m) => m.id === c.value))
        )
          return rejected("Unknown or absent member");
        set({ selectedMember: c.value as string | null });
        return accepted;
      case "REBUILD":
      case "RESET":
        s.reset();
        return accepted;
      default:
        return rejected(`Unsupported bridge command: ${c.type}`);
    }
    if (topology) {
      patch.truss = buildTruss(
        patch.spanScale ?? s.spanScale,
        patch.dense ?? s.dense,
      );
      patch.selectedMember = null;
      patch.removedMember = s.removedMember
        ? `${patch.truss.id}/diag${Math.floor(patch.truss.panels / 2)}`
        : null;
      if (patch.removedMember)
        patch.truss = {
          ...patch.truss,
          members: patch.truss.members.map((m) => ({
            ...m,
            present: m.id !== patch.removedMember,
          })),
        };
      patch.buildNonce = s.buildNonce + 1;
    }
    const next = { ...s, ...patch };
    next.truss = {
      ...next.truss,
      load: {
        ...next.truss.load,
        position: next.loadPos,
        magnitude: next.loadTons,
      },
    };
    patch.truss = next.truss;
    set({ ...patch, response: response(next) });
    return accepted;
  },
});
export const useBridgeStore = create<BridgeState>(bridgeInitializer);
