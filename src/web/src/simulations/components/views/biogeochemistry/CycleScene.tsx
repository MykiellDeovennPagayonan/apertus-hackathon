"use client";
import { useId } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import {
  activityFor,
  type CycleState,
} from "../../systems/biogeochemistry/contracts";
import { dissolvedOxygen } from "../../systems/biogeochemistry/oxygen";
import { CarbonScene } from "../../visuals/biogeochemistry/CarbonScene";
import { NitrogenScene } from "../../visuals/biogeochemistry/NitrogenScene";
import { OxygenScene } from "../../visuals/biogeochemistry/OxygenScene";
import "./cycles.css";
export function CycleScene({
  instance,
  question,
}: {
  instance: ModelInstance;
  question?: string;
}) {
  const s = instance.state as unknown as CycleState;
  const a = activityFor(s);
  const uid = useId().replaceAll(":", "");
  const Visual =
    s.kind === "oxygen"
      ? OxygenScene
      : s.kind === "nitrogen"
        ? NitrogenScene
        : CarbonScene;
  const labels: Record<string, string[]> = {
    light: ["Daylight", "Darkness"],
    plants: ["Fewer plants", "More plants"],
    temperature: ["Cooler water", "Warmer water"],
    mixing: ["Still water", "Mixed water"],
    partners: ["Without microbial partners", "With microbial partners"],
    fertilizer: ["No fertilizer", a.variants?.[s.variant] ?? "Added nitrogen"],
    rain: ["Untreated reference", a.variants?.[s.variant] ?? "Selected soil"],
    soil: ["Aerated soil", "Waterlogged soil"],
    clearing: ["Intact forest", "Cleared patch"],
  };
  return (
    <section
      className="cycle-scene"
      data-responsive-height="content"
      data-cycle-model={instance.id}
      data-cycle={s.kind}
      data-activity={s.activity}
      aria-label={`${s.kind} cycle teaching scene`}
    >
      <h2 className="cycle-question" tabIndex={-1}>
        {s.activity === (s.kind === "oxygen" ? "day-night" : "route") &&
        question
          ? question
          : a.question}
      </h2>
      <div className={`cycle-plots ${s.baseline ? "cycle-pair" : ""}`}>
        {(s.baseline ? [s.baseline, s] : [s]).map((r, i) => (
          <figure key={s.baseline && i === 0 ? "reference" : "current"}>
            {s.baseline &&
              !["light", "temperature", "mixing"].includes(s.activity) && (
                <figcaption className="cycle-plot-title">
                  {labels[s.activity]?.[i] ??
                    (i ? "Changed condition" : "Reference")}
                </figcaption>
              )}
            <Visual
              state={s}
              run={r}
              changed={!s.baseline || i === 1}
              id={`${uid}-${i}`}
            />
            {s.activity === "temperature" && (
              <p className="cycle-measurement">
                Oxygen in water:{" "}
                <strong>{dissolvedOxygen(r).toFixed(1)} mg/L</strong>
              </p>
            )}
          </figure>
        ))}
      </div>
      {s.baseline && (
        <p className="cycle-context">
          {s.activity === "plants"
            ? "Same starting water, light and duration; plant abundance differs."
            : s.activity === "temperature"
              ? "Same starting oxygen and duration. Biology held inactive to isolate solubility."
              : "Equal starting stores and elapsed time; only the named condition changes."}
        </p>
      )}
      {s.activity === "geology" && (
        <p className="cycle-context">
          A separate schematic timeline. Biological years are preserved when you
          return.
        </p>
      )}
      {s.activity === "ocean" && (
        <div className="cycle-ocean-values">
          <p>
            Surface carbon stored{" "}
            <strong>{s.stores.surface.toFixed(1)} carbon units</strong>
          </p>
          <p>
            Net air-to-ocean transfer{" "}
            <strong>
              {s.fluxes
                .filter((f) => f.process === "Air-sea exchange")
                .reduce(
                  (n, f) => n + f.amount * ("surface" in f.to ? 1 : -1),
                  0,
                )
                .toFixed(2)}{" "}
              carbon units / modeled year
            </strong>
          </p>
        </div>
      )}
    </section>
  );
}
