import type { ReactNode } from "react";
/** Arrangement only; each panel is bound to independent authoritative results. */
export function ComparisonView({
  panels,
}: {
  panels: { id: string; label: string; content: ReactNode }[];
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
      {panels.map((panel) => (
        <section key={panel.id} style={{ flex: "1 1 200px" }}>
          <h3>{panel.label}</h3>
          {panel.content}
        </section>
      ))}
    </div>
  );
}
