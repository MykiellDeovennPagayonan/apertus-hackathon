export interface NutrientState {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}
export function nutrientsMeasure(state: NutrientState) {
  const resources = [
    { name: "Nitrogen", value: state.nitrogen },
    { name: "Phosphorus", value: state.phosphorus },
    { name: "Potassium", value: state.potassium },
  ];
  const biomass = Math.min(100, ...resources.map((r) => r.value));
  const limited = resources.filter((r) => r.value === biomass && biomass < 100);
  const limiter = limited.length
    ? limited.map((r) => r.name).join(" + ")
    : "Growth ceiling";
  const health =
    biomass >= 100
      ? "Healthy · balanced supply"
      : limited.length > 1
        ? "Co-limited · multiple shortages"
        : `Deficient in ${limiter.toLowerCase()}`;
  const height = Math.round(12 + 48 * Math.sqrt(biomass / 100));
  return {
    scene: {
      resources,
      biomass,
      height,
      limiter,
      health,
      referenceBiomass: 100,
      referenceHeight: 60,
    },
    limiter,
    biomass,
    height,
    health,
    conclusion:
      biomass >= 100
        ? "All three nutrients are sufficient. Extra supply cannot lift the fixed growth ceiling in this model."
        : limited.length > 1
          ? `${limiter} jointly limit growth. Raising only one leaves the other shortage in place; biomass stays the same.`
          : `${limiter} limits growth. Raise this lowest supply to increase biomass; adding an already sufficient nutrient leaves the shortage in place.`,
  };
}
