import { useId, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
export function OptionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => ActionResult;
}) {
  const [error, setError] = useState<string>();
  const id = useId();
  return (
    <label className="catalog-field">
      <span>{label}</span>
      <select
        aria-label={label}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? id : undefined}
        value={value}
        onChange={(e) => {
          const result = onChange(e.target.value);
          setError(result.accepted ? undefined : result.error);
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span
          id={id}
          className="catalog-feedback catalog-feedback--error"
          role="alert"
        >
          {error}
        </span>
      )}
    </label>
  );
}
