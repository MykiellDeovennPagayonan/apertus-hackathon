"use client";

import { scienceObservation, scienceSpec } from "../../../../domains/science";
import type { ScienceState } from "../../systems/science/contracts";
import { ScienceScene } from "../../visuals/science/ScienceScene";

/** Compare accepted snapshots; unequal runs are never presented as matched evidence. */
export function ScienceComparison({ state: s }: { state: ScienceState }) {
  const baseline = s.baseline;
  if (!baseline?.snapshot)
    return (
      <p>
        Run the investigation, then keep a baseline to compare a changed
        condition.
      </p>
    );
  const changed = scienceSpec(s.kind).settings.filter(
    (f) => baseline.settings[f.key] !== s.settings[f.key],
  );
  const matched = baseline.time === s.time && baseline.seed === s.seed;
  const instance = (state: ScienceState) => ({
    id: "comparison",
    label: "Comparison",
    provider: `science-${state.kind}`,
    parameters: {},
    state: state as unknown as Record<string, unknown>,
    outputs: {},
  });
  return (
    <section className="science-comparison" aria-label="Baseline comparison">
      <p role="status">
        {matched
          ? `Same seed and ${s.time} ${scienceSpec(s.kind).unit}(s).`
          : `Unmatched runs: baseline ${baseline.time}, current ${s.time}; ${baseline.seed === s.seed ? "same" : "different"} seed.`}
        {changed.length === 1
          ? ` Changed condition: ${changed[0].label}.`
          : changed.length
            ? ` ${changed.length} conditions changed; this does not isolate a single cause.`
            : " No conditions changed."}
        {baseline.snapshot.immune?.challengeMemory !== s.immune?.challengeMemory
          ? " Antigen-specific memory also differs between these runs."
          : ""}
      </p>
      <div className="science-comparison-scenes">
        {[baseline.snapshot, s].map((state, i) => (
          <div key={i === 0 ? "baseline" : "current"}>
            <h3>{i === 0 ? "Retained baseline" : "Changed run"}</h3>
            <ScienceScene
              instance={instance(state)}
              question={i === 0 ? "Retained baseline" : "Changed run"}
            />
            <ul>
              {scienceObservation(state).metrics.map((metric) => (
                <li key={metric}>{metric}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <dl className="science-changed-conditions">
        {changed.map((f) => (
          <div key={f.key}>
            <dt>{f.label}</dt>
            <dd>
              {f.options?.[baseline.settings[f.key]] ??
                baseline.settings[f.key]}{" "}
              → {f.options?.[s.settings[f.key]] ?? s.settings[f.key]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
