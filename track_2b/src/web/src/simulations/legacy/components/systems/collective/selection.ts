import { random, sample } from "./random";
export interface Organism {
  id: number;
  parent: number;
  generation: number;
  trait: number;
  mutated: boolean;
}
export interface SelectionConfig {
  initialCount: number;
  habitat: number;
  mutationRate: number;
  mutationSize: number;
  uniform: boolean;
  initialTrait: number;
  selection: boolean;
  cap: number;
  seed: number;
}
export interface GenerationEvent {
  generation: number;
  parents: Organism[];
  survivors: Organism[];
  proposals: Organism[];
  children: Organism[];
}
export interface SelectionState extends SelectionConfig {
  generation: number;
  nextId: number;
  organisms: Organism[];
  events: GenerationEvent[];
  phase: number;
  playing: boolean;
  elapsed: number;
}
export const selectionDefaults: SelectionConfig = {
  initialCount: 100,
  habitat: 0.1,
  mutationRate: 0.05,
  mutationSize: 0.1,
  uniform: false,
  initialTrait: 0.5,
  selection: true,
  cap: 200,
  seed: 17,
};
export function survival(trait: number, habitat: number): number {
  return 0.2 + 0.6 * (1 - Math.abs(trait - habitat));
}
export function initializeSelection(c: SelectionConfig): SelectionState {
  const organisms = Array.from({ length: c.initialCount }, (_, id) => ({
    id,
    parent: -1,
    generation: 0,
    trait: c.uniform ? c.initialTrait : random(c.seed, 0, id, 1),
    mutated: false,
  }));
  return {
    ...c,
    generation: 0,
    nextId: c.initialCount,
    organisms,
    events: [],
    phase: 0,
    playing: false,
    elapsed: 0,
  };
}
export function selectionGeneration(s: SelectionState): SelectionState {
  if (!s.organisms.length || s.generation >= 100)
    return { ...s, playing: false };
  const generation = s.generation + 1;
  const survivors = s.organisms.filter(
    (o) =>
      random(s.seed, generation, o.id, 2) <
      (s.selection ? survival(o.trait, s.habitat) : 0.5),
  );
  let nextId = s.nextId;
  const proposals = survivors.flatMap((o) =>
    Array.from({ length: 2 }, () => {
      const id = nextId++,
        mutated = random(s.seed, generation, id, 3) < s.mutationRate;
      const trait = mutated
        ? Math.max(
            0,
            Math.min(
              1,
              o.trait +
                (random(s.seed, generation, id, 4) * 2 - 1) * s.mutationSize,
            ),
          )
        : o.trait;
      return { id, parent: o.id, generation, trait, mutated };
    }),
  );
  const children =
    proposals.length > s.cap
      ? sample(proposals, s.cap, s.seed, generation, 5)
      : proposals;
  return {
    ...s,
    generation,
    nextId,
    organisms: children,
    events: [
      ...s.events,
      { generation, parents: s.organisms, survivors, proposals, children },
    ],
    phase: 0,
    playing: false,
    elapsed: 0,
  };
}
export function selectionCaption(s: SelectionState): string {
  if (!s.organisms.length)
    return "No offspring survived into the next generation. This population is extinct.";
  const e = s.events.at(-1);
  if (!e)
    return "Each dot has an inherited shade. Better camouflage raises its chance of surviving to reproduce.";
  if (s.phase === 1)
    return `${e.survivors.length} of ${e.parents.length} parents survived. Their own shades did not change.`;
  if (s.phase === 2)
    return "Offspring inherit a parent's shade. A small random mutation can introduce a different shade.";
  return `Generation ${s.generation}: ${e.children.length} offspring replaced the parents. The population changes; individuals do not choose to adapt.`;
}
