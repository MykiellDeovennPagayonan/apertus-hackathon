import { useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import { ActionButton } from "./ActionButton";
export function ToggleControl({
  value,
  onLabel,
  offLabel,
  onChange,
  mode = "button",
  label,
}: {
  value: boolean;
  mode?: "button" | "checkbox";
  label?: string;
  onLabel: string;
  offLabel: string;
  onChange: (value: boolean) => ActionResult;
}) {
  const [error, setError] = useState<string>();
  if (mode === "checkbox")
    return (
      <label className="composition-learner-control">
        {label}
        <input
          type="checkbox"
          aria-label={label}
          checked={value}
          onChange={(e) => {
            const result = onChange(e.target.checked);
            setError(result.accepted ? undefined : result.error);
          }}
        />
        {error && <span role="alert">{error}</span>}
      </label>
    );
  return (
    <ActionButton onCommand={() => onChange(!value)}>
      {value ? onLabel : offLabel}
    </ActionButton>
  );
}
