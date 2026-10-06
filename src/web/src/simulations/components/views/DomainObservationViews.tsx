import { useBridgeStore } from "../../runtime/bridgeSession";
import { useMathStore } from "../../runtime/mathSession";
import {
  getActiveDefinition,
  getExperimentContext,
} from "../../runtime/session";
import { useTownStore } from "../../runtime/townSession";
import type { DemoType } from "../../runtime/types";
import { DatasetDisplay } from "./DatasetDisplay";
import { EntityInspectorView, presentInspection } from "./EntityInspectorView";

export function DomainObservationViews({ demo }: { demo: DemoType }) {
  // Subscribe to authoritative domain outputs so inspector/table update after edits and ticks.
  useBridgeStore((s) => s.response);
  useTownStore((s) => s.time);
  useMathStore((s) => s.board);
  const definition = getActiveDefinition(),
    context = getExperimentContext();
  if (!definition || !context) return null;
  const rows: Record<string, unknown>[] = [];
  for (const [index, instance] of context.instances.entries()) {
    const object = instance.label || `Object ${index + 1}`;
    for (const [key, value] of Object.entries(instance.outputs)) {
      if (!["number", "string", "boolean"].includes(typeof value)) continue;
      const entry = presentInspection({ [key]: value }).entries[0];
      rows.push({
        object,
        measurement: entry.label,
        value,
        unit:
          entry.unit || (typeof value === "number" ? "Unit not specified" : ""),
      });
    }
  }
  return (
    <div style={{ padding: 16 }}>
      {definition.components.views.includes("ResultsTableView") && (
        <DatasetDisplay
          label="Observations"
          kind="DataTable"
          value={rows}
          presentation={{
            columns: [
              { key: "object", label: "Object", type: "string" },
              { key: "measurement", label: "Measurement", type: "string" },
              { key: "value", label: "Value" },
              { key: "unit", label: "Unit", type: "string" },
            ],
          }}
        />
      )}
      {definition.components.views.includes("EntityInspectorView") &&
        context.instances.map((i) => (
          <EntityInspectorView
            key={i.id}
            demo={demo}
            id={i.id}
            label={i.label}
            parameters={i.parameters}
            outputs={i.outputs}
            assumptions={definition.assumptions}
          />
        ))}
    </div>
  );
}
