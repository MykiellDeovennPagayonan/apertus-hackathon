import { type ReactNode, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
export function ActionButton({
  children,
  onCommand,
  className,
  disabled = false,
  label,
  intent = "secondary",
}: {
  children: ReactNode;
  onCommand: () => ActionResult;
  className?: string;
  disabled?: boolean;
  label?: string;
  intent?: "primary" | "secondary" | "quiet";
}) {
  const [error, setError] = useState<string>();
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        className={`recipe-action recipe-action--${intent} ${className ?? ""}`}
        onClick={() => {
          try {
            const result = onCommand();
            setError(
              result.accepted ? undefined : (result.error ?? "Action failed"),
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "Action failed");
          }
        }}
      >
        {children}
      </button>
      {error && (
        <span className="catalog-feedback catalog-feedback--error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
