import type { Budget, Flux } from "./transfers";
export type CycleKind = "oxygen" | "nitrogen" | "carbon";
export interface CycleRun extends Budget {
  time: number;
  trace: string;
  history: string[];
  fluxes: Flux[];
  event: string;
  injected: boolean;
}
export interface CycleState extends CycleRun {
  kind: CycleKind;
  activity: string;
  variant: number;
  seed: number;
  baseline?: CycleRun;
  biological?: CycleState;
}
export interface Activity {
  id: string;
  title: string;
  question: string;
  variants?: readonly string[];
  comparison?: boolean;
}
export const activities: Record<CycleKind, readonly Activity[]> = {
  oxygen: [
    {
      id: "day-night",
      title: "Day and night",
      question: "Why can pond oxygen fall at night?",
    },
    {
      id: "light",
      title: "Daylight and darkness",
      question: "What changes when the same pond receives no light?",
      comparison: true,
    },
    {
      id: "plants",
      title: "More aquatic plants",
      question: "Do more plants always mean more oxygen?",
      comparison: true,
    },
    {
      id: "leaves",
      title: "Dead leaves",
      question: "How can dead leaves affect oxygen in a pond?",
    },
    {
      id: "temperature",
      title: "Cooler and warmer water",
      question: "How does warmer water change oxygen exchange?",
      comparison: true,
    },
    {
      id: "mixing",
      title: "Still and mixed water",
      question: "How does water movement affect oxygen exchange?",
      comparison: true,
    },
    {
      id: "atoms",
      title: "Follow an oxygen atom",
      question: "Where does oxygen go when an organism uses it?",
    },
  ],
  nitrogen: [
    {
      id: "route",
      title: "Follow nitrogen",
      question: "How does nitrogen in the air become available to a plant?",
    },
    {
      id: "partners",
      title: "Microbial partners",
      question: "What changes when the same plant has microbial partners?",
      comparison: true,
    },
    {
      id: "fertilizer",
      title: "Fertilizer and growth",
      question: "Can adding more nitrogen keep a plant growing forever?",
      variants: ["Small input", "Larger input"],
      comparison: true,
    },
    {
      id: "rain",
      title: "Rain and nitrogen loss",
      question: "Where does nitrogen go after rain?",
      variants: ["Untreated soil", "Nitrogen-fixing crop", "Fertilized soil"],
      comparison: true,
    },
    {
      id: "soil",
      title: "Aerated and waterlogged soil",
      question: "How does soil oxygen change microbial pathways?",
      comparison: true,
    },
  ],
  carbon: [
    {
      id: "route",
      title: "Follow carbon",
      question: "Where can carbon go after a plant takes it from the air?",
    },
    {
      id: "clearing",
      title: "Clearing and regrowth",
      question: "Where does carbon go when a forest is cleared?",
      variants: ["Keep harvested wood", "Burn part of the cleared material"],
      comparison: true,
    },
    {
      id: "fuel",
      title: "Fossil fuel combustion",
      question: "Where does carbon go when fossil fuel burns?",
    },
    {
      id: "geology",
      title: "Geological time",
      question: "How can carbon remain stored for very long periods?",
    },
    {
      id: "ocean",
      title: "Ocean storage and exchange",
      question: "Does a large carbon store always absorb carbon quickly?",
    },
  ],
};
export const cycleNames = {
  oxygen: "Oxygen cycle",
  nitrogen: "Nitrogen cycle",
  carbon: "Carbon cycle",
};
export const cycleCommand = (kind: CycleKind, action: string) =>
  `CYCLE_${kind.toUpperCase()}_${action}`;
export function activityFor(s: Pick<CycleState, "kind" | "activity">) {
  const a = activities[s.kind].find((a) => a.id === s.activity);
  if (!a) throw new Error("Unsupported cycle activity");
  return a;
}
export function run(
  stores: Record<string, number>,
  weights: Record<string, number>,
  trace: string,
): CycleRun {
  return {
    stores,
    weights,
    trace,
    initialTotal: Object.entries(stores).reduce(
      (n, [k, v]) => n + v * weights[k],
      0,
    ),
    inputs: 0,
    exports: 0,
    time: 0,
    history: [trace],
    fluxes: [],
    event: "",
    injected: false,
  };
}
/** Representative tracer follows accepted positive fluxes; zero movement is a valid outcome. */
export function traceNext(
  previous: CycleRun,
  next: CycleRun,
  destinations: readonly string[],
) {
  const preferred =
    destinations[(previous.history.length - 1) % destinations.length];
  const candidates = next.fluxes.filter(
    (f) => previous.trace in f.from && f.amount > 0,
  );
  const chosen = candidates.find((f) => preferred in f.to) ?? candidates[0];
  if (!chosen) return next;
  const destination =
    preferred in chosen.to ? preferred : Object.keys(chosen.to)[0];
  return {
    ...next,
    trace: destination,
    history: [...previous.history.slice(-11), destination],
  };
}
