import { type CSSProperties, useId, useState } from "react";
import type { ActionResult } from "../../runtime/commands";

/** Keep incomplete typing local; only validated values reach the model. */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  integer = step === 1,
  presentation = "field",
  onValidityChange,
  sliderMax = max,
  showNumber = true,
  disabled = false,
  unit,
  limits = false,
  inputLabel = label,
  rangeLabel = `Adjust ${label.toLowerCase()}`,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number | "any";
  integer?: boolean;
  presentation?: "field" | "quantity" | "slider";
  onValidityChange?: (valid: boolean) => void;
  sliderMax?: number;
  showNumber?: boolean;
  disabled?: boolean;
  unit?: string;
  limits?: boolean;
  inputLabel?: string;
  rangeLabel?: string;
  onChange: (value: number) => ActionResult;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const id = useId();
  const commit = (text: string) => {
    const n = Number(text);
    if (
      !/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(text.trim()) ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    ) {
      setError(
        `Choose ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`,
      );
      onValidityChange?.(false);
      return false;
    }
    if (n === value) {
      setError("");
      onValidityChange?.(true);
      return true;
    }
    const result = onChange(n);
    setError(result.accepted ? "" : result.error);
    onValidityChange?.(result.accepted);
    return result.accepted;
  };
  return (
    <div
      className={`experiment-number catalog-field number-field--${presentation}`}
    >
      <div className="number-field-heading">
        <label htmlFor={showNumber ? `${id}-value` : `${id}-range`}>
          {label}
        </label>
        {showNumber && (
          <input
            id={`${id}-value`}
            aria-label={inputLabel}
            type="text"
            inputMode={integer ? "numeric" : "decimal"}
            disabled={disabled}
            value={draft ?? value}
            aria-invalid={!!error}
            aria-describedby={error ? id : undefined}
            onChange={(e) => {
              const text = e.target.value;
              setDraft(text);
              onValidityChange?.(false);
              const n = Number(text);
              if (
                text !== "" &&
                n >= min &&
                n <= max &&
                (!integer || Number.isInteger(n))
              )
                commit(text);
            }}
            onBlur={(e) => {
              if (commit(e.target.value)) setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraft(null);
                setError("");
                onValidityChange?.(true);
              }
            }}
          />
        )}
        {unit && <span>{unit === "degrees" ? "°" : unit}</span>}
      </div>
      {presentation === "slider" && (
        <div className="catalog-slider-inputs">
          <input
            className="number-field-range"
            id={`${id}-range`}
            disabled={disabled}
            type="range"
            aria-label={rangeLabel}
            min={min}
            max={sliderMax}
            step={step}
            style={
              {
                "--slider-fill": `${(100 * (value - min)) / (sliderMax - min)}%`,
              } as CSSProperties
            }
            value={value}
            onChange={(event) => {
              if (commit(event.target.value)) setDraft(null);
            }}
          />
        </div>
      )}
      {limits && presentation === "slider" && (
        <div className="catalog-slider-limits" aria-hidden="true">
          <span>{min}</span>
          <span>{sliderMax}</span>
        </div>
      )}
      {error && (
        <span id={id} role="alert" className="experiment-error">
          {error}
          {` Current value: ${value}. Press Escape to restore it.`}
        </span>
      )}
    </div>
  );
}
