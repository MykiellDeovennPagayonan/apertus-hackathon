import { useState } from "react";
import type { ActionResult } from "../../runtime/commands";
export function IntegerStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => ActionResult;
}) {
  const [error, setError] = useState("");
  const commit = (n: number) => {
    const result =
      Number.isInteger(n) && n >= min && n <= max
        ? onChange(n)
        : {
            accepted: false as const,
            error: `Choose a whole number from ${min} to ${max}.`,
          };
    setError(result.accepted ? "" : result.error);
    return result.accepted;
  };
  return (
    <div className="math-input">
      <label>
        <span>{label}</span>
        <span className="math-stepper">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            disabled={value <= min}
            onClick={() => commit(value - 1)}
          >
            −
          </button>
          <input
            key={value}
            type="number"
            min={min}
            max={max}
            step={1}
            defaultValue={value}
            aria-label={label}
            onBlur={(e) => {
              const ok =
                e.currentTarget.value !== "" &&
                commit(Number(e.currentTarget.value));
              if (!ok) e.currentTarget.value = String(value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <button
            type="button"
            aria-label={`Increase ${label}`}
            disabled={value >= max}
            onClick={() => commit(value + 1)}
          >
            +
          </button>
        </span>
      </label>
      {error && (
        <span className="math-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
