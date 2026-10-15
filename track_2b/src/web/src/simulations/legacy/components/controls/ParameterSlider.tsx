import { useId, useState } from "react";
import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import { NumberField } from "../../../registry/controls/NumberField";
import { RangeInput } from "../../../registry/controls/RangeInput";
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
  const id = useId();
  return (
    <div className={`catalog-slider ${className ?? ""}`}>
      <div className="catalog-slider-heading">
        <label htmlFor={id}>{label}</label>
        <span className="catalog-current-value">{display ?? value}</span>
      </div>
      <div className="catalog-slider-inputs">
        <RangeInput
          id={id}
          aria-label={label}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          onResult={(result) => {
            setError(result.accepted ? undefined : result.error);
          }}
        />
        <NumberField
          label={`Exact ${label.toLowerCase()}`}
          value={value}
          min={min}
          max={max}
          step={step}
          integer={Number.isInteger(step)}
          onChange={onChange}
        />
      </div>
      {error && (
        <span
          id={`${id}-error`}
          className="catalog-feedback catalog-feedback--error"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
