import type { ReactNode } from "react";
export function GrownUpControls({ children }: { children: ReactNode }) {
  return (
    <details className="math-grownups">
      <summary>For grown-ups</summary>
      <div className="math-grownups-content">
        <p className="math-hint">Choose the activity and numbers here.</p>
        {children}
      </div>
    </details>
  );
}
