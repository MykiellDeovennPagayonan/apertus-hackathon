"use client";
import { useContext, useId, useState } from "react";
import type { DocumentRuntime } from "../../runtime/authoring/runtime";
import type { ComponentInstance } from "../../runtime/authoring/types";
import type { foodWebMeasure } from "../systems/ecology/foodWeb";
import { foodWebSpecies } from "../systems/ecology/foodWebSpecies";
import { SnapshotContext } from "../views/recipe/contexts";
import { NumberField } from "./NumberField";
export function FoodWebPopulationControl({
  node,
  runtime,
}: {
  node: ComponentInstance;
  runtime: DocumentRuntime;
}) {
  const snapshot = useContext(SnapshotContext),
    id = useId();
  const [error, setError] = useState("");
  const binding = runtime.document.connections.find(
    (c) => c.kind === "value" && c.to.node === node.id && c.to.port === "value",
  );
  const scene = (
    binding
      ? snapshot.outputs[binding.from.node]?.[binding.from.port]
      : undefined
  ) as ReturnType<typeof foodWebMeasure>["scene"] | undefined;
  const run = (port: string, args: Record<string, unknown>) => {
    const connections = runtime.document.connections.filter(
      (c) =>
        c.kind === "command" && c.from.node === node.id && c.from.port === port,
    );
    const result = connections.length
      ? runtime.dispatch(
          connections.map((c) => ({
            node: c.to.node,
            command: c.to.port,
            arguments: args,
          })),
        )
      : {
          accepted: false as const,
          error: "Connect this control to the food-web model.",
        };
    setError(result.accepted ? "" : result.error);
    return result;
  };
  if (!scene)
    return <p>Connect a food-web snapshot to explore its organisms.</p>;
  const species = foodWebSpecies[scene.selection];
  const change = (value: number) =>
    run("CHANGE", { value: { species: species.id, value } });
  return (
    <div className="food-population-control">
      <label htmlFor={id}>Explore an organism</label>
      <select
        id={id}
        value={scene.selection}
        onChange={(e) => run("SELECT", { value: Number(e.target.value) })}
      >
        {foodWebSpecies.map((s, i) => (
          <option key={s.id} value={i}>
            {s.name} · {s.role}
          </option>
        ))}
      </select>
      <div className="catalog-form">
        <NumberField
          key={species.id}
          label={`${species.name} population`}
          inputLabel="Exact selected population"
          rangeLabel="Adjust selected population"
          value={scene.settings[species.id]}
          min={0}
          max={150}
          step={1}
          integer
          presentation="slider"
          compact
          limits={false}
          onChange={change}
        />
        <p className="catalog-help">
          100 = usual population. 0 = none. 150 = 50% more.
        </p>
      </div>
      <div className="food-control-actions">
        <button type="button" onClick={() => change(0)}>
          Remove organism
        </button>
        <button type="button" onClick={() => change(100)}>
          Restore organism
        </button>
      </div>
      <button
        type="button"
        className="food-reset"
        onClick={() => run("RESET", {})}
      >
        Restore whole web
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
