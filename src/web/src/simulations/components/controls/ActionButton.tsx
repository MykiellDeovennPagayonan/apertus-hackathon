import { type ReactNode, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
export function ActionButton({
  children,
  onCommand,
  className,
  disabled = false,
  label,
}: {
  children: ReactNode;
  onCommand: () => ActionResult;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  const [error, setError] = useState<string>();
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        className={className}
        onClick={() => {
          const result = onCommand();
          setError(result.accepted ? undefined : result.error);
        }}
      >
        {children}
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
