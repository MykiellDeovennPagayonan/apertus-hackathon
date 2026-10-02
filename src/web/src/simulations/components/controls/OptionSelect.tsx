import { useState } from "react";
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
  return (
    <label>
      {label}
      <select
        aria-label={label}
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
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
