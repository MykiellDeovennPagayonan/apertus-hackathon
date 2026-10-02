import type { ReactNode } from "react";
export function MetricsView({
  values,
  className,
}: {
  values: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={className}>
      {values.map((v) => (
        <div key={v.label}>
          <b>{v.value}</b>
          <span>{v.label}</span>
        </div>
      ))}
    </div>
  );
}
