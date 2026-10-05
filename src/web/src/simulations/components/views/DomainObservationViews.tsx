import { useBridgeStore } from "../../runtime/bridgeSession";
import { useMathStore } from "../../runtime/mathSession";
import {
  getActiveDefinition,
  getExperimentContext,
} from "../../runtime/session";
import { useTownStore } from "../../runtime/townSession";
import type { DemoType } from "../../runtime/types";
import type { Dataset } from "../traits/MeasurementProbe";
import { EntityInspectorView } from "./EntityInspectorView";
import { ResultsTableView } from "./ResultsTableView";
export function DomainObservationViews({ demo }: { demo: DemoType }) {
  // Subscribe to authoritative domain outputs so inspector/table update after edits and ticks.
  useBridgeStore((s) => s.response);
  useTownStore((s) => s.time);
  useMathStore((s) => s.board);
  const definition = getActiveDefinition(),
    context = getExperimentContext();
  if (!definition || !context) return null;
  const rows: Dataset["rows"] = [];
  for (const instance of context.instances)
    for (const [key, value] of Object.entries(instance.outputs)) {
      if (typeof value === "number")
        rows.push({ instance: instance.id, measurement: key, value });
      if (Array.isArray(value))
        value.forEach((v, i) => {
          if (typeof v === "number")
            rows.push({
              instance: instance.id,
              measurement: `${key}[${i}]`,
              value: v,
            });
        });
      if (typeof value === "string")
        rows.push({ instance: instance.id, measurement: key, value });
    }
  const dataset: Dataset = {
    columns: [
      { key: "instance", label: "Instance", unit: "", type: "string" },
      {
        key: "measurement",
        label: "Measurement",
        unit: "see assumptions",
        type: "string",
      },
      { key: "value", label: "Value", unit: "", type: "string" },
    ],
    rows: rows.map((row) => ({ ...row, value: String(row.value) })),
    assumption: definition.assumptions.join(" "),
  };
  return (
    <div style={{ padding: 16 }}>
      {definition.components.views.includes("ResultsTableView") && (
        <ResultsTableView dataset={dataset} />
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
