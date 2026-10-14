export const physicalDefaults = {
  pendulum: { length: 5, gravity: 9.81, amplitude: 30, playing: true },
  track: { height: 0.5, resistance: 0.05, gravity: 9.81, playing: false },
  circuit: { voltage: 6, resistance: 12, bulbs: 1, topology: "series" },
} as const;
// Educational comparison inputs, not complete experiments or prompt responses.
export const physicalComparisons = {
  pendulum: [{ length: 1 }, { length: 2 }],
  track: [{ resistance: 0.05 }, { resistance: 0.1 }],
} as const;
