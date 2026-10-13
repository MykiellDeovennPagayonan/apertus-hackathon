import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import { DatasetDisplay } from "../../views/DatasetDisplay";
import {
  comparisonData,
  outputDataPresentation,
} from "../../../../registry/contracts/dataPresentation";
export const naturalPalette = ["#2d6a4f", "#a44a3f", "#4f46a5", "#b7791f"];
export function DiffusionHeatmap({ instance }: { instance: ModelInstance }) {
  return (
    <DatasetDisplay
      value={instance.outputs.field}
      kind="Heatmap"
      label="Dye concentration"
      presentation={outputDataPresentation(instance.provider, "field")}
    />
  );
}
export function PopulationGraph({ instance }: { instance: ModelInstance }) {
  const metadata = outputDataPresentation(instance.provider, "points");
  return (
    <DatasetDisplay
      kind="Chart"
      label="Rabbit and fox populations"
      value={comparisonData(
        instance.outputs.points,
        instance.outputs.comparisonPoints,
        ["rabbits", "foxes"],
      )}
      presentation={{
        ...metadata,
        columns: [
          { key: "x", label: "Model time", unit: "days", type: "number" },
          {
            key: "rabbits",
            label: "Rabbits",
            unit: "population",
            type: "number",
          },
          { key: "foxes", label: "Foxes", unit: "population", type: "number" },
          {
            key: "comparison_rabbits",
            label: "Previous rabbits",
            unit: "population",
            type: "number",
          },
          {
            key: "comparison_foxes",
            label: "Previous foxes",
            unit: "population",
            type: "number",
          },
        ],
      }}
    />
  );
}
export function PlantGrowthGraph({ instance }: { instance: ModelInstance }) {
  const metadata = outputDataPresentation(instance.provider, "points");
  return (
    <DatasetDisplay
      kind="Chart"
      label="Plant growth: current and previous light"
      value={comparisonData(
        instance.outputs.points,
        instance.outputs.comparisonPoints,
      )}
      presentation={{
        ...metadata,
        columns: [
          { key: "x", label: "Time", unit: "days", type: "number" },
          {
            key: "y",
            label: "Current light",
            unit: metadata.yUnit,
            type: "number",
          },
          {
            key: "comparison_y",
            label: "Previous light",
            unit: metadata.yUnit,
            type: "number",
          },
        ],
      }}
    />
  );
}
