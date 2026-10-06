import type { ReactNode } from "react";
import { useContext, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import { SceneFeedbackContext } from "../views/SVGWorldView";
export function MathObjectControl({
  label,
  onCommand,
  children,
  disabled = false,
  passive = false,
}: {
  label: string;
  onCommand: () => ActionResult;
  children: ReactNode;
  disabled?: boolean;
  passive?: boolean;
}) {
  const [error, setError] = useState("");
  const report = useContext(SceneFeedbackContext);
  const activate = () => {
    if (disabled) return;
    const result = onCommand();
    const message = result.accepted ? "" : result.error;
    setError(message);
    report?.(message);
  };
  if (passive)
    return (
      <g>
        <title>{label}</title>
        {children}
      </g>
    );
  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG interactions require a focusable SVG group; native HTML buttons are invalid SVG children.
    <g
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      className="math-object-control"
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
    >
      <title>{error || label}</title>
      {children}
      {error && !report && (
        <foreignObject x="0" y="0" width="100%" height="70">
          <p className="simulation-feedback" role="alert">
            {error}
          </p>
        </foreignObject>
      )}
    </g>
  );
}
