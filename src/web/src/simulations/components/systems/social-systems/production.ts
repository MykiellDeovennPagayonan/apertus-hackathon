export interface ProductionState {
  specialization: number;
  delay: number;
  disruption: number;
}
const SHIFT = 480,
  WORKERS = 8;
const names = [
  "Cut",
  "Shape",
  "Fit",
  "Join",
  "Finish",
  "Check",
  "Pack",
  "Label",
];
/** Event schedule with an unlimited source, serial stages and unbounded inter-stage queues. */
export function productionMeasure(state: ProductionState) {
  const durations = names.map(
    (_, i) =>
      (10 / (1 + (1.2 * state.specialization) / 100)) *
      (i === 3 ? 1 + state.delay / 20 : 1),
  );
  const available = Array<number>(WORKERS).fill(0),
    busy = Array<number>(WORKERS).fill(0),
    completions = Array<number>(WORKERS).fill(0);
  const interruption = (state.disruption / 100) * 240;
  for (let item = 0; item < 120; item++) {
    let previous = 0;
    for (let stage = 0; stage < WORKERS; stage++) {
      let start = Math.max(previous, available[stage]);
      if (
        stage === 3 &&
        interruption > 0 &&
        start < 240 + interruption &&
        start + durations[stage] > 240
      )
        start = 240 + interruption;
      const end = start + durations[stage];
      busy[stage] += Math.max(0, Math.min(end, SHIFT) - Math.min(start, SHIFT));
      if (end <= SHIFT) completions[stage]++;
      available[stage] = end;
      previous = end;
    }
  }
  const assemblyCompleted = completions[7];
  const stages = names.map((name, i) => ({
    name,
    duration: Math.round(durations[i] * 10) / 10,
    queue: i ? completions[i - 1] - completions[i] : 0,
    idle: Math.round((1 - busy[i] / SHIFT) * 100),
    bottleneck: i === 3 && state.delay > 0,
    interrupted: i === 3 && interruption > 0,
  }));
  const craftCompleted = 7 * 6 + Math.floor((SHIFT - interruption) / 80);
  const craft = {
    completed: craftCompleted,
    unfinished: interruption % 80 === 0 ? 0 : 1,
    idle: Math.round((interruption / (SHIFT * WORKERS)) * 100),
    defects: 2,
  };
  const assembly = {
    completed: assemblyCompleted,
    unfinished: completions[0] - assemblyCompleted,
    idle: Math.round(
      (1 - busy.reduce((a, b) => a + b, 0) / (SHIFT * WORKERS)) * 100,
    ),
    defects: Math.round(2 + state.specialization / 40 + state.disruption / 25),
  };
  return {
    scene: { craft, assembly, stages, specialization: state.specialization },
    craftCompleted,
    assemblyCompleted,
    unfinished: `Unfinished: ${craft.unfinished} craft / ${assembly.unfinished} line`,
    idle: `Idle time: ${craft.idle}% craft / ${assembly.idle}% line`,
    defects: `Defects: ${craft.defects}% craft / ${assembly.defects}% line`,
    conclusion:
      assemblyCompleted > craftCompleted
        ? "Specialists repeat shorter tasks and overlap their work, so more items finish in the same shift. Follow the amber item through the eight stages."
        : state.delay > 0 || state.disruption > 0
          ? "Join holds up the line: items queue before it and later workers wait. Independent craft workers keep finishing whole items."
          : "Without specialization, each item still needs all eight stages. Handoffs delay the line’s first completion; craft workers finish independently.",
  };
}
