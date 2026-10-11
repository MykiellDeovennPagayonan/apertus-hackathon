import { requireValue } from "../../../runtime/authoring/requireValue";
import type { ScienceState } from "../../systems/science/contracts";

export function learnerCaption(s: ScienceState): string {
  switch (s.kind) {
    case "cell":
      return [
        "One cell holds a complete set of chromosomes. Follow their colors as the cell divides.",
        "Each chromosome makes a copy. Both copies carry the same genetic information.",
        "The chromosomes condense, and the nucleus opens so they can move.",
        "The copied chromosomes line up in the middle of the cell.",
        "The copies separate. One of each color moves toward each end.",
        "A new nucleus forms around each set as the cell starts to split.",
        s.settings.error
          ? "A separation error leaves one daughter with an extra copy and the other missing it."
          : "The cell splits. Each daughter receives the same set of chromosomes.",
        s.settings.error
          ? "The daughter cells have unequal sets. Look for the missing and extra chromosome."
          : "Two daughter cells now have matching chromosome sets. The cycle can begin again.",
      ][s.time];
    case "immune": {
      const d = requireValue(s.immune);
      if (!d.exposure)
        return "Introduce a fictional pathogen and watch the body’s defenders respond.";
      if (!d.burden)
        return d.challengeMemory
          ? "The matching memory helped clear this challenge sooner."
          : "The pathogen is cleared. Memory cells remain ready for the same pathogen.";
      if (d.antibodies)
        return "Antibodies bind matching pathogens, helping defenders clear them.";
      if (s.time >= 2)
        return d.challengeMemory
          ? "Memory recognizes this pathogen. A targeted response starts sooner."
          : "Cells recognize the pathogen and begin building a targeted response.";
      return "The first defenders contain the infection while other cells learn to recognize it.";
    }
    case "genome":
      return [
        s.time
          ? "Each offspring inherits a variant from each parent. Siblings can receive different combinations."
          : "These parents can pass on different versions of a gene. Create an offspring to see a combination.",
        "Inside a cell, genes help make molecules that contribute to an organism’s traits.",
        "Chromosomes carry genes. An offspring inherits one member of each pair from each parent.",
        "Different versions of a gene are called alleles. Their combination can affect a trait.",
        "DNA stores genetic information in a sequence of bases. This short sequence is illustrative.",
      ][s.settings.zoom];
    case "pollination": {
      const d = requireValue(s.pollen);
      if (d.fruits.some(Boolean))
        return "Fruit develops after compatible pollen reaches a flower and fertilization occurs.";
      if (d.transfers.some((v) => v > 0))
        return "Pollen has reached a compatible flower. Fruit needs time and resources to develop.";
      return "A bee picks up pollen, then carries it to another flower of the same species.";
    }
    case "invasive": {
      const d = requireValue(s.invasive);
      if (d.origin < 0)
        return "Choose a patch in the habitat, then introduce the fictional invasive plant.";
      if (d.treated.some((v) => v > 0))
        return "Removing the plant can leave seeds behind. Advance a season to see whether it returns.";
      return "Seeds travel to nearby patches. Select a spreading plant to remove it before it reaches more habitat.";
    }
    case "earth":
      return "Select a layer in the cutaway to discover what it is made of and how it behaves.";
    case "plates":
      return [
        "The oceanic plate sinks beneath the continent. This can form a trench and a volcanic arc.",
        "One oceanic plate sinks beneath another, forming a trench and a volcanic island arc.",
        "Two continents collide. Their crust thickens and rises into mountains.",
        "The plates move apart. Magma rises into the gap and forms new crust.",
        "The plates slide past each other. Landmarks shift sideways along the boundary.",
      ][s.settings.boundary];
    case "volcano": {
      const d = requireValue(s.volcano);
      if (d.activity === 2)
        return "Gas-rich magma erupts, sending ash upward and leaving new deposits around the volcano.";
      if (d.activity === 1)
        return "Magma rises through the vent. At the surface it becomes lava and flows down the slope.";
      return d.lava || d.ash
        ? "Surface activity quiets while magma gathers below. Earlier deposits remain on the landscape."
        : "Magma gathers beneath the volcano. Follow its path toward the surface.";
    }
    case "water":
      return [
        "Water gathers in the atmosphere. Clouds contain tiny droplets or ice crystals.",
        "Rain reaches the ground. Some water flows across the surface toward streams.",
        "Water soaks into the soil. Plants can take it up through their roots.",
        "Some water moves deeper into tiny spaces in rock and soil, becoming groundwater.",
        "Groundwater can feed a river. Water keeps moving through the landscape.",
        "Water leaves this watershed downstream. Evaporation returns water to the atmosphere.",
      ][requireValue(s.water).tracer];
  }
}
