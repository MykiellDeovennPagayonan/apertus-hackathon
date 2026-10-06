import { DatasetDisplay } from "./DatasetDisplay";
import { outputDataPresentation } from "./dataPresentation";
export function HistogramView({
  frequencies,
}: {
  frequencies: { outcome: string; observed: number; expected: number }[];
}) {
  return (
    <DatasetDisplay
      value={frequencies}
      kind="Histogram"
      label="Observed and expected frequencies"
      presentation={outputDataPresentation("models/probability", "frequencies")}
    />
  );
}
