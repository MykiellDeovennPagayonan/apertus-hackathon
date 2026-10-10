import {
  type FoodSpeciesId,
  foodWebLinks,
  foodWebSpecies,
  nutrientReturnLinks,
  speciesById,
} from "./foodWebSpecies";
export interface FoodWebState {
  pressure: number;
  [species: string]: number;
}
// Diet shares are structural data, so normalize once rather than rebuilding
// every consumer's food list on each intervention and response pass.
const dietTotals: Partial<Record<FoodSpeciesId, number>> = {};
for (const edge of foodWebLinks)
  dietTotals[edge.consumer] = (dietTotals[edge.consumer] ?? 0) + edge.weight;
/** Two bounded response passes over the authored feeding graph. This is a
 * qualitative intervention model, not a forecast or an equal-count population.
 * Explicit interventions remain fixed; dietary alternatives dilute responses.
 */
export function foodWebMeasure(state: FoodWebState) {
  const selection = state.selection ?? 0;
  const selected = foodWebSpecies[selection];
  const settings = Object.fromEntries(
    foodWebSpecies.map((s) => [s.id, state[s.id] ?? 100]),
  );
  const interventions = foodWebSpecies
    .filter((s) => (state[s.id] ?? 100) !== 100)
    .map((s) => s.id);
  const initial = Object.fromEntries(
    foodWebSpecies.map((s) => [s.id, (state[s.id] ?? 100) - 100]),
  );
  const propagate = (changes: Record<string, number>) => {
    const result = Object.fromEntries(foodWebSpecies.map((s) => [s.id, 0]));
    for (const edge of foodWebLinks) {
      const diet = dietTotals[edge.consumer] ?? 1;
      // Resource scarcity affects consumers in proportion to their alternative foods.
      result[edge.consumer] += (changes[edge.food] * 0.55 * edge.weight) / diet;
      // Predation/browsing acts on each resource, with a bounded teaching coefficient.
      result[edge.food] -= changes[edge.consumer] * 0.65 * edge.weight;
    }
    for (const edge of nutrientReturnLinks)
      result[edge.consumer] += changes[edge.food] * edge.weight;
    return result;
  };
  const direct = propagate(initial),
    indirect = propagate(direct);
  const values = Object.fromEntries(
    foodWebSpecies.map((s) => [
      s.id,
      Math.round(
        Math.max(
          0,
          Math.min(
            200,
            interventions.includes(s.id)
              ? state[s.id]
              : 100 + direct[s.id] + 0.6 * indirect[s.id],
          ),
        ),
      ),
    ]),
  );
  const last = interventions.at(-1);
  const affected = foodWebSpecies
    .filter((s) => !interventions.includes(s.id) && values[s.id] !== 100)
    .sort(
      (a, b) => Math.abs(values[b.id] - 100) - Math.abs(values[a.id] - 100),
    );
  return {
    scene: { values, settings, selection, direct, indirect, interventions },
    selectedPopulation: values[selected.id],
    affectedCount: affected.length,
    predator: values.pressure,
    herbivore: values.elk,
    producer: values.grasses,
    generalist: values.grizzly,
    specialist: values.squirrel,
    decomposer: values.fungi,
    directChange: values.elk - 100,
    indirectChange: values.grasses - 100,
    conclusion:
      last === "pressure"
        ? values.pressure < 100
          ? "Fewer wolves eat fewer elk. Elk increase and graze more, leaving fewer grasses and willows for other animals."
          : "More wolves eat more elk. With fewer elk grazing, grasses and willows can recover."
        : last
          ? `${speciesById(last).name} population ${values[last] < 100 ? "falls" : "rises"}. ${
              affected
                .slice(0, 2)
                .map(
                  (s) => `${s.name}: ${values[s.id] < 100 ? "fewer" : "more"}`,
                )
                .join("; ") || "Other populations stay unchanged"
            }. Changes spread through feeding connections.`
          : "Wolves eat elk. Elk eat grasses and willows. Fewer wolves can mean more elk grazing, which leaves less food growing for other animals.",
  };
}
