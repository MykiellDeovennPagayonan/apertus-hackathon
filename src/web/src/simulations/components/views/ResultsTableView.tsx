import { type Dataset, validateDataset } from "../traits/MeasurementProbe";
export function ResultsTableView({ dataset }: { dataset: Dataset }) {
  validateDataset(dataset);
  return (
    <div
      className="experiment-table"
      style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}
    >
      <table>
        <caption>{dataset.assumption}</caption>
        <thead>
          <tr>
            {dataset.columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
                {c.unit ? ` (${c.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataset.rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {dataset.columns.map((c) => (
                <td key={c.key}>
                  {typeof row[c.key] === "number"
                    ? Number(row[c.key]).toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })
                    : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
