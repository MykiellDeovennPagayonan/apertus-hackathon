/** Shared immutable definitions, never live instance state. Only these reactions are supported. */
export const reactions = Object.freeze({
  water: Object.freeze({
    name: "Making water",
    species: Object.freeze([
      Object.freeze({
        formula: "H₂",
        side: "left",
        atoms: Object.freeze({ H: 2, O: 0 }),
      }),
      Object.freeze({
        formula: "O₂",
        side: "left",
        atoms: Object.freeze({ H: 0, O: 2 }),
      }),
      Object.freeze({
        formula: "H₂O",
        side: "right",
        atoms: Object.freeze({ H: 2, O: 1 }),
      }),
    ]),
  }),
  carbonDioxide: Object.freeze({
    name: "Making carbon dioxide",
    species: Object.freeze([
      Object.freeze({
        formula: "C",
        side: "left",
        atoms: Object.freeze({ C: 1, O: 0 }),
      }),
      Object.freeze({
        formula: "O₂",
        side: "left",
        atoms: Object.freeze({ C: 0, O: 2 }),
      }),
      Object.freeze({
        formula: "CO₂",
        side: "right",
        atoms: Object.freeze({ C: 1, O: 2 }),
      }),
    ]),
  }),
});
export type ReactionId = keyof typeof reactions;
export const chemistryDefaults = Object.freeze({
  dilution: Object.freeze({ saltMass: 10, volume: 1 }),
  conservation: Object.freeze({
    reactionId: "water",
    coefficients: Object.freeze([1, 1, 1]),
  }),
  rate: Object.freeze({
    initialConcentration: 1,
    temperature: 300,
    referenceRate: 0.1,
    activationEnergy: 40000,
    duration: 30,
  }),
});
