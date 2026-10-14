import type { ReactNode } from "react";
import { formatDataNumber } from "../../../registry/contracts/dataPresentation";
export function MetricsView({
  values,
  className,
}: {
  values: {
    label: string;
    value: ReactNode;
    unit?: string;
    precision?: number;
  }[];
  className?: string;
}) {
  return (
    <div className={`measurement-family ${className ?? ""}`}>
      {values.map((item) => (
        <div className="recipe-measurement" key={item.label}>
          <output>
            <strong>
              {item.value == null || item.value === ""
                ? "Unavailable"
                : typeof item.value === "number"
                  ? Number.isFinite(item.value)
                    ? formatDataNumber(item.value, item.precision ?? 3)
                    : "Unavailable"
                  : typeof item.value === "boolean"
                    ? item.value
                      ? "Enabled"
                      : "Disabled"
                    : item.value}
            </strong>
            {item.unit && <small>{item.unit}</small>}
          </output>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
