import { create, type StateCreator } from "zustand";
import { TownExperiment } from "../components/compositions/TownExperiment";
import type { Building } from "../components/prefabs/Building";
import { Market } from "../components/prefabs/Market";
import type { Citizen } from "../components/traits/Resident";
import {
  type ActionResult,
  accepted,
  rejected,
  type SimulationCommand,
  validNumber,
} from "./commands";
import { evaluateTown, initialTown, stepTown } from "./townModel";

const _defaults = TownExperiment.defaults;
interface TownState {
  initial: ReturnType<typeof initialTown>;
  activate: (state: ReturnType<typeof initialTown>) => void;
  time: number;
  playing: boolean;
  speed: number;
  roadClosed: boolean;
  marketBusy: boolean;
  marketNearSchool: boolean;
  citizens: Citizen[];
  buildings: ReturnType<typeof Building>[];
  market: ReturnType<typeof Market>;
  reset: () => void;
  dispatch: (c: SimulationCommand) => ActionResult;
  step: (delta: number) => void;
}
export const townInitializer: StateCreator<TownState> = (set, get) => ({
  ...initialTown(),
  initial: initialTown(),
  activate: (state) => {
    const candidate = structuredClone(state);
    evaluateTown(candidate, true);
    set({ ...candidate, initial: structuredClone(candidate) });
  },
  reset: () => set(structuredClone(get().initial)),
  step: (delta) => {
    const s = get();
    if (!s.playing || !validNumber(delta, 0, 60)) return;
    const next = stepTown(s, delta);
    set({ time: next.time, citizens: next.citizens });
  },
  dispatch: (c) => {
    const s = get(),
      patch: Partial<TownState> = {};
    let invalidated = false;
    switch (c.type) {
      case "SET_TIME":
        if (!validNumber(c.value, 0, 24))
          return rejected("Time must be 0–24 hours");
        patch.time = c.value % 24;
        break;
      case "SET_SPEED":
        if (![1, 2, 4].includes(Number(c.value)) || typeof c.value !== "number")
          return rejected("Speed must be 1×, 2× or 4×");
        patch.speed = c.value;
        patch.playing = true;
        break;
      case "SET_PLAYING":
        if (typeof c.value !== "boolean") return rejected("Expected boolean");
        patch.playing = c.value;
        break;
      case "CLOSE_ROAD":
        patch.roadClosed = true;
        invalidated = true;
        break;
      case "OPEN_ROAD":
        patch.roadClosed = false;
        invalidated = true;
        break;
      case "MOVE_MARKET":
        patch.marketNearSchool = true;
        patch.market = Market(s.market.id, true);
        invalidated = true;
        break;
      case "MARKET_BUSY":
        patch.marketBusy = true;
        break;
      case "RESET":
        s.reset();
        return accepted;
      default:
        return rejected(`Unsupported town command: ${c.type}`);
    }
    const next = { ...s, ...patch, citizens: structuredClone(s.citizens) };
    evaluateTown(next, invalidated);
    set({ ...patch, citizens: next.citizens });
    return accepted;
  },
});
export const useTownStore = create<TownState>(townInitializer);
