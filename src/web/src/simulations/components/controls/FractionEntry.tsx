import { useId, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import type { FractionValue } from "../traits/MathBoards";

/** One exact fraction is one decision; unfinished typing never changes the line. */
export function FractionEntry({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FractionValue;
  onChange: (value: FractionValue) => ActionResult;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const accepted = `${value.n}/${value.d}`;
  const commit = () => {
    if (draft === null) return;
    const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(draft);
    if (
      !match ||
      ![1, 2, 3, 4, 6, 12].includes(Number(match[2])) ||
      Number(match[1]) > 3 * Number(match[2])
    ) {
      setError(
        `Use a fraction from 0 to 3, with 1, 2, 3, 4, 6 or 12 equal parts. Current fraction: ${accepted}.`,
      );
      return;
    }
    const result = onChange({ n: Number(match[1]), d: Number(match[2]) });
    setError(result.accepted ? "" : result.error);
    if (result.accepted) setDraft(null);
  };
  return (
    <div className="fraction-entry catalog-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="text"
        aria-label={label}
        value={draft ?? accepted}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(null);
            setError("");
          }
        }}
      />
      {error && (
        <span id={`${id}-error`} className="experiment-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
