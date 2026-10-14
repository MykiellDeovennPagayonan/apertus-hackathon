import type { Dataset } from "../traits/MeasurementProbe";
import { DatasetDisplay } from "./DatasetDisplay";
export function ResultsTableView({ dataset }: { dataset: Dataset }) {
  return (
    <DatasetDisplay value={dataset} kind="DataTable" label="Observations" />
  );
}
