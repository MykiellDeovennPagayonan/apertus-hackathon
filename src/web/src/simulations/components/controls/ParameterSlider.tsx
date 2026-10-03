import { useState } from "react";
import type { ActionResult } from "../../runtime/commands";
export function ParameterSlider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  className,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  className?: string;
  onChange: (value: number) => ActionResult;
}) {
  const [error, setError] = useState<string>();
  return (
    <label className={className}>
      {label}
      {display && <span>{display}</span>}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const result = onChange(Number(e.target.value));
          setError(result.accepted ? undefined : result.error);
        }}
      />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
