import { useId, useState } from "react";
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  onChange: (value: number) => ActionResult;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const id = useId();
  const commit = (text: string) => {
    const n = Number(text);
    if (
      !text.trim() ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    ) {
      setError(
        `Choose ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`,
      );
      return false;
    }
    if (n === value) {
      setError("");
      return true;
    }
    const result = onChange(n);
    setError(result.accepted ? "" : result.error);
    return result.accepted;
  };
  return (
    <label className="experiment-number catalog-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft ?? value}
        aria-invalid={!!error}
        aria-describedby={error ? id : undefined}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
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
          }
        }}
      />
      {error && (
        <span id={id} role="alert" className="experiment-error">
          {error}
        </span>
      )}
    </label>
  );
}
