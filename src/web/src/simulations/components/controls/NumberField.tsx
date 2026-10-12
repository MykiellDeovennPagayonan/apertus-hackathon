import { type CSSProperties, useEffect, useId, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import { RangeInput } from "./RangeInput";

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
  rangeLabels,
  inputLabel = label,
  rangeLabel = `Adjust ${label.toLowerCase()}`,
  commitOnBlur = false,
  compact = false,
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
  rangeLabels?: [string, string];
  inputLabel?: string;
  rangeLabel?: string;
  commitOnBlur?: boolean;
  compact?: boolean;
  onChange: (value: number) => ActionResult;
}) {
  const [draft, setDraft] = useState<{
    text: string;
    accepted?: number;
  } | null>(null);
  const [error, setError] = useState("");
  const id = useId();
  useEffect(() => {
    // Accepted text follows other controls and resets. Unfinished/rejected edits
    // stay local; explicit-submit forms own their separate draft/reset policy.
    setDraft((current) =>
      current?.accepted !== undefined && current.accepted !== value
        ? null
        : current,
    );
  }, [value]);
  const commit = (text: string): ActionResult => {
    const n = Number(text);
    if (
      !/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(text.trim()) ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    ) {
      const message = `Choose ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`;
      setError(message);
      onValidityChange?.(false);
      return { accepted: false, error: message };
    }
    if (n === value) {
      setError("");
      onValidityChange?.(true);
      return { accepted: true };
    }
    const result = onChange(n);
    setError(result.accepted ? "" : result.error);
    onValidityChange?.(result.accepted);
    return result;
  };
  return (
    <div
      className={`experiment-number catalog-field number-field--${presentation}${compact && presentation === "slider" ? " number-field--compact" : ""}`}
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
            value={
              draft?.text ??
              (integer || presentation !== "slider"
                ? value
                : Number(value.toPrecision(4)))
            }
            title={String(value)}
            aria-invalid={!!error}
            aria-describedby={error ? id : undefined}
            onChange={(e) => {
              const text = e.target.value;
              setDraft({ text });
              onValidityChange?.(false);
              const n = Number(text);
              if (
                !commitOnBlur &&
                text !== "" &&
                n >= min &&
                n <= max &&
                (!integer || Number.isInteger(n))
              ) {
                if (commit(text).accepted) setDraft({ text, accepted: n });
              }
            }}
            onBlur={(e) => {
              // A rounded display must never overwrite an untouched model value.
              if (draft && commit(e.target.value).accepted) setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (commitOnBlur) e.preventDefault();
                e.currentTarget.blur();
              }
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
          <RangeInput
            className="number-field-range"
            id={`${id}-range`}
            disabled={disabled}
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
            onChange={(next) => commit(String(next))}
            onResult={(result) => {
              if (result.accepted) setDraft(null);
            }}
          />
        </div>
      )}
      {limits && presentation === "slider" && (
        <div className="catalog-slider-limits" aria-hidden="true">
          <span>{rangeLabels?.[0] ?? min}</span>
          <span>{rangeLabels?.[1] ?? sliderMax}</span>
        </div>
      )}
      {error && (
        <span id={id} role="alert" className="experiment-error">
          {compact
            ? `Use ${integer ? "whole " : ""}${min}–${max}. Current value: ${value}. Esc restores.`
            : `${error} Current value: ${value}. Press Escape to restore it.`}
        </span>
      )}
    </div>
  );
}
